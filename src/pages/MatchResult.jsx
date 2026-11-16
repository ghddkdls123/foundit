import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { NoSimilarNotice, SimilarityHelp } from '../components/SimilarityHelp';
import { Button, ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { CATEGORIES, MIN_SIMILARITY, shortRegion } from '../lib/constants';
import { coordToAddress } from '../lib/kakao';

const POLL_MS = 4000;
const POLL_MAX = 8; // 사진 분석은 보통 몇 초~수십 초 걸림

function Section({ title, desc, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      <div className="mt-3 grid md:grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

function Note({ children }) {
  return <p className="md:col-span-2 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200 p-4 leading-relaxed">{children}</p>;
}

export default function MatchResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [similar, setSimilar] = useState({ status: 'loading', items: [] }); // loading | analyzing | done | none
  const [region, setRegion] = useState({ name: '', loaded: false });
  const [publicItems, setPublicItems] = useState({ loading: true, items: [], scope: '' });
  const [recentFound, setRecentFound] = useState([]);

  useEffect(() => {
    api(`/items/${id}`).then(setItem).catch((e) => setError(e.message));
  }, [id]);

  // 1) 사진 유사도: 분석이 끝날 때까지 몇 번 다시 확인
  useEffect(() => {
    if (!item) return;
    if (!item.imageUrls?.length) {
      setSimilar({ status: 'none', items: [] });
      return;
    }
    let alive = true;
    let tries = 0;
    let timer;
    const run = async () => {
      try {
        const d = await api(`/items/${id}/similar`, { query: { limit: 10, minSimilarity: MIN_SIMILARITY } });
        if (!alive) return;
        if (d?.ready === false) {
          if (++tries < POLL_MAX) {
            setSimilar({ status: 'analyzing', items: [] });
            timer = setTimeout(run, POLL_MS);
          } else {
            setSimilar({ status: 'timeout', items: [] });
          }
          return;
        }
        setSimilar({ status: 'done', items: d?.items ?? [] });
      } catch {
        if (alive) setSimilar({ status: 'done', items: [] });
      }
    };
    run();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [item, id]);

  // 2) 잃어버린 지역(시/도) 알아내기
  useEffect(() => {
    if (!item) return;
    // 글쓰기에서 고른 지역이 있으면 그걸 쓰고, 없으면 핀 위치로 알아냄
    if (state?.region) {
      setRegion({ name: state.region, loaded: true });
      return;
    }
    coordToAddress(item.locationLat, item.locationLng).then((a) => setRegion({ name: shortRegion(a?.region1), loaded: true }));
  }, [item, state?.region]);

  // 3) 같은 지역 + 같은 분류의 경찰청 습득물 (없으면 전국)
  useEffect(() => {
    if (!item || !region.loaded) return;
    let alive = true;
    const category = CATEGORIES.includes(item.category) ? item.category : undefined;
    const load = async () => {
      let scope = region.name;
      let d = await api('/public-items', { query: { category, region: region.name || undefined, photoFirst: true, limit: 10 } });
      if (region.name && (d?.items?.length ?? 0) === 0) {
        scope = '';
        d = await api('/public-items', { query: { category, photoFirst: true, limit: 10 } });
      }
      if (alive) setPublicItems({ loading: false, items: d?.items ?? [], scope });
    };
    load().catch(() => alive && setPublicItems({ loading: false, items: [], scope: '' }));
    return () => {
      alive = false;
    };
  }, [item, region]);

  // 4) foundit 에 올라온 같은 분류 습득물
  useEffect(() => {
    if (!item) return;
    api('/items', { query: { type: 'FOUND', category: item.category, limit: 6 } })
      .then((d) => setRecentFound(d?.items ?? []))
      .catch(() => {});
  }, [item]);

  if (error) return <Layout title="비슷한 습득물" width="medium"><ErrorBox message={error} /></Layout>;
  if (!item) return <Layout title="비슷한 습득물" width="medium"><Spinner /></Layout>;

  return (
    <Layout title="비슷한 습득물" width="medium">
      {state?.justCreated && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">분실물이 등록됐어요</p>
            <p className="text-xs text-emerald-700 mt-0.5">아래에서 비슷한 습득물을 확인해보세요.</p>
          </div>
        </div>
      )}

      <button type="button" onClick={() => navigate(`/feed/${id}`)} className="w-full mt-3 flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-400 text-left">
        <div className="w-14 h-14 rounded-md bg-slate-100 overflow-hidden shrink-0">
          {item.imageUrls?.[0] && <img src={item.imageUrls[0]} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-amber-600">내 분실물 · {item.category}</p>
          <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
        </div>
      </button>

      <Section title="사진이 비슷한 습득물" desc={`AI가 사진 모양을 비교한 결과 중 유사도 ${Math.round(MIN_SIMILARITY * 100)}% 이상만 보여줘요. 같은 물건일 확률은 아니에요.`}>
        <SimilarityHelp className="md:col-span-2 -mt-1" />
        {similar.status === 'loading' && <div className="md:col-span-2"><Spinner label="찾는 중..." /></div>}
        {similar.status === 'analyzing' && (
          <Note>
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /> 사진을 분석하고 있어요. 잠시만 기다려주세요.</span>
          </Note>
        )}
        {similar.status === 'timeout' && <Note>사진 분석이 아직 끝나지 않았어요. 잠시 후 이 화면을 다시 열어주세요.</Note>}
        {similar.status === 'none' && (
          <Note>
            사진이 없어서 사진 비교는 건너뛰었어요.{' '}
            <button type="button" className="text-blue-600 font-semibold" onClick={() => navigate('/search')}>사진으로 찾기</button>로 다른 사진을 넣어볼 수도 있어요.
          </Note>
        )}
        {similar.status === 'done' &&
          (similar.items.length === 0 ? <div className="md:col-span-2"><NoSimilarNotice targetLabel="습득물" /></div> : similar.items.map((it) => <ItemCard key={it.id} item={it} layout="row" />))}
      </Section>

      <Section
        title={publicItems.scope ? `${publicItems.scope} 지역 경찰청 유실물` : '전국 경찰청 유실물'}
        desc={`최근 30일 · ${item.category}${region.name && !publicItems.scope && !publicItems.loading ? ` · ${region.name}에는 없어서 전국에서 찾았어요` : ''}`}
      >
        {publicItems.loading ? (
          <div className="md:col-span-2"><Spinner label="찾는 중..." /></div>
        ) : publicItems.items.length === 0 ? (
          <Note>같은 분류의 경찰청 유실물이 없어요.</Note>
        ) : (
          publicItems.items.map((it) => <ItemCard key={it.id} item={it} layout="row" />)
        )}
      </Section>

      {recentFound.length > 0 && (
        <Section title={`Foundit에 올라온 ${item.category} 습득물`}>
          {recentFound.map((it) => <ItemCard key={it.id} item={it} layout="row" />)}
        </Section>
      )}

      <Button variant="secondary" className="w-full md:w-auto mt-8" onClick={() => navigate('/search')}>
        다른 사진으로 찾아보기
      </Button>
    </Layout>
  );
}
