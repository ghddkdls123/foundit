import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Package, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { fullDate } from '../lib/format';
import ItemNotesButton from '../components/ItemNotesButton';
import { Button, Empty, ErrorBox, Spinner } from '../components/ui';
import { toast } from '../lib/toast';

const PAGE_SIZES = [10, 20];

function storagePlace(item) {
  return item.storageLocation ?? item.storagePlace ?? item.place ?? item.lostLocation ?? '장소 정보 없음';
}

function receivedDate(item) {
  const value = item.date ?? item.createdAt;
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return fullDate(value);
}

export default function AdminDashboard({ institution }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZES[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api('/items/org', { query: { limit: 50 } })
      .then((data) => {
        if (!alive) return;
        const result = data?.items ?? [];
        setItems(result);
        setTotal(data?.total ?? result.length);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [reload]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const query = searchTerm.trim().toLocaleLowerCase();
    const status = item.status === 'RETURNED' ? 'RETURNED' : 'OPEN';
    const matchesSearch = !query || [item.title, item.category, storagePlace(item)]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(query));
    return matchesSearch && (statusFilter === 'ALL' || status === statusFilter);
  }), [items, searchTerm, statusFilter]);

  useEffect(() => setCurrentPage(1), [searchTerm, statusFilter, itemsPerPage]);

  const returnedCount = items.filter((item) => item.status === 'RETURNED').length;
  const holdingCount = items.filter((item) => item.status !== 'RETURNED').length;
  const returnRate = items.length ? Math.round((returnedCount / items.length) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const completeReturn = async (item) => {
    if (item.status === 'RETURNED' || busyId != null) return;
    if (!window.confirm('이 습득물을 반환 완료 처리할까요?')) return;
    setBusyId(item.id);
    try {
      const updated = await api(`/items/${item.id}/status`, { method: 'PATCH', body: { status: 'RETURNED' } });
      setItems((previous) => previous.map((entry) => String(entry.id) === String(item.id)
        ? { ...entry, ...updated, status: updated?.status ?? 'RETURNED' }
        : entry));
      toast.success('반환 완료 처리했어요');
    } catch (e) {
      toast.error(e.status === 403 ? '작성자 또는 같은 기관 관리자만 처리할 수 있어요.' : e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">기관 관리자 대시보드</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Building2 className="h-4 w-4 text-blue-600" /> {institution?.name || '우리 기관'} 게시글과 인도 현황
          </p>
        </div>
        <Button variant="secondary" onClick={() => setReload((value) => value + 1)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </Button>
      </div>

      {error ? <ErrorBox message={error} onRetry={() => setReload((value) => value + 1)} /> : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-lg bg-blue-600 p-4 text-white">
              <div className="flex items-center justify-between text-blue-100"><span className="text-xs font-semibold">주인 인도율</span><TrendingUp className="h-4 w-4" /></div>
              <p className="mt-3 text-2xl font-bold">{returnRate}%</p>
              <p className="mt-1 text-[11px] text-blue-100">불러온 {items.length}건 중 {returnedCount}건 인도</p>
            </div>
            <StatCard Icon={Package} label="기관 전체 게시글" value={total} color="slate" />
            <StatCard Icon={Clock3} label="현재 보관 중" value={holdingCount} color="amber" />
            <StatCard Icon={CheckCircle2} label="인도 완료" value={returnedCount} color="emerald" />
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-h-9 w-full items-center justify-center lg:flex-1">
                <h3 className="text-center text-sm font-bold text-slate-900">기관 접수 물품 목록</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden="true" className="hidden h-8 border-l border-slate-200 lg:block" />
                <select aria-label="페이지당 표시 개수" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700">
                  {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}개씩 보기</option>)}
                </select>
                <label className="relative min-w-[190px] flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="물품명, 분류, 보관 위치 검색" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 sm:w-64" />
                </label>
                <div className="flex gap-1 rounded-md bg-slate-100 p-1">
                  {[['ALL', '전체'], ['OPEN', '보관 중'], ['RETURNED', '인도 완료']].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded px-2.5 py-1.5 text-xs font-semibold ${statusFilter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? <Spinner label="기관 게시글을 불러오는 중..." /> : currentItems.length === 0 ? (
              <div className="p-4"><Empty title={items.length ? '조건에 맞는 게시글이 없어요' : '기관 게시글이 없어요'} desc={items.length ? '검색어나 상태 필터를 바꿔보세요.' : '기관에서 등록한 습득물과 분실물이 여기에 표시됩니다.'} /></div>
            ) : (
              <div className="w-full">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[19%]" /><col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-[14%]" /><col className="w-[18%]" /><col className="w-[11%]" />
                  </colgroup>
                  <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="px-1 py-3 text-center sm:px-2">물품명</th><th className="px-1 py-3 text-center sm:px-2">분류</th><th className="px-1 py-3 text-center sm:px-2">접수일</th><th className="px-1 py-3 text-center sm:px-2">보관 위치</th><th className="px-1 py-3 text-center sm:px-2">현재 상태</th><th className="px-1 py-3 text-center sm:px-2">처리</th><th className="px-1 py-3 text-center sm:px-2">메모</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentItems.map((item) => {
                      const returned = item.status === 'RETURNED';
                      const isFound = (item.type ?? 'FOUND') === 'FOUND';
                      return <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-1 py-3 text-center font-semibold text-slate-800 sm:px-2"><button type="button" onClick={() => navigate(`/feed/${item.id}`)} aria-label={`${item.title || '게시글'} 상세 보기`} className="block w-full truncate text-center hover:text-blue-600 hover:underline">{item.title || '제목 없음'}</button></td>
                        <td className="px-1 py-3 text-center text-xs text-slate-600 sm:px-2">{item.category || '-'}</td>
                        <td className="break-words px-1 py-3 text-center text-xs text-slate-500 sm:px-2">{receivedDate(item)}</td>
                        <td className="px-1 py-3 text-center text-xs text-slate-600 sm:px-2"><span className="mx-auto block truncate">{storagePlace(item)}</span></td>
                        <td className="px-1 py-3 text-center sm:px-2"><span className={`inline-flex max-w-full items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold sm:text-[11px] ${returned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {returned ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Clock3 className="h-3.5 w-3.5 shrink-0" />}{returned ? '반환 완료' : '보관 중'}
                        </span></td>
                        <td className="px-1 py-3 text-center sm:px-2">{returned ? <span className="text-xs text-slate-400">처리 완료</span> : isFound ? <Button style={{ borderRadius: '9999px' }} className="h-8 px-2.5 text-xs" loading={String(busyId) === String(item.id)} disabled={busyId != null} onClick={() => completeReturn(item)}>반환 완료 처리</Button> : <span className="text-xs text-slate-300">-</span>}</td>
                        <td className="px-0.5 py-3 text-center sm:px-1"><ItemNotesButton item={item} compact className="mx-auto mt-0" /></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredItems.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500">현재 목록 {filteredItems.length}건 중 {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredItems.length)}건 표시</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{currentPage} / {totalPages}</span>
                <button type="button" aria-label="이전 페이지" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" aria-label="다음 페이지" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages} className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>}
          </section>
          <p className="text-[11px] text-slate-400">목록 API가 한 번에 최대 50건을 반환하므로, 상태별 요약은 현재 불러온 게시글 기준입니다.</p>
        </>
      )}

    </div>
  );
}

function StatCard({ Icon, label, value, color }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-full ${colors[color]}`}><Icon className="h-4 w-4" /></span></div>
    <p className="mt-3 text-2xl font-bold text-slate-900">{Number(value).toLocaleString()}<span className="ml-1 text-xs font-medium text-slate-400">건</span></p>
  </div>;
}
