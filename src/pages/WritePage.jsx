import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import Layout from '../components/Layout';
import KakaoMap from '../components/KakaoMap';
import { Button, Field, Segmented, inputClass } from '../components/ui';
import { api, uploadItemImage } from '../lib/api';
import { CATEGORIES, REGIONS, REGION_CENTERS, SCHOOL, shortRegion } from '../lib/constants';
import { coordToAddress, loadKakao } from '../lib/kakao';
import PlaceSearch from '../components/PlaceSearch';
import { getMyLocation } from '../lib/geo';
import { shrinkImage } from '../lib/format';
import { toast } from '../lib/toast';

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
  const [region, setRegion] = useState(''); // 분실물: 잃어버린 지역(시/도)
  const [photos, setPhotos] = useState([]); // { file, url }
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');

  const isFound = type === 'FOUND';

  // 학교 좌표를 주소로 다시 찾았으면 아직 핀을 안 옮긴 경우 그 위치로 맞춤
  useEffect(() => {
    const start = { ...pos };
    loadKakao()
      .then(() => setPos((p) => (p.lat === start.lat && p.lng === start.lng ? { lat: SCHOOL.lat, lng: SCHOOL.lng } : p)))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 핀 위치의 주소와 시/도 (지역 칸도 핀에 맞춰 자동으로 채움)
  useEffect(() => {
    let alive = true;
    coordToAddress(pos.lat, pos.lng).then((a) => {
      if (!alive) return;
      setAddress(a?.full ?? '');
      const r = shortRegion(a?.region1);
      if (REGIONS.includes(r)) setRegion(r);
    });
    return () => {
      alive = false;
    };
  }, [pos]);

  // 화면을 나갈 때 미리보기 주소 정리
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const movePin = (next, level = 3) => {
    setPos(next);
    mapRef.current?.panTo(next, level);
  };

  const onRegionChange = (r) => {
    setRegion(r);
    const c = REGION_CENTERS[r];
    if (c) movePin({ lat: c[0], lng: c[1] }, 7);
  };

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

  const useMyLocation = async () => {
    setLocating(true);
    try {
      movePin(await getMyLocation());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLocating(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('제목을 입력해주세요.');
    if (!category) return toast.error('분류를 골라주세요.');
    if (isFound && !place.trim()) return toast.error('물건을 맡긴 곳(보관 장소)을 적어주세요.');
    if (!isFound && !region) return toast.error('잃어버린 지역을 골라주세요.');

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
      if (failed) toast.error(`게시글은 등록됐지만 사진 ${failed}장을 올리지 못했어요.`);
      else toast.success(isFound ? '습득물이 등록되었습니다' : '분실물이 등록되었습니다');

      if (isFound) navigate(`/feed/${created.id}`, { replace: true });
      else navigate(`/items/${created.id}/matches`, { replace: true, state: { justCreated: true, region } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  return (
    <Layout title="게시글 등록" width="wide">
      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'FOUND', label: '물건을 주웠어요 (습득물)', activeClass: 'text-blue-600' },
          { value: 'LOST', label: '물건을 잃어버렸어요 (분실물)', activeClass: 'text-amber-600' },
        ]}
      />

      <form onSubmit={onSubmit} className="mt-6 grid md:grid-cols-2 gap-8">
        {/* 왼쪽: 사진 + 내용 */}
        <div className="space-y-5">
          <div>
            <p className="text-[13px] font-semibold text-slate-700 mb-1.5">
              사진 <span className="font-normal text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-md border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5">추가</span>
                </button>
              )}
              {photos.map((p, i) => (
                <div key={p.url} className="relative w-20 h-20 rounded-md overflow-hidden border border-slate-200">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5" aria-label="사진 빼기">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5">대표</span>}
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
            <p className="text-xs text-slate-400 mt-1.5">
              {isFound ? '사진이 있으면 주인이 사진 검색으로 찾을 수 있어요.' : '사진을 올리면 비슷하게 생긴 습득물을 찾아드려요.'}
            </p>
          </div>

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
                  className={`h-8 px-3 rounded-md text-[13px] border ${
                    category === c ? 'bg-slate-900 text-white border-slate-900 font-medium' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
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

          <Field label="상세 설명 (선택)">
            <textarea
              rows={5}
              className={`${inputClass} resize-none`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              placeholder={isFound ? '색깔, 브랜드, 특징 등을 적어주세요. 신분증 번호 같은 개인정보는 적지 마세요.' : '색깔, 브랜드, 안에 든 물건, 잃어버린 시간 등을 적어주세요.'}
            />
          </Field>
        </div>

        {/* 오른쪽: 위치 */}
        <div className="space-y-3">
          {!isFound && (
            <Field label="잃어버린 지역" hint="이 지역의 경찰청 유실물을 함께 찾아드려요. 지도 핀을 옮기면 자동으로 바뀌어요.">
              <select className={inputClass} value={region} onChange={(e) => onRegionChange(e.target.value)}>
                <option value="">지역을 골라주세요</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          )}

          <div>
            <p className="text-[13px] font-semibold text-slate-700">{isFound ? '주운 위치' : '잃어버린 위치'}</p>
            <p className="text-xs text-slate-400 mt-0.5">지도를 눌러 핀을 옮겨주세요.</p>
          </div>

          <div className="flex gap-2">
            <PlaceSearch className="flex-1" near={pos} onPick={(p) => movePin({ lat: p.lat, lng: p.lng })} />
            <button type="button" onClick={useMyLocation} className="shrink-0 h-10 px-3 rounded-md border border-slate-300 text-sky-600 hover:bg-slate-50" title="현재 위치">
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            </button>
          </div>

          <KakaoMap ref={mapRef} className="h-72 md:h-96 rounded-lg overflow-hidden border border-slate-200" center={SCHOOL} level={3} pick={pos} onPick={setPos} />
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            {address || '지도를 눌러 위치를 정해주세요'}
          </p>

          <Button type="submit" variant={isFound ? 'primary' : 'amber'} className="w-full h-12 !mt-6" loading={submitting}>
            {submitting ? progress : isFound ? '습득물 등록하기' : '분실물 등록하고 비슷한 습득물 찾기'}
          </Button>
        </div>
      </form>
    </Layout>
  );
}
