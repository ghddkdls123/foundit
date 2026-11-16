export function timeAgo(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // 날짜만 있는 값(2026-11-02)은 날짜로 표시
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function fullDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** 사진 검색 서버 제한(1MB 이하, JPEG/PNG)에 맞게 긴 변 1280px JPEG로 줄임 */
export async function shrinkImage(file, maxSide = 1280, maxBytes = 950 * 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('사진을 읽을 수 없습니다.'));
      i.src = url;
    });
    let side = maxSide;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob && blob.size <= maxBytes) {
        return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      }
      side = Math.round(side * 0.75);
    }
    throw new Error('사진이 너무 커요. 다른 사진을 골라주세요.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
