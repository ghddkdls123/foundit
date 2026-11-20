"""
Refind 공공 습득물 동기화 Lambda

흐름: EventBridge가 몇 시간마다 이 Lambda를 실행
  -> 경찰청_포털기관 습득물정보 API를 지역 코드별로 호출 (최근 N일)
  -> 100건씩 묶어서 백엔드 내부 API(POST /api/internal/public-items/bulk)로 저장
  -> atcId + fdSn 기준으로 백엔드가 중복 없이 갱신(upsert)

[2026-11-20 수정] 지역(region) 보정
  경찰청 원본에는 지역 칸이 없어서, 지금까지는 '조회한 지역 코드'를 region으로 넣었다.
  그런데 철도역 보관 물건(한국철도공사)은 여러 지역 조회에 겹쳐 나와서
  upsert 때마다 region이 덮어써졌다. (예: 수서역 물건이 대구로 표시)
  -> 보관장소(depPlace)에 'OO역'이 있으면 카카오 장소 검색으로 그 역의 시·도를 찾아 region에 넣는다.
  -> 역이 아니거나 검색이 안 되면 기존처럼 조회한 지역을 쓴다.
  -> KAKAO_REST_KEY가 없으면 보정 없이 기존과 똑같이 동작한다.

필요한 환경 변수
  DATA_GO_KR_KEY    공공데이터포털 일반 인증키 (64자, 두 번 붙여넣지 않게 주의)
  API_BASE_URL      예: https://d2561q9uqrldal.cloudfront.net/api
  INTERNAL_API_KEY  Beanstalk의 INTERNAL_API_KEY와 같은 값
  DAYS_BACK         (선택) 기본 3. 예약 실행 때 최근 며칠치를 받을지
  KAKAO_REST_KEY    (선택) 카카오 REST API 키. 있으면 역 보관 물건의 지역을 보정

수동 실행 때 이벤트로 기간을 바꿀 수 있음: {"days_back": 30}
기간 나누기: {"days_back": 30, "end_days_ago": 15} -> 30일 전 ~ 15일 전
"""

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

SERVICE_URL = (
    "https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/"
    "getPtLosfundInfoAccToClAreaPd"
)
DATA_GO_KR_KEY = os.environ["DATA_GO_KR_KEY"].strip()
API_BASE_URL = os.environ["API_BASE_URL"].rstrip("/")
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]
DEFAULT_DAYS_BACK = int(os.environ.get("DAYS_BACK", "3"))
KAKAO_REST_KEY = os.environ.get("KAKAO_REST_KEY", "").strip()
KAKAO_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

PAGE_SIZE = 100   # 공공 API 한 페이지 결과 수
BATCH_SIZE = 100  # 백엔드 bulk API 한 번에 최대 100건
KST = timezone(timedelta(hours=9))

# 습득지역 코드(N_FD_LCT_CD) -> 지역명
# 2026-11-01 실제 데이터의 보관장소 이름으로 확인한 코드표
#   (예: LCM000에 '다이소 전주점' -> 전북, LCW000에 '조치원역' -> 세종)
# 광주는 2주간 0건이라 코드 미확인. LCQ000을 광주 후보로 남겨둠(0건이면 호출 1번뿐).
REGIONS = {
    "LCA000": "서울",
    "LCI000": "경기",
    "LCV000": "인천",
    "LCH000": "강원",
    "LCO000": "충북",
    "LCN000": "충남",
    "LCS000": "대전",
    "LCW000": "세종",
    "LCK000": "경북",
    "LCJ000": "경남",
    "LCR000": "대구",
    "LCT000": "부산",
    "LCU000": "울산",
    "LCM000": "전북",
    "LCG000": "전남",
    "LCQ000": "광주",
    "LCP000": "제주",
    "LCF000": "해외",
}

# 카카오 주소의 시·도 이름 -> 우리 지역명 (긴 이름부터 비교)
SIDO_PREFIX = {
    "충청북": "충북", "충청남": "충남",
    "전라북": "전북", "전라남": "전남",
    "경상북": "경북", "경상남": "경남",
    "서울": "서울", "부산": "부산", "대구": "대구", "인천": "인천",
    "광주": "광주", "대전": "대전", "울산": "울산", "세종": "세종",
    "경기": "경기", "강원": "강원",
    "충북": "충북", "충남": "충남", "전북": "전북", "전남": "전남",
    "경북": "경북", "경남": "경남", "제주": "제주",
}

