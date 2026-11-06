import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import { Button, Field, inputClass } from '../components/ui';
import { api, recallName, saveSession } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mfaToken, setMfaToken] = useState(''); // 값이 있으면 2단계(MFA 코드 입력) 화면
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** 로그인 완료: 토큰 저장 → 이름 채우기 → 원래 화면으로 */
  const finish = async (accessToken, verified) => {
    const normalized = email.trim().toLowerCase();
    saveSession({
      accessToken,
      email: normalized,
      name: recallName(normalized) || normalized.split('@')[0],
      emailVerified: verified,
    });
    // 로그인 응답에 이름이 없어서, 내 게시글이 있으면 거기 적힌 이름을 씀
    try {
      const mine = await api('/items/mine', { query: { limit: 1 } });
      const name = mine?.items?.[0]?.author?.name;
      if (name) saveSession({ name });
    } catch {
      /* 이름은 없어도 됨 */
    }
    navigate(from, { replace: true });
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      setEmailVerified(d.emailVerified !== false);
      if (d.mfaRequired) {
        setMfaToken(d.mfaToken);
        return;
      }
      await finish(d.accessToken, d.emailVerified !== false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onMfa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const d = await api('/auth/mfa/login', { method: 'POST', body: { mfaToken, code }, auth: false });
      await finish(d.accessToken, emailVerified);
    } catch (err) {
      if (err.status === 401 && !/코드/.test(err.message)) {
        // mfaToken 은 5분만 유효
        setMfaToken('');
        setCode('');
        setError('인증 시간이 지났어요. 다시 로그인해주세요.');
      } else {
        setError(err.status === 401 ? '인증 코드가 올바르지 않아요.' : err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (mfaToken) {
    return (
      <AuthCard subtitle="2단계 인증">
        <form onSubmit={onMfa} className="space-y-4">
          <div className="flex flex-col items-center text-center">
            <span className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <p className="text-sm font-bold text-slate-800 mt-3">인증 앱의 6자리 코드를 입력하세요</p>
            <p className="text-xs text-slate-400 mt-1">Google Authenticator 등에 표시된 코드예요.</p>
          </div>
          <input
            className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold`}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
          {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" loading={loading} disabled={code.length !== 6}>확인</Button>
          <button type="button" onClick={() => { setMfaToken(''); setCode(''); setError(''); }} className="w-full text-xs text-slate-400">
            처음으로
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      subtitle="분실물 찾기와 습득 신고는 foundit에서"
      footer={
        <>
          아직 계정이 없으신가요?
          <Link to="/signup" className="font-semibold text-indigo-600 ml-1.5">회원가입</Link>
        </>
      }
    >
      {location.state?.reason && (
        <p className="mb-4 text-xs text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2.5">{location.state.reason}</p>
      )}
      <form onSubmit={onLogin} className="space-y-4">
        <Field label="이메일">
          <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
        </Field>
        <Field label="비밀번호">
          <input type="password" required autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        {error && <p className="text-xs text-rose-500 whitespace-pre-line">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>로그인</Button>
      </form>
    </AuthCard>
  );
}
