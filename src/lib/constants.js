// 백엔드 공공 습득물 분류 매핑(public-category.ts)과 같은 이름을 씁니다.
export const CATEGORIES = ['전자기기', '지갑/카드', '귀중품', '가방', '의류', '우산', '기타'];

// 학교 위치 (지도 시작점)
// 학교 위치: 나사렛대학교 (충남 천안시 서북구 월봉로 48)
// 지도가 켜질 때 카카오 주소 검색으로 이 주소의 정확한 좌표를 찾아 lat/lng 를 바꿔 넣습니다 (lib/kakao.js).
// 아래 숫자는 찾기 전·실패했을 때 쓰는 임시 값이에요.
export const SCHOOL_ADDRESS = '충남 천안시 서북구 월봉로 48';
export const SCHOOL = { lat: 36.799, lng: 127.114, name: '나사렛대학교' };
(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('schoolCoord') || 'null');
    if (saved?.address === SCHOOL_ADDRESS && saved.lat && saved.lng) Object.assign(SCHOOL, { lat: saved.lat, lng: saved.lng });
  } catch {
    /* 저장된 값이 없으면 임시 값 사용 */
  }
})();

// 공공 습득물 region 값과 맞추기 위한 시/도 짧은 이름
export const REGIONS = [
  '서울', '부산', '대구', '인천', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

export const FEED_REGIONS = [...REGIONS, '해외'];

export const REGION_LABEL = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
  대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시', 경기: '경기도',
  강원: '강원도', 충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도',
  전남: '전남광주통합특별시', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도', 해외: '해외',
};

// 지역을 고르면 지도를 옮길 대표 위치 (시청·도청 근처)
export const REGION_CENTERS = {
  서울: [37.5665, 126.978], 부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014], 인천: [37.4563, 126.7052],
  대전: [36.3504, 127.3845], 울산: [35.5384, 129.3114], 세종: [36.48, 127.289],
  경기: [37.2752, 127.0095], 강원: [37.8813, 127.7298], 충북: [36.6357, 127.4917], 충남: [36.6588, 126.6728],
  전북: [35.8203, 127.1088], 전남: [34.8161, 126.4629], 경북: [36.576, 128.5056], 경남: [35.2383, 128.6925],
  제주: [33.4996, 126.5312],
};

const REGION_ALIASES = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천',
  광주: '전남', 광주광역시: '전남', 전남광주통합특별시: '전남', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종',
  경기도: '경기', 강원도: '강원', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남',
  제주특별자치도: '제주',
};

/** 카카오 주소의 시/도 이름("충청남도")을 짧은 이름("충남")으로 */
export function shortRegion(name) {
  if (!name) return '';
  if (REGIONS.includes(name)) return name;
  return REGION_ALIASES[name] || name.slice(0, 2);
}

export const TYPE_LABEL = { FOUND: '습득물', LOST: '분실물' };
export const STATUS_LABEL = { OPEN: '진행 중', RETURNED: '반환 완료' };

/** 경찰청 분류("지갑", "기타물품", "휴대폰 > 스마트폰" 등)를 우리 분류로 (백엔드 public-category.ts 와 같은 규칙) */
export function toOurCategory(raw) {
  if (!raw) return '기타';
  if (CATEGORIES.includes(raw)) return raw;
  const main = raw.split(' > ')[0];
  if (['전자기기', '휴대폰'].some((m) => main.startsWith(m))) return '전자기기';
  if (['지갑', '카드', '증명서'].some((m) => main.startsWith(m))) return '지갑/카드';
  if (['귀금속', '현금'].some((m) => main.startsWith(m))) return '귀중품';
  if (['가방', '쇼핑백'].some((m) => main.startsWith(m))) return '가방';
  if (main.startsWith('의류')) return '의류';
  if (raw.includes('우산')) return '우산';
  return '기타';
}

// 경찰청 유실물 조회 (2026년 1월부터 LOST112가 경찰민원24로 통합됨)
export const POLICE_LOST_URL = 'https://minwon24.police.go.kr/main.do';

// 사진 유사도 하한선 (0~1). 이 값보다 덜 닮은 결과는 보여주지 않아요.
// 같은 물건 사진끼리 / 다른 물건끼리 실제로 몇 %가 나오는지 보고 조정하세요.
export const MIN_SIMILARITY = 0.55; // 2026-11-07 테스트: 같은 에어팟 케이스 64%, 다른 물건(지갑) 50%
