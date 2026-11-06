// 백엔드 공공 습득물 분류 매핑(public-category.ts)과 같은 이름을 씁니다.
export const CATEGORIES = ['전자기기', '지갑/카드', '귀중품', '가방', '의류', '우산', '기타'];

// 학교 위치 (지도 시작점)
export const SCHOOL = { lat: 36.799, lng: 127.114, name: '학교' };

// 공공 습득물 region 값과 맞추기 위한 시/도 짧은 이름
export const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

const REGION_ALIASES = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천',
  광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종',
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
