import { useEffect, useState } from 'react';
import { getUnread, subscribeUnread } from './chat';

/** 안 읽은 채팅 메시지 수 (헤더/탭 배지용) */
export default function useUnread() {
  const [n, setN] = useState(getUnread);
  useEffect(() => subscribeUnread(setN), []);
  return n;
}
