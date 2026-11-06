import { useEffect, useState } from 'react';
import { getSession } from './api';

/** 로그인 상태가 바뀌면(로그인, 로그아웃, 토큰 만료) 화면도 다시 그려지게 */
export default function useSession() {
  const [session, setSession] = useState(() => getSession());
  useEffect(() => {
    const update = () => setSession(getSession());
    window.addEventListener('session-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('session-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return session;
}
