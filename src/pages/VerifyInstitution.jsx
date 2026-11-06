import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import { Button, ErrorBox, Field, Spinner, inputClass } from '../components/ui';
import { api } from '../lib/api';
import useSession from '../lib/useSession';

export default function VerifyInstitution() {
  const navigate = useNavigate();
  const session = useSession();
  const [institutions, setInstitutions] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ institutionId: '', department: '', manager: '', contact: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api('/institutions')
      .then((d) => setInstitutions(Array.isArray(d) ? d : []))
      .catch((e) => setLoadError(e.message));
  }, []);

  const emailOk = !!session?.emailVerified;
  const mfaOk = !!session?.mfaVerified;
  const ready = emailOk && mfaOk;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.institutionId) return setError('기관을 골라주세요.');
    setSubmitting(true);
    setError('');
    const evidence = [
      form.department && `부서: ${form.department}`,
      form.manager && `담당자: ${form.manager}`,
      form.contact && `연락처: ${form.contact}`,
      form.note && `설명: ${form.note}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await api('/institutions/verification-requests', {
        method: 'POST',
        body: { institutionId: Number(form.institutionId), evidence: evidence || undefined },
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Layout title="기관 인증 신청" nav={false}>
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-indigo-500 mx-auto" />
          <p className="text-base font-bold text-slate-800 mt-3">신청이 접수됐어요</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            운영자가 확인 후 승인하면 기관 관리자 계정으로 바뀌어요.
            <br />
            승인 후에는 다시 로그인해주세요.
          </p>
          <Button variant="secondary" className="w-full mt-6" onClick={() => navigate('/mypage', { replace: true })}>내 정보로</Button>
        </div>
      </Layout>
    );
  }

  const Step = ({ ok, label, action, onClick }) => (
    <div className="flex items-center gap-2.5 py-2">
      {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
      <span className={`text-sm flex-1 ${ok ? 'text-slate-500' : 'text-slate-800 font-semibold'}`}>{label}</span>
      {!ok && (
        <button type="button" onClick={onClick} className="text-xs font-bold text-indigo-600">
          {action}
        </button>
      )}
    </div>
  );

  return (
    <Layout title="기관 인증 신청" nav={false}>
      <p className="text-xs text-slate-500 leading-relaxed pt-1">
        학교 분실물센터, 학생지원팀 같은 담당 부서라면 기관 관리자로 인증받을 수 있어요. 기관 관리자가 올린 습득물에는 <b className="text-indigo-600">인증 기관</b> 표시가 붙어요.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-2 mt-4 divide-y divide-slate-100">
        <Step ok={emailOk} label="이메일 인증" action="인증하기" onClick={() => navigate('/mypage')} />
        <Step ok={mfaOk} label="2단계 인증(MFA) 등록" action="등록하기" onClick={() => navigate('/mfa')} />
      </div>
      {!ready && <p className="text-[11px] text-amber-600 mt-2">위 두 가지를 먼저 마쳐야 신청할 수 있어요. 다른 기기에서 메일 인증을 했다면 다시 로그인해주세요.</p>}

      {loadError ? (
        <div className="mt-4"><ErrorBox message={loadError} /></div>
      ) : !institutions ? (
        <Spinner />
      ) : (
        <form onSubmit={submit} className="space-y-4 mt-5">
          <Field label="기관">
            <select className={`${inputClass} bg-white`} value={form.institutionId} onChange={set('institutionId')}>
              <option value="">기관을 골라주세요</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}{i.domain ? ` (${i.domain})` : ''}
                </option>
              ))}
            </select>
          </Field>
          {institutions.length === 0 && <p className="text-[11px] text-slate-400 -mt-2">등록된 기관이 없어요. 운영자에게 기관 등록을 요청해주세요.</p>}
          <Field label="부서">
            <input className={`${inputClass} bg-white`} value={form.department} onChange={set('department')} maxLength={100} placeholder="예: 학생지원팀 / 중앙도서관 분실물센터" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="담당자 이름">
              <input className={`${inputClass} bg-white`} value={form.manager} onChange={set('manager')} maxLength={50} />
            </Field>
            <Field label="업무 연락처">
              <input className={`${inputClass} bg-white`} value={form.contact} onChange={set('contact')} maxLength={50} placeholder="041-000-0000" />
            </Field>
          </div>
          <Field label="확인용 설명 (선택)" hint="운영자가 확인할 수 있게 재직 사실을 알 수 있는 내용을 적어주세요.">
            <textarea rows={3} className={`${inputClass} bg-white resize-none`} value={form.note} onChange={set('note')} maxLength={500} />
          </Field>
          {error && <p className="text-xs text-rose-500 whitespace-pre-line">{error}</p>}
          <Button type="submit" className="w-full" loading={submitting}>신청하기</Button>
        </form>
      )}
    </Layout>
  );
}
