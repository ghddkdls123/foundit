import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Mail, RefreshCw, ShieldCheck, UserRoundMinus } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Empty, ErrorBox, Spinner } from '../components/ui';
import { toast } from '../lib/toast';

function getAdmins(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export default function OrgAdminManagementDashboard() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [targetId, setTargetId] = useState(null);
  const [successorId, setSuccessorId] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/admin/org-admins');
      setAdmins(getAdmins(data));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins, reload]);

  const target = admins.find((admin) => String(admin.id) === String(targetId));
  const institutionId = target?.institution?.id;
  const successors = useMemo(() => admins.filter((admin) => (
    String(admin.id) !== String(target?.id) && institutionId != null && String(admin.institution?.id) === String(institutionId)
  )), [admins, institutionId, target?.id]);

  const openRevoke = (admin) => {
    setTargetId(admin.id);
    setSuccessorId('');
  };

  const closeRevoke = () => {
    if (busy) return;
    setTargetId(null);
    setSuccessorId('');
  };

  const revoke = async () => {
    if (!target || !successorId || busy) return;
    const successor = successors.find((admin) => String(admin.id) === String(successorId));
    if (!successor) return toast.error('같은 기관의 후임 관리자를 선택해주세요.');
    if (!window.confirm(`${target.name}님의 ${target.institution?.name || '기관'} 관리자 권한을 회수하고, 담당 물품과 대화를 ${successor.name}님에게 넘길까요?`)) return;

    setBusy(true);
    try {
      const result = await api(`/admin/users/${target.id}/revoke-org`, {
        method: 'PATCH',
        body: { transferToUserId: Number(successorId) },
      });
      setAdmins((current) => current.filter((admin) => String(admin.id) !== String(target.id)));
      setTargetId(null);
      setSuccessorId('');
      const transferredItems = Number(result?.transferredItems);
      toast.success(Number.isFinite(transferredItems)
        ? `권한을 회수했어요. 습득물 ${transferredItems}건을 후임 관리자에게 넘겼어요.`
        : '기관 관리자 권한을 회수했어요.');
    } catch (revokeError) {
      toast.error(revokeError.message || '권한 회수에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">기관 관리자 관리</h2>
          <p className="mt-1 text-xs text-slate-500">관리자 권한을 회수할 때는 같은 기관의 후임 관리자를 지정해야 합니다.</p>
        </div>
        <Button variant="secondary" onClick={() => setReload((value) => value + 1)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </Button>
      </div>

      {error ? <ErrorBox message={error} onRetry={loadAdmins} /> : loading ? <Spinner label="기관 관리자를 불러오는 중..." /> : admins.length === 0 ? (
        <Empty title="기관 관리자가 없어요" />
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">기관 관리자 {admins.length}명</p>
          {admins.map((admin) => <article key={admin.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{admin.name || '이름 정보 없음'}</p>
              {admin.email && <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" />{admin.email}</p>}
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-blue-700"><Building2 className="h-3.5 w-3.5 shrink-0" />{admin.institution?.name || '기관 정보 없음'}</p>
            </div>
            <Button variant="secondary" className="h-9 shrink-0 px-3 text-xs" onClick={() => openRevoke(admin)}>
              <UserRoundMinus className="h-4 w-4" /> 권한 회수
            </Button>
          </article>)}
        </div>
      )}

      {target && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" onClick={closeRevoke}>
        <section role="dialog" aria-modal="true" aria-labelledby="revoke-org-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <h3 id="revoke-org-title" className="font-bold text-slate-900">기관 관리자 권한 회수</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{target.name}님의 학교 습득물과 학생들과의 대화를 같은 기관의 후임 관리자에게 넘긴 뒤 일반 회원으로 변경합니다.</p>
            </div>
          </div>

          <label className="mt-5 block text-xs font-semibold text-slate-700" htmlFor="org-admin-successor">후임 관리자</label>
          <select id="org-admin-successor" value={successorId} onChange={(event) => setSuccessorId(event.target.value)} disabled={!successors.length || busy} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15">
            <option value="">{successors.length ? '같은 기관의 관리자를 선택하세요' : '선택 가능한 후임 관리자가 없어요'}</option>
            {successors.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} · {admin.email}</option>)}
          </select>
          {!successors.length && <p className="mt-2 text-xs text-amber-700">먼저 같은 기관의 후임 관리자를 등록해야 권한을 회수할 수 있어요.</p>}

          <div className="mt-5 flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" disabled={busy} onClick={closeRevoke}>취소</Button>
            <Button type="button" className="flex-1" disabled={!successorId || busy} loading={busy} onClick={revoke}>회수 및 이관</Button>
          </div>
        </section>
      </div>}
    </section>
  );
}
