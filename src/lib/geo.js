const MAC_HINT = '맥: 시스템 설정 → 개인정보 보호 및 보안 → 위치 서비스 → 위치 서비스와 사용하는 브라우저(Chrome 등)를 켜주세요.';
const SITE_HINT = '브라우저: 주소창 왼쪽 아이콘 → 위치를 "허용"으로 바꿔주세요.';

function once(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options,
    );
  });
}

/**
 * 현재 위치 가져오기.
 * 1) 와이파이 기반 위치를 빠르게 시도 → 2) 실패하면 정밀 위치로 한 번 더 시도.
 * 둘 다 실패하면 원인에 맞는 안내 문구로 reject.
 */
export async function getMyLocation() {
  if (!navigator.geolocation) throw new Error('이 브라우저는 위치 기능을 지원하지 않아요.');
  if (!window.isSecureContext) throw new Error('위치 기능은 https 주소나 localhost에서만 쓸 수 있어요.');

  // 이미 이 사이트의 위치 권한을 막아둔 경우 바로 안내
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' });
    if (perm?.state === 'denied') throw Object.assign(new Error('denied'), { code: 1 });
  } catch (e) {
    if (e.code === 1) throw new Error(`이 사이트의 위치 권한이 막혀 있어요.\n${SITE_HINT}`);
  }

  let lastErr;
  for (const options of [
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  ]) {
    try {
      return await once(options);
    } catch (err) {
      lastErr = err;
      if (err.code === 1) break; // 권한 거부는 다시 시도해도 같음
    }
  }

  if (lastErr?.code === 1) throw new Error(`위치 권한이 허용되지 않았어요.\n${SITE_HINT}\n${MAC_HINT}`);
  if (lastErr?.code === 3) throw new Error('위치를 찾는 데 시간이 너무 걸려요. 와이파이를 켜고 다시 눌러주세요.');
  // 맥에서 브라우저의 위치 서비스가 꺼져 있으면 보통 이 경우(위치 사용 불가)로 와요
  throw new Error(`지금 위치를 알 수 없어요.\n${MAC_HINT}\n와이파이가 켜져 있어야 노트북 위치를 찾을 수 있어요.`);
}
