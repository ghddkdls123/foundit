import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, MailCheck } from 'lucide-react';
import AuthCard from '../components/AuthCard';
import { Button, Field, inputClass } from '../components/ui';
import { api, rememberName } from '../lib/api';
import useCooldown from '../lib/useCooldown';

// 백엔드 규칙: 8자 이상, 영문+숫자, 72바이트 이하
function passwordChecks(pw) {
  const bytes = new TextEncoder().encode(pw).length;
  return [
    { ok: pw.length >= 8, label: '8자 이상' },
    { ok: /[A-Za-z]/.test(pw) && /\d/.test(pw), label: '영문과 숫자 포함' },
    { ok: bytes <= 72, label: '너무 길지 않게 (한글 24자, 영문 72자 이하)' },
  ];
}

export default function SignupGeneral() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [cooldown, startCooldown] = useCooldown();

  const checks = passwordChecks(form.password);
  const pwOk = checks.every((c) => c.ok);
  const confirmOk = form.confirm.length > 0 && form.confirm === form.password;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pwOk) return setError('비밀번호 조건을 확인해주세요.');
    if (!confirmOk) return setError('비밀번호가 서로 달라요.');
    setLoading(true);
    setError('');
    try {
      await api('/auth/signup', {
        method: 'POST',
        auth: false,
        body: { name: form.name.trim(), email: form.email.trim(), password: form.password },
      });
      rememberName(form.email, form.name.trim());
      setDone(true);
      startCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api('/auth/email/send', { method: 'POST', auth: false, body: { email: form.email.trim() } });
      startCooldown();
    } catch (err) {
      alert(err.message);
    }
  };

  if (done) {
    return (
      <AuthCard subtitle="가입을 환영해요!">
        <div className="text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MailCheck className="w-7 h-7" />
          </span>
          <p className="text-base font-bold text-slate-800 mt-4">인증 메일을 보냈어요</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            <span className="font-semibold text-slate-700">{form.email}</span> 메일함에서
            <br />
            링크를 눌러 이메일 인증을 마쳐주세요. (24시간 유효)
          </p>
          <p className="text-[11px] text-slate-400 mt-2">인증 전에도 로그인해서 둘러볼 수 있어요.</p>
          <Button className="w-full mt-6" onClick={() => navigate('/login')}>로그인하러 가기</Button>
          <button type="button" disabled={cooldown > 0} onClick={resend} className="mt-3 text-xs font-semibold text-slate-500 disabled:text-slate-300">
            {cooldown > 0 ? `메일 다시 보내기 (${cooldown}초)` : '메일이 안 왔나요? 다시 보내기'}
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      subtitle="회원가입"
      footer={
        <>
          이미 계정이 있으신가요?
          <Link to="/login" className="font-semibold text-indigo-600 ml-1.5">로그인</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="이름">
          <input required maxLength={50} className={inputClass} value={form.name} onChange={set('name')} placeholder="홍길동" autoComplete="name" />
        </Field>
        <Field label="이메일" hint="학교 메일로 가입하면 나중에 기관 인증 때 확인이 쉬워요.">
          <input type="email" required className={inputClass} value={form.email} onChange={set('email')} placeholder="example@email.com" autoComplete="email" />
        </Field>
        <Field label="비밀번호">
          <input type="password" required className={inputClass} value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" />
          <span className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {checks.map((c) => (
              <span key={c.label} className={`text-[11px] flex items-center gap-0.5 ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> {c.label}
              </span>
            ))}
          </span>
        </Field>
        <Field label="비밀번호 확인">
          <input type="password" required className={inputClass} value={form.confirm} onChange={set('confirm')} placeholder="••••••••" autoComplete="new-password" />
          {form.confirm && !confirmOk && <span className="block text-[11px] text-rose-500 mt-1">비밀번호가 서로 달라요.</span>}
        </Field>
        {error && <p className="text-xs text-rose-500 whitespace-pre-line">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>가입하기</Button>
      </form>
    </AuthCard>
  );
}
