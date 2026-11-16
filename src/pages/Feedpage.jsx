import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Button, CategoryChips, Empty, ErrorBox, Segmented, SkeletonGrid } from '../components/ui';
import { api } from '../lib/api';

const PAGE_SIZE = 20;

export default function FeedPage() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'lost' ? 'lost' : 'found';
  const source = params.get('source') || 'all';
  const category = params.get('category') || '';
  const keyword = params.get('keyword') || '';

  const [input, setInput] = useState(keyword);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  // 검색 조건이 바뀌면 자동으로 1페이지부터
  const filterKey = `${tab}|${source}|${category}|${keyword}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const nextPage = () => setPageState({ key: filterKey, page: page + 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => setInput(keyword), [keyword]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const req =
      tab === 'found'
        ? api('/feed', { query: { source, category, keyword, page, limit: PAGE_SIZE } })
        : api('/items', { query: { type: 'LOST', category, keyword, page, limit: PAGE_SIZE } });
    req
      .then((data) => {
        if (!alive) return;
        const list = data?.items ?? [];
        setItems((prev) => (page === 1 ? list : [...prev, ...list]));
        setTotal(data?.total ?? list.length);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, source, category, keyword, page, reload]);

  const onSubmit = (e) => {
    e.preventDefault();
    setParam('keyword', input.trim());
  };

  const hasMore = items.length < total;

  return (
    <Layout title="게시물">
      <p className="text-sm text-slate-500 -mt-3 mb-5 sm:mb-4">
        누군가 주운 물건(습득물)과 주인을 찾는 물건(분실물)을 모아 보여줘요. 경찰청 유실물도 함께 나와요.
      </p>
      <ol className="hidden sm:grid mb-6 sm:grid-cols-3 gap-2">
        {[
          ['1', '이름으로 검색', '물건 이름을 입력해 보세요.', () => searchRef.current?.focus()],
          ['2', '사진으로 찾기', 'AI가 모양이 비슷한 물건을 찾아요.', () => navigate('/search')],
          ['3', '못 찾았다면 분실물 등록', '등록하면 비슷한 습득물을 추천해요.', () => navigate('/write?type=LOST')],
        ].map(([n, title, desc, onClick]) => (
          <li key={n}>
            <button
              type="button"
              onClick={onClick}
              className="group w-full h-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50/50 transition"
            >
              <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{n}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{title}</span>
                <span className="block text-xs text-slate-500 truncate">{desc}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0 transition" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <Segmented
          className="md:flex-1"
          value={tab}
          onChange={(v) => setParam('tab', v === 'lost' ? 'lost' : '')}
          options={[
            { value: 'found', label: '습득물 (주운 물건)', activeClass: 'text-blue-600' },
            { value: 'lost', label: '분실물 (찾는 물건)', activeClass: 'text-amber-600' },
          ]}
        />
        <form onSubmit={onSubmit} className="relative md:w-72 md:mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus={params.get('focus') === '1'}
            type="search"
            placeholder="물건 이름으로 검색"
            className="w-full h-9 pl-9 pr-9 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setParam('keyword', '')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:bg-slate-100"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <CategoryChips className="flex-1" value={category} onChange={(v) => setParam('category', v)} />
        {tab === 'found' && (
          <div className="flex gap-1 text-xs shrink-0">
            {[
              ['all', '전체 출처'],
              ['internal', 'Foundit 등록'],
              ['public', '경찰청 유실물'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setParam('source', v === 'all' ? '' : v)}
                className={`h-8 px-2.5 rounded-md font-medium ${source === v ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {error && page === 1 ? (
          <ErrorBox message={error} onRetry={() => setReload((n) => n + 1)} />
        ) : loading && page === 1 ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <Empty
            title={keyword ? `'${keyword}' 검색 결과가 없어요` : tab === 'found' ? '등록된 습득물이 없어요' : '등록된 분실물이 없어요'}
            desc={tab === 'found' ? '경찰청 유실물은 최근 30일 것만 보여요. 분실물로 등록해두면 비슷한 습득물을 추천해드려요.' : undefined}
            action={
              tab === 'found' ? (
                <Button variant="secondary" onClick={() => navigate('/write?type=LOST')}>분실물로 등록하기</Button>
              ) : (
                <Button variant="secondary" onClick={() => navigate('/write?type=FOUND')}>주운 물건 등록하기</Button>
              )
            }
          />
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              {keyword && <b className="text-slate-600">'{keyword}' </b>}총 {total.toLocaleString()}건
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6">
              {items.map((it) => (
                <ItemCard key={`${it.source || 'internal'}-${it.id}`} item={it} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <Button variant="secondary" className="w-full sm:w-60" loading={loading} onClick={nextPage}>
                  더 보기
                </Button>
              </div>
            )}
            {error && page > 1 && <p className="text-xs text-rose-500 text-center mt-2">{error}</p>}
          </>
        )}
      </div>
    </Layout>
  );
}