# 보관장소에서 'OO역' 뽑기 (예: '한국철도공사 수서역' -> '수서역', '김천(구미)역' -> '김천구미역')
STATION_RE = re.compile(r"([가-힣0-9]+역)(?=$|[^가-힣]|유실물|분실물|고객|센터|사무실|역무실|보관)")

# 같은 역은 한 번만 검색 (Lambda가 따뜻한 상태면 다음 실행에도 재사용)
_station_cache = {}


def normalize_sido(name):
    for prefix in sorted(SIDO_PREFIX, key=len, reverse=True):
        if name.startswith(prefix):
            return SIDO_PREFIX[prefix]
    return None


def station_name(storage_place):
    if not storage_place:
        return None
    # '김천(구미)역' -> '김천구미역', '서대구역(한국철도공사)' -> '서대구역 한국철도공사 '
    cleaned = re.sub(r"\(([^()]*)\)역", r"\1역", storage_place)
    cleaned = cleaned.replace("(", " ").replace(")", " ").strip()
    match = STATION_RE.search(cleaned)
    return match.group(1) if match else None


def station_regions(station):
    """카카오 장소 검색으로 같은 이름 역들의 시·도 목록을 찾는다. (순서 유지, 중복 제거)"""
    if station in _station_cache:
        return _station_cache[station]

    regions = []
    try:
        query = urllib.parse.urlencode({"query": station, "size": 15})
        request = urllib.request.Request(
            f"{KAKAO_SEARCH_URL}?{query}",
            headers={"Authorization": f"KakaoAK {KAKAO_REST_KEY}"},
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            docs = json.loads(response.read()).get("documents", [])
        # 기차역·지하철역으로 분류되고 이름이 정확히 그 역인 결과만 믿는다
        base = station[:-1]  # '양원역' -> '양원'
        for doc in docs:
            category = doc.get("category_name", "")
            name = re.sub(r"[()\s]", "", doc.get("place_name", ""))  # '김천(구미)역' -> '김천구미역'
            if not any(word in category for word in ("기차", "철도", "지하철", "전철")):
                continue
            if not name.startswith(base):
                continue
            address = doc.get("address_name") or doc.get("road_address_name") or ""
            region = normalize_sido(address.split(" ")[0]) if address else None
            if region and region not in regions:
                regions.append(region)
        print(f"[kakao] {station}: {regions}")
    except Exception as error:  # 카카오 오류가 나도 동기화는 계속
        print(f"[kakao error] {station}: {error}")

    _station_cache[station] = regions
    return regions


_logged_places = set()


def resolve_region(raw, query_region):
    """역 보관 물건이면 역의 실제 지역, 아니면 조회한 지역."""
    if not KAKAO_REST_KEY:
        return query_region
    place = raw.get("depPlace") or ""
    # 한국철도공사 보관 물건만 보정한다.
    # 지하철역(서울교통공사 등)은 그 지역 경찰서로 신고돼서 조회 지역이 이미 맞고,
    # 전부 검색하면 서울만 수백 번 호출해서 시간이 초과된다.
    if "철도" not in place:
        return query_region
    station = station_name(place)
    if place not in _logged_places and len(_logged_places) < 40:
        _logged_places.add(place)
        print(f"[place] {place!r} -> {station}")
    if not station:
        return query_region
    regions = station_regions(station)
    # 같은 이름 역이 여러 지역에 있을 수 있음 (예: 양원역 = 서울 중랑구, 경북 봉화)
    # 조회한 지역에 그 역이 있으면 조회 지역이 맞는 것. 없을 때만 바꾼다.
    if not regions or query_region in regions:
        return query_region
    return regions[0]


def fetch_page(region_code, start_ymd, end_ymd, page_no):
    """공공 API 한 페이지를 불러와 (item 목록, 전체 건수)를 돌려준다."""
    params = urllib.parse.urlencode({
        "serviceKey": DATA_GO_KR_KEY,
        "pageNo": page_no,
        "numOfRows": PAGE_SIZE,
        "START_YMD": start_ymd,
        "END_YMD": end_ymd,
        "N_FD_LCT_CD": region_code,
    })
    with urllib.request.urlopen(f"{SERVICE_URL}?{params}", timeout=15) as response:
        root = ET.fromstring(response.read())

    # 키 오류 등은 <cmmMsgHeader>로, 정상 응답은 <header><resultCode>00 으로 옴
    auth_error = root.findtext(".//returnAuthMsg") or root.findtext(".//errMsg")
    if auth_error:
        raise RuntimeError(f"공공 API 인증 오류: {auth_error}")
    result_code = root.findtext(".//resultCode")
    if result_code not in (None, "00"):
        raise RuntimeError(f"공공 API 오류 {result_code}: {root.findtext('.//resultMsg')}")

    total = int(root.findtext(".//totalCount") or 0)
    items = []
    for node in root.iter("item"):
        items.append({child.tag: (child.text or "").strip() for child in node})
    return items, total


def to_backend_item(raw, region_name):
    """공공 API item을 백엔드 bulk API 형식으로 바꾼다."""
    image = raw.get("fdFilePathImg") or None
    if image and not image.startswith(("http://", "https://")):
        image = None  # 백엔드는 http(s)만 허용 (없음 그림은 백엔드가 null 처리)
    return {
        "atcId": raw.get("atcId", ""),
        "fdSn": str(raw.get("fdSn", "")),
        "name": raw.get("fdPrdtNm", ""),
        "category": raw.get("prdtClNm") or None,
        "foundDate": raw.get("fdYmd") or None,
        "storagePlace": raw.get("depPlace") or None,
        "imageUrl": image,
        "content": raw.get("fdSbjt") or None,
        "region": region_name,
        "raw": raw,
    }


def send_batch(batch):
    """100건 이하를 백엔드로 보낸다. 저장된 건수를 돌려준다."""
    request = urllib.request.Request(
        f"{API_BASE_URL}/internal/public-items/bulk",
        data=json.dumps({"items": batch}, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-internal-api-key": INTERNAL_API_KEY,
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read()).get("upserted", len(batch))


def lambda_handler(event, context):
    days_back = int((event or {}).get("days_back", DEFAULT_DAYS_BACK))
    # 오래 걸리는 채우기는 지역을 나눠서 실행: {"days_back": 14, "regions": ["부산", "울산"]}
    wanted = (event or {}).get("regions")
    regions = {c: n for c, n in REGIONS.items() if not wanted or n in wanted}
    # 서울처럼 양이 많은 지역은 기간을 나눠서 실행: {"days_back": 30, "end_days_ago": 15}
    end_days_ago = int((event or {}).get("end_days_ago", 0))
    today = datetime.now(KST).date()
    start_ymd = (today - timedelta(days=days_back)).strftime("%Y%m%d")
    end_ymd = (today - timedelta(days=end_days_ago)).strftime("%Y%m%d")
    print(f"[start] {start_ymd} ~ {end_ymd} ({days_back}일), 지역 {len(regions)}개, "
          f"지역 보정 {'켜짐' if KAKAO_REST_KEY else '꺼짐'}")

    summary = {"fetched": 0, "upserted": 0, "failed_batches": 0, "api_calls": 0,
               "region_fixed": 0, "by_region": {}}

    for code, region_name in regions.items():
        # 페이지(100건)를 받을 때마다 바로 저장한다.
        # 서울처럼 양이 많아 15분 제한에 걸려도 그때까지 받은 건 반영된다.
        region_count = 0
        page = 1
        while True:
            items, total = fetch_page(code, start_ymd, end_ymd, page)
            summary["api_calls"] += 1
            region_count += len(items)

            converted = []
            for raw in items:
                fixed = resolve_region(raw, region_name)
                if fixed != region_name:
                    summary["region_fixed"] += 1
                converted.append(to_backend_item(raw, fixed))

            for i in range(0, len(converted), BATCH_SIZE):
                batch = converted[i:i + BATCH_SIZE]
                try:
                    summary["upserted"] += send_batch(batch)
                except urllib.error.HTTPError as error:
                    summary["failed_batches"] += 1
                    print(f"[backend error] {region_name} {error.code} {error.read()[:300]}")

            if page % 10 == 0:
                print(f"[progress] {region_name} {page}페이지 / 전체 {total}건 중 {region_count}건")
            if page * PAGE_SIZE >= total or not items:
                break
            page += 1
            time.sleep(0.1)  # 공공 API에 부담 주지 않게 살짝 쉬기

        summary["by_region"][region_name] = region_count
        summary["fetched"] += region_count
        print(f"[region] {region_name}({code}): {region_count}건")

    print(f"[done] {json.dumps(summary, ensure_ascii=False)}")
    if summary["failed_batches"]:
        # 실패가 있으면 Lambda를 '오류'로 표시해서 CloudWatch에서 바로 보이게
        raise RuntimeError(f"백엔드 저장 실패 {summary['failed_batches']}묶음")
    return summary