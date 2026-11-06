import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, HandHeart, SearchCheck, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { CategoryChips, Empty, ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';
import useSession from '../lib/useSession';

export default function Home() {
  const navigate = useNavigate();
  const session = useSession();
  const fileRef = useRef(null);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api('/feed', { query: { category, limit: 6 } })
      .then((data) => alive && setItems(data?.items ?? []))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category, reload]);

  const onSearch = (e) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/feed?keyword=${encodeURIComponent(q)}` : '/feed');
  };

  const onPhotoClick = () => {
    if (!session) {
      navigate('/login', { state: { from: '/', reason: '사진으로 찾기는 로그인 후 이용할 수 있어요.' } });
      return;
    }
    fileRef.current?.click();
  };

  const onPhotoPicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) navigate('/search', { state: { file } });
  };

  return (
    <Layout>
      <section className="pt-2">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
          {session ? `안녕하세요, ${session.name || '회원'}님 👋` : '잃어버린 물건, 같이 찾아요 👋'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {session ? '오늘 잃어버리거나 주운 물건이 있나요?' : '로그인하면 보관 장소 확인과 사진 검색을 쓸 수 있어요.'}
        </p>

        <form onSubmit={onSearch} className="relative mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="무엇을 잃어버리셨나요?"
            className="w-full pl-12 pr-[112px] py-4 rounded-2xl bg-white border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          <button
            type="button"
            onClick={onPhotoClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 h-10 px-3 rounded-xl text-white text-xs font-bold bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            사진으로 찾기
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/*" className="hidden" onChange={onPhotoPicked} />
        </form>
      </section>

      <section className="grid grid-cols-2 gap-3 mt-5">
        <button
          type="button"
          onClick={() => navigate('/write?type=FOUND')}
          className="p-4 rounded-2xl bg-indigo-600 text-white text-left shadow-sm shadow-indigo-600/20"
        >
          <HandHeart className="w-6 h-6" />
          <p className="text-sm font-bold mt-3">물건을 주웠어요</p>
          <p className="text-[11px] text-indigo-100 mt-0.5">습득물 등록</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/write?type=LOST')}
          className="p-4 rounded-2xl bg-white border border-slate-200 text-left"
        >
          <SearchCheck className="w-6 h-6 text-amber-500" />
          <p className="text-sm font-bold text-slate-800 mt-3">물건을 잃어버렸어요</p>
          <p className="text-[11px] text-slate-400 mt-0.5">분실물 등록 후 비슷한 습득물 추천</p>
        </button>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">최근 습득물</h2>
          <button
            type="button"
            onClick={() => navigate(category ? `/feed?category=${encodeURIComponent(category)}` : '/feed')}
            className="text-xs text-indigo-600 font-semibold flex items-center"
          >
            전체보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <CategoryChips value={category} onChange={setCategory} />

        <div className="mt-4">
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorBox message={error} onRetry={() => setReload((n) => n + 1)} />
          ) : items.length === 0 ? (
            <Empty title="아직 등록된 습득물이 없어요" desc={category ? `'${category}' 분류에는 최근 30일 습득물이 없어요.` : undefined} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
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
