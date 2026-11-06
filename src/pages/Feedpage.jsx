import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Button, CategoryChips, Empty, ErrorBox, Segmented, Spinner } from '../components/ui';
import { api } from '../lib/api';

const PAGE_SIZE = 20;

export default function FeedPage() {
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
    <Layout>
      <h1 className="text-lg font-bold text-slate-900 pt-1">게시물</h1>

      <Segmented
        className="mt-3"
        value={tab}
        onChange={(v) => setParam('tab', v === 'lost' ? 'lost' : '')}
        options={[
          { value: 'found', label: '습득물 (주운 물건)', activeClass: 'text-indigo-600' },
          { value: 'lost', label: '분실물 (찾는 물건)', activeClass: 'text-amber-600' },
        ]}
      />

      <form onSubmit={onSubmit} className="relative mt-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="물건 이름으로 검색"
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setParam('keyword', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="검색어 지우기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      <CategoryChips className="mt-3" value={category} onChange={(v) => setParam('category', v)} />

      {tab === 'found' && (
        <div className="flex gap-1.5 mt-3 text-[11px]">
          {[
            ['all', '전체'],
            ['internal', 'foundit 등록'],
            ['public', '경찰청 유실물'],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setParam('source', v === 'all' ? '' : v)}
              className={`px-2.5 py-1 rounded-md font-semibold ${source === v ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {error && page === 1 ? (
          <ErrorBox message={error} onRetry={() => setReload((n) => n + 1)} />
        ) : loading && page === 1 ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty
            title={keyword ? `'${keyword}' 검색 결과가 없어요` : tab === 'found' ? '등록된 습득물이 없어요' : '등록된 분실물이 없어요'}
            desc={tab === 'found' ? '경찰청 유실물은 최근 30일 것만 보여요.' : undefined}
          />
        ) : (
          <>
            <p className="text-[11px] text-slate-400 mb-2">총 {total.toLocaleString()}건</p>
            <div className="grid grid-cols-2 gap-3">
              {items.map((it) => (
                <ItemCard key={`${it.source || 'internal'}-${it.id}`} item={it} />
              ))}
            </div>
            {hasMore && (
              <Button variant="secondary" className="w-full mt-4" loading={loading} onClick={nextPage}>
                더 보기
              </Button>
            )}
            {error && page > 1 && <p className="text-xs text-rose-500 text-center mt-2">{error}</p>}
          </>
        )}
      </div>
    </Layout>
  );
}
