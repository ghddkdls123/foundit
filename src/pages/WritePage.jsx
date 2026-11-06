import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, LocateFixed, MapPin, Search, X } from 'lucide-react';
import Layout from '../components/Layout';
import KakaoMap from '../components/KakaoMap';
import { Button, Field, Segmented, inputClass } from '../components/ui';
import { api, uploadItemImage } from '../lib/api';
import { CATEGORIES, SCHOOL } from '../lib/constants';
import { coordToAddress, searchPlaces } from '../lib/kakao';
import { shrinkImage } from '../lib/format';

const MAX_PHOTOS = 5;

export default function WritePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mapRef = useRef(null);
  const fileRef = useRef(null);

  const [type, setType] = useState(params.get('type') === 'LOST' ? 'LOST' : 'FOUND');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [place, setPlace] = useState(''); // FOUND: 보관 장소, LOST: 잃어버린 장소
  const [content, setContent] = useState('');
  const [pos, setPos] = useState({ lat: SCHOOL.lat, lng: SCHOOL.lng });
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState([]); // { file, url }
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');

  const isFound = type === 'FOUND';

  // 핀 위치의 주소 표시
  useEffect(() => {
    let alive = true;
    coordToAddress(pos.lat, pos.lng).then((a) => alive && setAddress(a?.full ?? ''));
    return () => {
      alive = false;
    };
  }, [pos]);

  // 화면을 나갈 때 미리보기 주소 정리
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const addPhotos = (e) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (i) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert('이 브라우저는 위치 기능을 지원하지 않아요.');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(next);
        mapRef.current?.panTo(next, 3);
      },
      () => alert('위치를 가져올 수 없어요. 브라우저의 위치 권한을 확인해주세요.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onPlaceSearch = async () => {
    const q = query.trim();
    if (!q) return;
    try {
      const found = await searchPlaces(q, pos);
      setPlaces(found);
      if (found.length === 0) alert('검색 결과가 없어요.');
    } catch (err) {
      alert(err.message);
    }
  };

  const pickPlace = (p) => {
    setPlaces([]);
    setQuery('');
    setPos({ lat: p.lat, lng: p.lng });
    mapRef.current?.panTo(p, 3);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('제목을 입력해주세요.');
    if (!category) return alert('분류를 골라주세요.');
    if (isFound && !place.trim()) return alert('물건을 맡긴 곳(보관 장소)을 적어주세요.');

    setSubmitting(true);
    setProgress('게시글 등록 중...');
    try {
      const body = {
        title: title.trim(),
        type,
        category,
        locationLat: pos.lat,
        locationLng: pos.lng,
        content: content.trim() || undefined,
        ...(isFound ? { storageLocation: place.trim() } : { lostLocation: place.trim() || undefined }),
      };
      const created = await api('/items', { method: 'POST', body });

      let failed = 0;
      for (let i = 0; i < photos.length; i++) {
        setProgress(`사진 올리는 중 (${i + 1}/${photos.length})`);
        try {
          const file = await shrinkImage(photos[i].file, 1600, 3 * 1024 * 1024);
          await uploadItemImage(created.id, file);
        } catch {
          failed++;
        }
      }
      if (failed) alert(`게시글은 등록됐지만 사진 ${failed}장을 올리지 못했어요.`);

      if (isFound) navigate(`/feed/${created.id}`, { replace: true });
      else navigate(`/items/${created.id}/matches`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  return (
    <Layout title="게시글 등록">
      <form onSubmit={onSubmit} className="space-y-5 pt-1">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'FOUND', label: '물건을 주웠어요', activeClass: 'text-indigo-600' },
            { value: 'LOST', label: '물건을 잃어버렸어요', activeClass: 'text-amber-600' },
          ]}
        />

        {/* 사진 */}
        <section>
          <p className="text-xs font-bold text-slate-700 mb-1.5">
            사진 <span className="font-normal text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500"
              >
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-semibold mt-0.5">추가</span>
              </button>
            )}
            {photos.map((p, i) => (
              <div key={p.url} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5" aria-label="사진 빼기">
                  <X className="w-3.5 h-3.5" />
                </button>
                {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5">대표</span>}
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
          <p className="text-[11px] text-slate-400 mt-1.5">
            {isFound ? '사진이 있으면 주인이 사진 검색으로 찾을 수 있어요.' : '사진을 올리면 비슷하게 생긴 습득물을 찾아드려요.'}
          </p>
        </section>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <Field label="제목">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={isFound ? '예: 검정 반지갑 주웠어요' : '예: 에어팟 프로 케이스 찾아요'}
            />
          </Field>

          <Field label="분류">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    category === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={isFound ? '보관 장소 (물건을 맡긴 곳)' : '잃어버린 장소 (선택)'}
            hint={isFound ? '로그인한 사용자에게만 보여요. 직접 갖고 있다면 "제가 보관 중"이라고 적어주세요.' : '기억나는 만큼만 적어주세요.'}
          >
            <input
              className={inputClass}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={200}
              placeholder={isFound ? '예: 학생회관 1층 분실물센터' : '예: 중앙도서관 2층 열람실 근처'}
            />
          </Field>
        </div>

        {/* 지도 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-700">{isFound ? '주운 위치' : '잃어버린 지역'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isFound ? '물건을 주운 곳을 지도에서 눌러주세요.' : '잃어버린 것 같은 곳을 지도에서 눌러주세요. 이 지역의 습득물을 추천해드려요.'}
          </p>

          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <input
                className={`${inputClass} py-2.5 pr-9`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onPlaceSearch();
                  }
                }}
                placeholder="장소 검색"
              />
              <button type="button" onClick={onPlaceSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400" aria-label="검색">
                <Search className="w-4 h-4" />
              </button>
              {places.length > 0 && (
                <ul className="absolute z-20 top-full mt-1 inset-x-0 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                  {places.map((p) => (
                    <li key={`${p.name}-${p.lat}`}>
                      <button type="button" onClick={() => pickPlace(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                        <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.address}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" onClick={useMyLocation} className="shrink-0 px-3 rounded-xl border border-slate-200 text-sky-600 bg-white" title="현재 위치">
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>

          <KakaoMap
            ref={mapRef}
            className="h-56 rounded-xl overflow-hidden border border-slate-200 mt-2"
            center={SCHOOL}
            level={3}
            pick={pos}
            onPick={setPos}
          />
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
            {address || '지도를 눌러 위치를 정해주세요'}
          </p>
        </section>

        <Field label="상세 설명 (선택)">
          <textarea
            rows={4}
            className={`${inputClass} resize-none bg-white`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            placeholder={isFound ? '색깔, 브랜드, 특징 등을 적어주세요. 신분증 번호 같은 개인정보는 적지 마세요.' : '색깔, 브랜드, 안에 든 물건, 잃어버린 시간 등을 적어주세요.'}
          />
        </Field>

        <Button type="submit" variant={isFound ? 'primary' : 'amber'} className="w-full py-4" loading={submitting}>
          {submitting ? progress : isFound ? '습득물 등록하기' : '분실물 등록하고 비슷한 습득물 찾기'}
        </Button>
      </form>
    </Layout>
  );
}
