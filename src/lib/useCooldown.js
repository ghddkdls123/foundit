import { useEffect, useState } from 'react';

/** 메일 재발송 같은 버튼의 60초 대기 */
export default function useCooldown(seconds = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(seconds)];
}
