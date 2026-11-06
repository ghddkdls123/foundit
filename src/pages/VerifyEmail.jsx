import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import { Button } from '../components/ui';
import { api, getSession, saveSession } from '../lib/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? '' : '인증 링크가 올바르지 않아요.');
  const called = useRef(false);

  useEffect(() => {
    if (!token || called.current) return; // StrictMode 에서 두 번 호출되는 것 방지 (토큰은 1회용)
    called.current = true;
    api('/auth/email/verify', { method: 'POST', auth: false, body: { token } })
      .then(() => {
        setStatus('success');
        if (getSession()) saveSession({ emailVerified: true });
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.message);
      });
  }, [token]);

  const loggedIn = !!getSession();

  return (
    <AuthCard subtitle="이메일 인증">
      <div className="text-center py-2">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-800 mt-4">인증하는 중이에요...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-base font-bold text-slate-800 mt-4">이메일 인증 완료!</p>
            <p className="text-xs text-slate-500 mt-1">{loggedIn ? '이제 모든 기능을 쓸 수 있어요.' : '로그인해서 시작해보세요.'}</p>
            <Button className="w-full mt-6" onClick={() => navigate(loggedIn ? '/mypage' : '/login', { replace: true })}>
              {loggedIn ? '내 정보로' : '로그인하러 가기'}
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <p className="text-base font-bold text-slate-800 mt-4">인증하지 못했어요</p>
            <p className="text-xs text-rose-500 mt-1">{message}</p>
            <p className="text-[11px] text-slate-400 mt-3">링크가 만료됐다면 내 정보 화면에서 인증 메일을 다시 받을 수 있어요.</p>
            <Button variant="secondary" className="w-full mt-6" onClick={() => navigate(loggedIn ? '/mypage' : '/login', { replace: true })}>
              {loggedIn ? '내 정보로' : '로그인 화면으로'}
            </Button>
          </>
        )}
      </div>
    </AuthCard>
  );
}
