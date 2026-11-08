import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import { Button, Field, inputClass } from '../components/ui';
import { api, recallName, saveSession } from '../lib/api';
import { toast } from '../lib/toast';

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
  const [showPw, setShowPw] = useState(false);

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
    toast.success('로그인되었습니다');
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
      <AuthCard title="2단계 인증" desc="휴대폰 인증 앱(Google Authenticator 등)에 표시된 6자리 코드를 입력하세요.">
        <form onSubmit={onMfa} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
          <input
            className={`${inputClass} h-14 text-center text-2xl tracking-[0.5em] font-bold`}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
          <p className="text-xs text-slate-400">코드는 30초마다 바뀌어요. 5분 안에 입력해주세요.</p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full h-11" loading={loading} disabled={code.length !== 6}>확인</Button>
          <button type="button" onClick={() => { setMfaToken(''); setCode(''); setError(''); }} className="w-full text-sm text-slate-500 hover:text-slate-800">
            다른 계정으로 로그인
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="로그인"
      desc="Foundit 계정의 이메일과 비밀번호를 입력하세요."
      footer={
        <>
          <span className="block mb-2">아직 계정이 없으신가요?</span>
          <Link to="/signup" className="flex items-center justify-center h-11 rounded-md border border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">이메일로 회원가입</Link>
          <Link to="/" className="block mt-4 text-center text-sm text-slate-500 hover:text-slate-900">로그인 없이 둘러보기 →</Link>
        </>
      }
    >
      {location.state?.reason && (
        <p className="mb-5 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2.5">{location.state.reason}</p>
      )}
      {!location.state?.reason && location.state?.from && location.state.from !== '/' && (
        <p className="mb-5 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">로그인이 필요한 화면이에요. 로그인하면 바로 이어서 볼 수 있어요.</p>
      )}
      <form onSubmit={onLogin} className="space-y-4">
        <Field label="이메일">
          <input type="email" required autoComplete="email" className={`${inputClass} h-11`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
        </Field>
        <Field label="비밀번호">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className={`${inputClass} h-11 pr-16`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">
              {showPw ? '숨기기' : '보기'}
            </button>
          </div>
        </Field>
        {error && <p className="text-sm text-rose-600 whitespace-pre-line">{error}</p>}
        <Button type="submit" className="w-full h-11" loading={loading}>로그인</Button>
      </form>

      <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-700">로그인하면 이런 걸 할 수 있어요</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          <li>✓ 습득물이 맡겨진 보관 장소 확인</li>
          <li>✓ 사진으로 비슷한 물건 찾기</li>
          <li>✓ 주운 물건·잃어버린 물건 등록</li>
        </ul>
      </div>
    </AuthCard>
  );
}
