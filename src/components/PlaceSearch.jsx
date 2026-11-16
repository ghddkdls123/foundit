import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { searchPlaces } from '../lib/kakao';

/**
 * 장소 검색 + 자동완성: 글자를 치는 동안 카카오 장소 검색 결과를 아래에 보여줌
 * - onPick({ name, address, lat, lng })
 * - near: { lat, lng } 이 근처 결과를 먼저
 */
export default function PlaceSearch({ onPick, near, placeholder = '장소 검색 (예: 중앙도서관)', className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const boxRef = useRef(null);
  const nearRef = useRef(near);
  nearRef.current = near;

  // 입력이 멈추고 0.25초 뒤에 검색 (한 글자부터)
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchPlaces(q, nearRef.current);
        if (!alive) return;
        setResults(found);
        setActive(found.length ? 0 : -1);
        setSearched(true);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  // 바깥을 누르면 닫기
  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (p) => {
    setQuery(p.name);
    setOpen(false);
    onPick(p);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = results[active] ?? results[0];
      if (p) pick(p);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query.trim() && (results.length > 0 || (searched && !loading));

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={!!showList}
        className="w-full h-10 pl-9 pr-9 rounded-md bg-white border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
      ) : (
        query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" aria-label="지우기">
            <X className="w-4 h-4" />
          </button>
        )
      )}

      {showList && (
        <ul role="listbox" className="absolute z-30 top-full mt-1 inset-x-0 bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-400">'{query.trim()}' 검색 결과가 없어요</li>
          ) : (
            results.map((p, i) => (
              <li key={`${p.name}-${p.lat}-${p.lng}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(p)}
                  className={`w-full text-left px-3 py-2 flex gap-2.5 ${i === active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 truncate">{p.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{p.address}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
