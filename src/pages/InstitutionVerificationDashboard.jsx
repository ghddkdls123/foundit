import { useCallback, useEffect, useState } from 'react';
import { Building2, Clock3, Mail, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Empty, ErrorBox, Spinner } from '../components/ui';
import { toast } from '../lib/toast';

function getRequests(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.requests)) return data.requests;
  return [];
}

function dateLabel(value) {
  if (!value) return '신청일 정보 없음';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '신청일 정보 없음' : date.toLocaleString('ko-KR', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function InstitutionVerificationDashboard({ onPendingCountChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reload, setReload] = useState(0);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/admin/verification-requests');
      const nextRequests = getRequests(data);
      setRequests(nextRequests);
      const explicitCount = data?.pendingCount ?? data?.total ?? data?.count;
      onPendingCountChange?.(Number.isFinite(Number(explicitCount)) ? Number(explicitCount) : nextRequests.length);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => { loadRequests(); }, [loadRequests, reload]);

  const decide = async (request, action) => {
    const approving = action === 'approve';
    const applicant = request.applicant?.name ?? request.user?.name ?? request.applicantName ?? request.userName ?? '신청자';
    const institution = request.institution?.name ?? request.institutionName ?? '신청 기관';
    const verb = approving ? '승인' : '거절';
    if (!window.confirm(`${applicant}님의 ${institution} 기관 인증 신청을 ${verb}할까요?`)) return;

    setBusyId(request.id);
    try {
      await api(`/admin/verification-requests/${request.id}/${action}`, { method: 'PATCH' });
      setRequests((current) => current.filter((entry) => String(entry.id) !== String(request.id)));
      onPendingCountChange?.((current) => current == null ? current : Math.max(0, current - 1));
      toast.success(approving ? '기관 인증 신청을 승인했어요' : '기관 인증 신청을 거절했어요');
    } catch (actionError) {
      toast.error(actionError.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">기관 인증 신청</h2>
          <p className="mt-1 text-xs text-slate-500">오래된 신청부터 확인해 주세요. 이메일 도메인 일치는 참고 정보이며 자동 승인 기준은 아니에요.</p>
        </div>
        <Button variant="secondary" onClick={() => setReload((value) => value + 1)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </Button>
      </div>

      {error ? <ErrorBox message={error} onRetry={loadRequests} /> : loading ? <Spinner label="인증 신청을 불러오는 중..." /> : requests.length === 0 ? (
        <Empty title="대기 중인 인증 신청이 없어요" />
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock3 className="h-4 w-4" /> 승인 대기 {requests.length}건
          </div>
          <div className="space-y-3">
            {requests.map((request) => {
              const applicant = request.applicant ?? request.user ?? {};
              const name = applicant.name ?? request.applicantName ?? request.userName ?? '이름 정보 없음';
              const email = applicant.email ?? request.applicantEmail ?? request.email;
              const institution = request.institution?.name ?? request.institutionName ?? (typeof request.institution === 'string' ? request.institution : '기관 정보 없음');
              const evidence = request.evidence ?? request.description ?? request.note;
              const domainMatched = request.domainMatched === true;

              return <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${domainMatched ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {domainMatched ? '이메일 도메인 일치' : '이메일 도메인 불일치'}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-slate-600"><Building2 className="h-4 w-4 shrink-0 text-slate-400" />{institution}</p>
                    {email && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{email}</p>}
                    {evidence && <p className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{evidence}</p>}
                    <p className="text-[11px] text-slate-400">신청일 · {dateLabel(request.createdAt ?? request.submittedAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <Button className="h-9 flex-1 px-3 text-xs sm:flex-none" disabled={busyId != null} loading={String(busyId) === String(request.id)} onClick={() => decide(request, 'approve')}>
                      <ShieldCheck className="h-4 w-4" /> 승인
                    </Button>
                    <Button variant="secondary" className="h-9 flex-1 px-3 text-xs sm:flex-none" disabled={busyId != null} onClick={() => decide(request, 'reject')}>
                      <XCircle className="h-4 w-4" /> 거절
                    </Button>
                  </div>
                </div>
              </article>;
            })}
          </div>
        </>
      )}
    </section>
  );
}
