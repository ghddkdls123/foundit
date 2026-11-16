import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { SimilarityHelp } from '../components/SimilarityHelp';
import { Empty, ErrorBox, Segmented } from '../components/ui';
import { api } from '../lib/api';
import { shrinkImage } from '../lib/format';
import { MIN_SIMILARITY } from '../lib/constants';
import { toast } from '../lib/toast';

const TARGETS = [
  { value: 'FOUND', label: '습득물' },
  { value: 'LOST', label: '분실물' },
  { value: 'ALL', label: '전체' },
];

export default function PhotoSearch() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(state?.file instanceof Blob ? state.file : null);
  const [preview, setPreview] = useState('');
  const [target, setTarget] = useState('FOUND');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    setLoading(true);
    setError('');
    setResult(null);
    (async () => {
      try {
        const small = await shrinkImage(file); // 서버 제한: JPEG/PNG, 1MB 이하
        const form = new FormData();
        form.append('file', small, 'photo.jpg');
        form.append('target', target);
        form.append('limit', '20');
        form.append('minSimilarity', String(MIN_SIMILARITY));
        const d = await api('/items/search-by-image', { method: 'POST', form });
        if (alive) setResult(d?.items ?? []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file, target]);

  const takeFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('사진 파일만 올릴 수 있어요.');
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    takeFile(e.dataTransfer.files?.[0]);
  };

  return (
    <Layout title="사진으로 찾기">
      <p className="text-sm text-slate-500 -mt-3 mb-6">찾는 물건 사진을 올리면 모양이 비슷한 게시글을 찾아드려요. 올린 사진은 저장되지 않아요.</p>

      <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
        <aside className="md:sticky md:top-20">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`block w-full aspect-[4/3] md:aspect-square rounded-lg border overflow-hidden transition ${
              dragging ? 'border-blue-500 bg-blue-50' : file ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            {file ? (
              <img src={preview} alt="검색한 사진" className="w-full h-full object-cover" />
            ) : (
              <span className="flex flex-col items-center justify-center h-full text-sm text-slate-500">
                <span className="font-semibold text-slate-700">사진 선택</span>
                <span className="text-xs text-slate-400 mt-1">클릭하거나 끌어다 놓으세요</span>
              </span>
            )}
          </button>
          {file && (
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-sm text-slate-500 hover:text-slate-900 underline underline-offset-2">
              다른 사진으로 바꾸기
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ''; }} />

          <p className="text-[13px] font-semibold text-slate-700 mt-6 mb-1">찾을 곳</p>
          <Segmented value={target} onChange={setTarget} options={TARGETS} />
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">물건이 크게 나온 사진일수록 잘 찾아요. 경찰청 유실물은 사진 검색 대상이 아니에요.</p>
          <SimilarityHelp className="mt-3" />
        </aside>

        <section className="min-w-0">
          {!file && <Empty title="사진을 올리면 바로 검색해요" />}
          {loading && (
            <div className="py-20 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> 비슷한 물건을 찾는 중...
            </div>
          )}
          {error && <ErrorBox message={error} />}
          {result && result.length === 0 && (
            <Empty
              title="비슷한 물건을 찾지 못했어요"
              desc={`유사도 ${Math.round(MIN_SIMILARITY * 100)}% 이상으로 닮은 물건이 없어요. 다른 각도의 사진으로 해보거나, 분실물로 등록해두세요.`}
              action={<button type="button" onClick={() => navigate('/write?type=LOST')} className="text-sm font-semibold text-blue-600">분실물 등록하기 →</button>}
            />
          )}
          {result && result.length > 0 && (
            <>
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  비슷한 {TARGETS.find((t) => t.value === target)?.label} <span className="text-slate-400 font-medium">{result.length}</span>
                </h2>
                <p className="text-xs text-slate-400">%는 사진이 닮은 정도예요 · {Math.round(MIN_SIMILARITY * 100)}% 이상만 표시</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                {result.map((it) => <ItemCard key={it.id} item={it} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
