import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronDown, GraduationCap, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNavBar';
import KakaoMap from '../components/KakaoMap';
import { CATEGORIES, REGION_CENTERS, SCHOOL, shortRegion, toOurCategory } from '../lib/constants';
import { api } from '../lib/api';
import PlaceSearch from '../components/PlaceSearch';
import { getMyLocation } from '../lib/geo';
import { timeAgo } from '../lib/format';
import { toast } from '../lib/toast';
import { RegionFilterGroup } from '../components/ui';
import { addressToCoord, coordToAddress, searchPlaces } from '../lib/kakao';

const TYPE_TABS = [
  { value: '', label: '전체' },
  { value: 'FOUND', label: '습득물', dot: 'bg-blue-600' },
  { value: 'LOST', label: '분실물', dot: 'bg-amber-500' },
];

function TypeBadge({ type }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${type === 'FOUND' ? 'bg-blue-600' : 'bg-amber-500'}`}>
      {type === 'FOUND' ? '습득물' : '분실물'}
    </span>
  );
}

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const listPanelRef = useRef(null);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [mapRegion, setMapRegion] = useState('');
  const [highlightRegion, setHighlightRegion] = useState('');
  const [bounds, setBounds] = useState(null);
  const [items, setItems] = useState([]);
  const [publicItems, setPublicItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const highlightTimer = useRef(null);
  const requestBounds = region ? null : bounds;
  const publicRegion = region || mapRegion || '충남';

  // 지도 이동이 끝나면 화면 영역 안의 게시글을 다시 불러옴 (300ms 모아서)
  const idleTimer = useRef(null);
  const onIdle = useCallback((b) => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setBounds(b), 300);
  }, []);

  useEffect(() => {
    if (!region && !requestBounds) return;
    let alive = true;
    setLoading(true);
    const request = region
      ? api('/items', { query: { region, type, category, page: 1, limit: 50 } })
      : api('/items/map', { query: { ...requestBounds, type, category } });
    request
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
  }, [requestBounds, type, category, region]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  useEffect(() => {
    if (!bounds || region) return undefined;
    let alive = true;
    const lat = (bounds.minLat + bounds.maxLat) / 2;
    const lng = (bounds.minLng + bounds.maxLng) / 2;
    coordToAddress(lat, lng).then((address) => {
      if (alive) setMapRegion(shortRegion(address?.region1));
    });
    return () => { alive = false; };
  }, [bounds, region]);

  useEffect(() => {
    if (type === 'LOST' || !publicRegion) {
      setPublicItems([]);
      setPublicLoading(false);
      return undefined;
    }
    let alive = true;
    setPublicLoading(true);
    api('/feed', { auth: false, query: { source: 'public', region: publicRegion, category, limit: 50 } })
      .then(async (data) => {
        const rawItems = data?.items ?? [];
        const addressFor = (item) => String(
          item.institutionAddress ?? item.organizationAddress ?? item.organizationAddr ?? item.storageAddress ?? item.orgAddr ?? item.addr ?? item.institution?.address ?? item.institution?.addr ?? item.storagePlace ?? item.place ?? '',
        ).trim();
        const addresses = [...new Set(rawItems.map(addressFor).filter(Boolean))];
        const coordinates = new Map();
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(4, addresses.length) }, async () => {
          while (next < addresses.length) {
            const address = addresses[next++];
            coordinates.set(address, await addressToCoord(address));
          }
        }));
        const keywordFor = (item) => [
          item.institutionName ?? item.orgNm ?? item.institution?.name,
          item.storagePlace ?? item.storageLocation ?? item.depPlace ?? item.place,
        ].filter(Boolean).join(' ').trim();
        const keywords = [...new Set(rawItems.map(keywordFor).filter(Boolean))];
        const placeCoordinates = new Map();
        next = 0;
        await Promise.all(Array.from({ length: Math.min(4, keywords.length) }, async () => {
          while (next < keywords.length) {
            const keyword = keywords[next++];
            const places = await searchPlaces(keyword);
            placeCoordinates.set(keyword, places[0] ? { lat: places[0].lat, lng: places[0].lng } : null);
          }
        }));
        const resolved = await Promise.all(rawItems.map(async (item) => {
          const address = addressFor(item);
          let point = address ? coordinates.get(address) : null;
          const storageLocation = item.storagePlace ?? item.storageLocation ?? item.depPlace ?? item.place ?? '';
          const institutionName = item.institutionName ?? item.orgNm ?? item.institution?.name ?? '';
          if (!point) point = placeCoordinates.get(keywordFor(item));
          if (!point) return null;
          return {
            ...item,
            id: item.id,
            mapId: `public:${item.id}`,
            source: 'public',
            type: 'FOUND',
            title: item.title ?? item.name ?? '이름 없는 물건',
            category: toOurCategory(item.category ?? item.categoryMain),
            createdAt: item.foundDate ?? item.date ?? item.createdAt,
            storageLocation,
            institutionName,
            storageAddress: address,
            locationLat: point.lat,
            locationLng: point.lng,
          };
        }));
        if (alive) setPublicItems(resolved.filter(Boolean));
      })
      .catch(() => alive && setPublicItems([]))
      .finally(() => alive && setPublicLoading(false));
    return () => { alive = false; };
  }, [type, publicRegion, category]);

  const selectRegion = (value) => {
    setRegion(value);
    setSelected(null);
    clearTimeout(highlightTimer.current);
    if (!value) {
      setHighlightRegion('');
      return;
    }
    setHighlightRegion(value);
    highlightTimer.current = setTimeout(() => setHighlightRegion(''), 3600);
    const center = REGION_CENTERS[value];
    if (center) mapRef.current?.panTo({ lat: center[0], lng: center[1] }, ['서울', '부산', '대구', '인천', '대전', '울산', '세종'].includes(value) ? 7 : 9);
  };

  const mapItems = useMemo(() => {
    const own = items.filter((it) => (!type || it.type === type) && (!category || it.category === category));
    const publicFound = type === 'LOST' ? [] : publicItems.filter((it) => !category || it.category === category);
    return [...own, ...publicFound];
  }, [items, publicItems, type, category]);

  const markers = useMemo(() => {
    const list = mapItems.map((it) => ({ id: it.mapId ?? it.id, lat: it.locationLat, lng: it.locationLng, kind: it.type, title: it.title }));
    if (me) list.push({ id: 'me', lat: me.lat, lng: me.lng, kind: 'ME', title: '내 위치' });
    return list;
  }, [mapItems, me]);

  const onMarkerClick = useCallback(
    (m) => {
      if (m.id === 'me') return;
        setSelected(mapItems.find((it) => (it.mapId ?? it.id) === m.id) ?? null);
    },
    [mapItems],
  );

  const focusItem = (it) => {
    setSelected(it);
    mapRef.current?.panTo({ lat: it.locationLat, lng: it.locationLng });
  };

  const goMyLocation = async () => {
    setLocating(true);
    try {
      const p = await getMyLocation();
      setMe(p);
      mapRef.current?.panTo(p, 4);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLocating(false);
    }
  };

  const statusText = error
    ? error
    : loading || publicLoading
      ? '불러오는 중'
      : region
        ? `이 지역 게시글 ${mapItems.length}개${mapItems.length >= 200 ? ' (최대 200개)' : ''}`
        : bounds
          ? `이 지역 게시글 ${mapItems.length}개${mapItems.length >= 200 ? ' (확대하면 더 보여요)' : ''}`
          : '';

  const searchBox = <PlaceSearch near={SCHOOL} placeholder="장소로 이동 (예: 중앙도서관)" onPick={(p) => mapRef.current?.panTo(p, 3)} />;

  const typeButtons = TYPE_TABS.map((t) => (
    <button
      key={t.label}
      type="button"
      onClick={() => setType(t.value)}
      className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium border ${
        type === t.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
      }`}
    >
      {t.dot && <span className={`w-2 h-2 rounded-full ${t.dot}`} />}
      {t.label}
    </button>
  ));

  const categoryButtons = CATEGORIES.map((c) => (
    <button key={c} type="button" onClick={() => setCategory((v) => (v === c ? '' : c))}
      className={`shrink-0 h-8 px-3 rounded-md text-[13px] border ${category === c ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
      {c}
    </button>
  ));

  return (
    <div className="fixed inset-0 bg-white">
      <TopBar />

      <div className="absolute top-14 inset-x-0 bottom-16 md:bottom-0 flex">
        {/* 넓은 화면: 왼쪽 목록 */}
        <aside ref={listPanelRef} onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 120)} className="hidden md:flex w-80 lg:w-96 min-h-0 shrink-0 flex-col overflow-y-auto no-scrollbar border-r border-slate-200 bg-white">
          <div className="shrink-0 p-4 space-y-3 border-b border-slate-200">
            <div>
              <h1 className="text-base font-bold text-slate-900">지도에서 찾기</h1>
              <p className="text-xs text-slate-500 mt-0.5">지도를 움직이면 보이는 지역의 게시글이 아래에 나와요.</p>
            </div>
            {searchBox}
              <RegionFilterGroup value={region} onChange={selectRegion} showTitle />
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1">종류</p>
              <div className="flex gap-1.5">{typeButtons}</div>
            </div>
            <div><p className="text-[11px] font-semibold text-slate-400 mb-1">분류</p><div className="flex flex-wrap gap-1.5">{categoryButtons}</div></div>
          </div>
          <p className={`shrink-0 px-4 py-2 text-xs border-b border-slate-100 flex items-center gap-1 ${error ? 'text-rose-600' : 'text-slate-500'}`}>
            {(loading || publicLoading) && <Loader2 className="w-3 h-3 animate-spin" />}
            {statusText}
          </p>
          <ul className="shrink-0 divide-y divide-slate-100">
            {!loading && !publicLoading && mapItems.length === 0 && bounds && (
              <li className="p-6 text-center">
                <p className="text-sm text-slate-500">이 지역에는 게시글이 없어요.</p>
                <p className="text-xs text-slate-400 mt-1">지도를 옮기거나 축소해 보세요.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button type="button" onClick={() => mapRef.current?.panTo(SCHOOL, 4)} className="h-8 px-3 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">학교로 이동</button>
                  <button type="button" onClick={() => navigate('/write?type=FOUND')} className="h-8 px-3 rounded-md bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700">여기서 주웠어요</button>
                </div>
              </li>
            )}
            {mapItems.map((it) => (
              <li key={it.mapId ?? it.id}>
                <button
                  type="button"
                  onClick={() => focusItem(it)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selected?.id === it.id ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={it.type} />
                    {it.source === 'public' && <span className="text-[10px] font-semibold text-slate-500">경찰청</span>}
                    <span className="text-[11px] text-slate-400">{it.category} · {timeAgo(it.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{it.title}</p>
                  {it.type === 'FOUND' && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {it.storageLocation || it.storageAddress || (it.source === 'public' ? '보관 위치 정보가 없어요' : '보관 장소 비공개')}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {showScrollTop && (
          <button type="button" onClick={() => listPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="목록 맨 위로" title="맨 위로"
            className="absolute bottom-4 left-[17rem] lg:left-[21rem] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50">
            <ArrowUp className="h-5 w-5" />
          </button>
        )}

        {/* 지도 */}
        <div className="relative flex-1">
          <KakaoMap
            ref={mapRef}
            className="absolute inset-0"
            center={SCHOOL}
            level={4}
            markers={markers}
            highlightRegion={highlightRegion}
            onMarkerClick={onMarkerClick}
            onIdle={onIdle}
            onPick={() => setSelected(null)}
          />

          {/* 휴대폰: 지도 위 검색/필터 */}
          <div className="md:hidden absolute top-0 inset-x-0 z-10 p-3">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm">
              {searchBox}
              <button type="button" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen((open) => !open)}
                className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                필터 <ChevronDown className={`h-4 w-4 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileFiltersOpen && (
                <div className="space-y-2 border-t border-slate-100 pt-2">
                  <RegionFilterGroup value={region} onChange={selectRegion} showTitle />
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-slate-400">종류</p>
                    <div className="flex flex-wrap gap-1.5">{typeButtons}</div>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-slate-400">분류</p>
                    <div className="flex flex-wrap gap-1.5">{categoryButtons}</div>
                  </div>
                </div>
              )}
              {mobileFiltersOpen && statusText && (
                <div className="flex justify-center">
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded bg-white/95 shadow-sm ${error ? 'text-rose-600' : 'text-slate-500'}`}>{statusText}</span>
                </div>
              )}
            </div>
          </div>

          {/* 핀 색 안내 */}
          {!selected && (
            <div className="absolute left-3 bottom-4 z-10 bg-white/95 rounded-md shadow border border-slate-200 px-3 py-2 flex gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />습득물·경찰청 보관기관</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />분실물</span>
              {me && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />내 위치</span>}
              <span className="hidden sm:inline text-slate-400">· 핀을 누르면 정보가 보여요</span>
            </div>
          )}

          {/* 지도 도구: 넓은 화면은 오른쪽 위, 휴대폰은 오른쪽 아래 */}
          <div
            className={`absolute right-3 z-10 flex flex-col items-end gap-2 md:top-3 md:bottom-auto ${selected ? 'bottom-44' : 'bottom-12'}`}
          >
            <div className="flex bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden text-[13px] font-semibold text-slate-700">
              <button type="button" onClick={() => mapRef.current?.panTo(SCHOOL, 4)} className="h-9 px-3 flex items-center gap-1.5 hover:bg-slate-50" title="나사렛대학교로 이동">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                학교
              </button>
              <span className="w-px bg-slate-200" />
              <button type="button" onClick={goMyLocation} disabled={locating} className="h-9 px-3 flex items-center gap-1.5 hover:bg-slate-50 disabled:text-slate-400" title="내 위치로 이동">
                {locating ? <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> : <LocateFixed className="w-4 h-4 text-sky-600" />}
                {locating ? '찾는 중' : '내 위치'}
              </button>
            </div>
            <div className="flex flex-col bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden text-slate-700">
              <button type="button" onClick={() => mapRef.current?.zoomBy(-1)} className="w-9 h-9 flex items-center justify-center text-lg font-medium hover:bg-slate-50" aria-label="확대">+</button>
              <span className="h-px bg-slate-200" />
              <button type="button" onClick={() => mapRef.current?.zoomBy(1)} className="w-9 h-9 flex items-center justify-center text-lg font-medium hover:bg-slate-50" aria-label="축소">−</button>
            </div>
          </div>

          {/* 선택한 게시글 */}
          {selected && (
            <div className="absolute bottom-4 left-3 right-3 md:right-auto md:w-80 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={selected.type} />
                    {selected.source === 'public' && <span className="text-[10px] font-semibold text-slate-500">경찰청</span>}
                    <span className="text-[11px] text-slate-400">{selected.category} · {timeAgo(selected.createdAt)}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1.5 truncate">{selected.title}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {selected.type === 'FOUND'
                      ? selected.storageLocation || selected.storageAddress || (selected.source === 'public' ? '보관 위치 정보가 없어요' : '보관 장소는 로그인 후 볼 수 있어요')
                      : '이 근처에서 잃어버렸어요'}
                  </p>
                  {selected.source === 'public' && selected.storageAddress && selected.storageAddress !== selected.storageLocation && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">보관기관 주소 기준 위치</p>
                  )}
                </div>
                <button type="button" onClick={() => setSelected(null)} className="p-1 -m-1 text-slate-400" aria-label="닫기">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button type="button" onClick={() => navigate(selected.source === 'public' ? `/public/${selected.id}` : `/feed/${selected.id}`)} className="w-full mt-3 h-9 rounded-md bg-slate-900 text-white text-sm font-semibold">
                자세히 보기
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
