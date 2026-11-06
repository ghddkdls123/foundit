import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import BottomNav from '../components/BottomNavBar';
import KakaoMap from '../components/KakaoMap';
import { CATEGORIES, SCHOOL } from '../lib/constants';
import { api } from '../lib/api';
import { searchPlaces } from '../lib/kakao';
import { timeAgo } from '../lib/format';

const TYPE_TABS = [
  { value: '', label: '전체' },
  { value: 'FOUND', label: '습득물', dot: 'bg-indigo-600' },
  { value: 'LOST', label: '분실물', dot: 'bg-amber-500' },
];

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [bounds, setBounds] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [me, setMe] = useState(null);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);

  // 지도 이동이 끝나면 화면 영역 안의 게시글을 다시 불러옴 (너무 잦은 요청 방지: 300ms)
  const idleTimer = useRef(null);
  const onIdle = useCallback((b) => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setBounds(b), 300);
  }, []);

  useEffect(() => {
    if (!bounds) return;
    let alive = true;
    setLoading(true);
    api('/items/map', { query: { ...bounds, type, category } })
      .then((d) => {
        if (!alive) return;
        setItems(d?.items ?? []);
        setError('');
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bounds, type, category]);

  const markers = useMemo(() => {
    const list = items.map((it) => ({ id: it.id, lat: it.locationLat, lng: it.locationLng, kind: it.type, title: it.title }));
    if (me) list.push({ id: 'me', lat: me.lat, lng: me.lng, kind: 'ME', title: '내 위치' });
    return list;
  }, [items, me]);

  const onMarkerClick = useCallback(
    (m) => {
      if (m.id === 'me') return;
      setSelected(items.find((it) => it.id === m.id) ?? null);
    },
    [items],
  );

  const goMyLocation = () => {
    if (!navigator.geolocation) return alert('이 브라우저는 위치 기능을 지원하지 않아요.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(p);
        mapRef.current?.panTo(p, 4);
      },
      () => alert('위치를 가져올 수 없어요. 브라우저의 위치 권한을 확인해주세요.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    try {
      const found = await searchPlaces(q, SCHOOL);
      setPlaces(found);
      if (found.length === 0) alert('검색 결과가 없어요.');
    } catch (err) {
      alert(err.message);
    }
  };

  const pickPlace = (p) => {
    setPlaces([]);
    setQuery(p.name);
    mapRef.current?.panTo(p, 3);
  };

  return (
    <div className="fixed inset-0 bg-slate-100">
      <KakaoMap
        ref={mapRef}
        className="absolute inset-0"
        center={SCHOOL}
        level={4}
        markers={markers}
        onMarkerClick={onMarkerClick}
        onIdle={onIdle}
        onPick={() => setSelected(null)}
      />

      {/* 상단: 장소 검색 + 필터 */}
      <div className="absolute top-0 inset-x-0 z-10 pointer-events-none">
        <div className="max-w-md mx-auto px-4 pt-3 space-y-2">
          <form onSubmit={onSearch} className="pointer-events-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="장소로 이동 (예: 중앙도서관)"
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setPlaces([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400" aria-label="지우기">
                <X className="w-4 h-4" />
              </button>
            )}
            {places.length > 0 && (
              <ul className="absolute top-full mt-1 inset-x-0 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                {places.map((p) => (
                  <li key={`${p.name}-${p.lat}`}>
                    <button type="button" onClick={() => pickPlace(p)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50">
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{p.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          <div className="pointer-events-auto flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {TYPE_TABS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setType(t.value)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md border ${
                  type === t.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-100'
                }`}
              >
                {t.dot && <span className={`w-2 h-2 rounded-full ${t.dot}`} />}
                {t.label}
              </button>
            ))}
            <span className="shrink-0 w-px bg-slate-300/70 mx-0.5" />
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory((v) => (v === c ? '' : c))}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border ${
                  category === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            {(loading || error) && (
              <span className={`pointer-events-auto text-[11px] font-semibold px-3 py-1 rounded-full shadow ${error ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-500'}`}>
                {error ? error : <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 불러오는 중</span>}
              </span>
            )}
            {!loading && !error && bounds && (
              <span className="pointer-events-auto text-[11px] font-semibold px-3 py-1 rounded-full shadow bg-white/90 text-slate-500">
                이 지역 게시글 {items.length}개{items.length >= 200 ? ' (지도를 확대하면 더 보여요)' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽 버튼 */}
      <div className={`absolute right-4 z-10 flex flex-col gap-2 transition-all ${selected ? 'bottom-[212px]' : 'bottom-24'}`}>
        <button type="button" onClick={() => mapRef.current?.panTo(SCHOOL, 4)} className="w-11 h-11 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center text-slate-700" title="학교로">
          <GraduationCap className="w-5 h-5" />
        </button>
        <button type="button" onClick={goMyLocation} className="w-11 h-11 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center text-sky-600" title="내 위치">
          <LocateFixed className="w-5 h-5" />
        </button>
      </div>

      {/* 마커를 누르면 나오는 카드 */}
      {selected && (
        <div className="absolute bottom-20 inset-x-0 z-20 px-4">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${selected.type === 'FOUND' ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                    {selected.type === 'FOUND' ? '습득물' : '분실물'}
                  </span>
                  <span className="text-[11px] text-slate-400">{selected.category} · {timeAgo(selected.createdAt)}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-1.5 truncate">{selected.title}</p>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {selected.type === 'FOUND'
                    ? selected.storageLocation ?? '로그인하면 보관 장소가 보여요'
                    : '이 근처에서 잃어버렸어요'}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-1 -m-1 text-slate-400" aria-label="닫기">
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/feed/${selected.id}`)}
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              자세히 보기
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
