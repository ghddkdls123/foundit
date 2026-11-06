import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import { Button, ErrorBox, Spinner, inputClass } from '../components/ui';
import { api, saveSession } from '../lib/api';

export default function MfaSetup() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null); // { qrDataUrl, otpauthUrl }
  const [status, setStatus] = useState('loading'); // loading | ready | already | done | error
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return; // 두 번 부르면 비밀키가 바뀌어서 QR이 무효가 됨
    called.current = true;
    api('/auth/mfa/setup', { method: 'POST' })
      .then((d) => {
        setSetup(d);
        setStatus('ready');
      })
      .catch((e) => {
        if (e.status === 400) setStatus('already');
        else {
          setError(e.message);
          setStatus('error');
        }
      });
  }, []);

  const secret = (() => {
    try {
      return new URL(setup?.otpauthUrl).searchParams.get('secret') || '';
    } catch {
      return '';
    }
  })();

  const enable = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const d = await api('/auth/mfa/enable', { method: 'POST', body: { code } });
      saveSession({ accessToken: d.accessToken }); // MFA 인증된 새 토큰
      setStatus('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="2단계 인증(MFA) 등록" nav={false}>
      {status === 'loading' && <Spinner />}
      {status === 'error' && <ErrorBox message={error} />}

      {status === 'already' && (
        <div className="text-center py-10">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-slate-800 mt-3">이미 2단계 인증을 쓰고 있어요</p>
          <p className="text-xs text-slate-500 mt-1">로그인할 때마다 인증 앱의 코드를 입력하게 돼요.</p>
          <Button variant="secondary" className="w-full mt-6" onClick={() => navigate('/mypage')}>내 정보로</Button>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center py-10">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-slate-800 mt-3">2단계 인증이 켜졌어요</p>
          <p className="text-xs text-slate-500 mt-1">다음 로그인부터 인증 앱의 6자리 코드를 입력해주세요.</p>
          <Button className="w-full mt-6" onClick={() => navigate('/mypage', { replace: true })}>내 정보로</Button>
        </div>
      )}

      {status === 'ready' && setup && (
        <div className="space-y-5 pt-1">
          <ol className="text-xs text-slate-600 space-y-1.5 bg-white rounded-2xl border border-slate-200 p-4 list-decimal list-inside leading-relaxed">
            <li>휴대폰에 Google Authenticator 같은 인증 앱을 설치하세요.</li>
            <li>앱에서 아래 QR 코드를 스캔하세요.</li>
            <li>앱에 나온 6자리 코드를 입력하면 완료돼요.</li>
          </ol>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center">
            <img src={setup.qrDataUrl} alt="MFA 등록용 QR 코드" className="w-48 h-48" />
            {secret && (
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(secret).then(() => alert('키를 복사했어요.'))}
                className="mt-3 text-[11px] text-slate-500 flex items-center gap-1 font-mono break-all text-center"
              >
                <Copy className="w-3 h-3 shrink-0" /> {secret}
              </button>
            )}
            <p className="text-[10px] text-slate-400 mt-1">스캔이 안 되면 위 키를 앱에 직접 입력하세요.</p>
          </div>

          <form onSubmit={enable} className="space-y-3">
            <input
              className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold bg-white`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
            {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
            <Button type="submit" className="w-full" loading={saving} disabled={code.length !== 6}>등록 완료</Button>
          </form>
        </div>
      )}
    </Layout>
  );
}
