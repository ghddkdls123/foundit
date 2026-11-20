// index.html 에서 카카오맵 SDK를 autoload=false 로 불러오고, 여기서 준비될 때까지 기다립니다.
import { SCHOOL, SCHOOL_ADDRESS } from './constants';

let loading = null;
const addressCoordCache = new Map();

/** 학교 주소 → 좌표 (지도를 처음 쓰기 전에 한 번). 찾으면 SCHOOL 값을 바꾸고 브라우저에 저장 */
function resolveSchool(kakao) {
  return new Promise((resolve) => {
    if (!kakao.maps.services) return resolve();
    const done = setTimeout(resolve, 1500); // 늦어지면 임시 값으로 진행
    new kakao.maps.services.Geocoder().addressSearch(SCHOOL_ADDRESS, (result, status) => {
      clearTimeout(done);
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const lat = Number(result[0].y);
        const lng = Number(result[0].x);
        Object.assign(SCHOOL, { lat, lng });
        try {
          localStorage.setItem('schoolCoord', JSON.stringify({ address: SCHOOL_ADDRESS, lat, lng }));
        } catch {
          /* 저장 못 해도 이번엔 사용 */
        }
      }
      resolve();
    });
  });
}

export function loadKakao() {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => resolveSchool(window.kakao).then(() => resolve(window.kakao)));
        return;
      }
      if (++tries > 50) {
        loading = null;
        reject(new Error('카카오맵을 불러오지 못했습니다.'));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
  return loading;
}

/** 좌표 → 주소 (시/도, 전체 주소). 실패하면 null */
export async function coordToAddress(lat, lng) {
  try {
    const kakao = await loadKakao();
    if (!kakao.maps.services) return null;
    const geocoder = new kakao.maps.services.Geocoder();
    return await new Promise((resolve) => {
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) return resolve(null);
        const a = result[0].road_address || result[0].address;
        resolve({ region1: a.region_1depth_name, region2: a.region_2depth_name, full: a.address_name });
      });
    });
  } catch {
    return null;
  }
}

// 주소 → 좌표
export function addressToCoord(address) {
  const query = String(address ?? '').trim();
  if (!query) return Promise.resolve(null);
  if (addressCoordCache.has(query)) return addressCoordCache.get(query);
  const request = loadKakao()
    .then((kakao) => {
      if (!kakao.maps.services) return null;
      const geocoder = new kakao.maps.services.Geocoder();
      return new Promise((resolve) => {
        geocoder.addressSearch(query, (result, status) => {
          if (status !== kakao.maps.services.Status.OK || !result[0]) return resolve(null);
          resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
        });
      });
    })
    .catch(() => null);
  addressCoordCache.set(query, request);
  return request;
}

/** 장소 이름 검색 (예: "중앙도서관") */
export async function searchPlaces(keyword, near) {
  const kakao = await loadKakao();
  if (!kakao.maps.services) return [];
  const places = new kakao.maps.services.Places();
  return new Promise((resolve) => {
    const opts = near ? { location: new kakao.maps.LatLng(near.lat, near.lng) } : undefined;
    places.keywordSearch(
      keyword,
      (data, status) => {
        if (status !== kakao.maps.services.Status.OK) return resolve([]);
        resolve(data.slice(0, 8).map((p) => ({ name: p.place_name, address: p.road_address_name || p.address_name, lat: Number(p.y), lng: Number(p.x) })));
      },
      opts,
    );
  });
}

function pinSvg(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 43C17 43 32 27.5 32 16.5C32 7.9 25.3 1 17 1S2 7.9 2 16.5C2 27.5 17 43 17 43Z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="17" cy="16.5" r="5.5" fill="white"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const PIN_COLORS = { FOUND: '#2563eb', LOST: '#f59e0b', ME: '#0ea5e9', PICK: '#e11d48' };

export function markerImage(kakao, kind) {
  return new kakao.maps.MarkerImage(pinSvg(PIN_COLORS[kind] || PIN_COLORS.PICK), new kakao.maps.Size(34, 44), {
    offset: new kakao.maps.Point(17, 43),
  });
}
