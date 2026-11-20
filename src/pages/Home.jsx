import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { CategoryChips, Empty, ErrorBox, RegionFilterGroup, SkeletonGrid } from '../components/ui';
import { api } from '../lib/api';
import useSession from '../lib/useSession';

export default function Home() {
  const navigate = useNavigate();
  const session = useSession();
  const [keyword, setKeyword] = useState('');
  const searchRef = useRef(null);
  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    searchRef.current?.focus();
  };
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [stats, setStats] = useState(null); // { all, internal }

  // 홈 위쪽 숫자: 전체 습득물(최근 30일 공공 포함) / foundit 등록
  useEffect(() => {
    Promise.all([api('/feed', { query: { limit: 1 } }), api('/feed', { query: { source: 'internal', limit: 1 } })])
      .then(([a, b]) => setStats({ all: a?.total ?? 0, internal: b?.total ?? 0 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    // 넉넉히 받아서 사진 있는 것을 먼저 10개 보여줌
    api('/feed', { query: { category, region, limit: 30 } })
      .then((data) => {
        if (!alive) return;
        const list = data?.items ?? [];
        const sorted = [...list.filter((x) => x.thumbnailUrl), ...list.filter((x) => !x.thumbnailUrl)];
        setItems(sorted.slice(0, 10));
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category, region, reload]);

  const onSearch = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/feed?keyword=${encodeURIComponent(q)}` : '/feed');
  };

  const onPhotoClick = () => {
    if (!session) {
      navigate('/login', { state: { from: '/search', reason: '사진으로 찾기는 로그인 후 이용할 수 있어요.' } });
      return;
    }
    navigate('/search');
  };

  return (
    <Layout>
      <section className="pb-6 sm:pb-8 border-b border-slate-200">
        <p className="text-sm text-slate-500">{session ? `${session.name || '회원'}님, 안녕하세요` : '캠퍼스 분실물 찾기'}</p>
        <h1 className="text-[22px] leading-snug sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">잃어버린 물건, Foundit에서 찾아보세요</h1>
        {stats && (
          <p className="text-sm text-slate-500 mt-2">
            지금 찾을 수 있는 습득물 <b className="text-slate-900">{stats.all.toLocaleString()}건</b>
            <span className="text-slate-300 mx-2">|</span>
            Foundit에 직접 등록 <b className="text-blue-600">{stats.internal.toLocaleString()}건</b>
          </p>
        )}

        <form onSubmit={onSearch} className="mt-5 flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="잃어버린 물건 이름 (예: 지갑)"
              className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button type="submit" className="h-11 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
            검색
          </button>
          <button
            type="button"
            onClick={onPhotoClick}
            className="h-11 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold whitespace-nowrap"
          >
            <span className="sm:hidden">사진</span>
            <span className="hidden sm:inline">사진으로 찾기</span>
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <button type="button" onClick={() => navigate('/write?type=FOUND')} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
            물건을 주웠어요 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => navigate('/write?type=LOST')} className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:underline">
            물건을 잃어버렸어요 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => navigate('/map')} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:underline">
            지도에서 보기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <ol className="mt-6 sm:mt-8 grid sm:grid-cols-3 gap-2 sm:gap-3">
          {[
            ['1', '사진이나 이름으로 검색', '눌러서 바로 검색해 보세요.', focusSearch],
            ['2', 'AI가 비슷한 습득물을 찾아요', '사진을 올리면 모양이 비슷한 물건을 찾아요.', onPhotoClick],
            ['3', '보관 장소로 찾아가요', '지도에서 습득물 위치와 보관 장소를 확인해요.', () => navigate('/map')],
          ].map(([n, title, desc, onClick]) => (
            <li key={n}>
              <button
                type="button"
                onClick={onClick}
                className="group w-full h-full flex items-center sm:items-start gap-3 px-3 py-2.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50/50 transition"
              >
                <span className="w-7 h-7 shrink-0 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{n}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="hidden sm:block text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 self-center shrink-0 transition" />
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="pt-6 sm:pt-8">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">최근 습득물</h2>
            <p className="text-xs text-slate-400 mt-0.5">Foundit에 등록된 습득물과 경찰청 유실물(최근 30일)</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (category) params.set('category', category);
              if (region) params.set('region', region);
              const query = params.toString();
              navigate(query ? `/feed?${query}` : '/feed');
            }}
            className="text-sm text-slate-500 hover:text-slate-900 shrink-0"
          >
            전체보기 →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] gap-x-3 gap-y-1 items-start">
          <RegionFilterGroup value={region} onChange={setRegion} includeOverseas />
          <CategoryChips value={category} onChange={setCategory} />
        </div>

        <div className="mt-5">
          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <ErrorBox message={error} onRetry={() => setReload((n) => n + 1)} />
          ) : items.length === 0 ? (
            <Empty title="아직 등록된 습득물이 없어요" desc={region ? `'${region}' 지역에는 최근 30일 습득물이 없어요.` : category ? `'${category}' 분류에는 최근 30일 습득물이 없어요.` : undefined} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6">
              {items.map((it) => (
                <ItemCard key={`${it.source}-${it.id}`} item={it} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
