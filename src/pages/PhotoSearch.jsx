import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Empty, ErrorBox, Segmented } from '../components/ui';
import { api } from '../lib/api';
import { shrinkImage } from '../lib/format';

export default function PhotoSearch() {
  const { state } = useLocation();
  const fileRef = useRef(null);
  const [file, setFile] = useState(state?.file instanceof Blob ? state.file : null);
  const [preview, setPreview] = useState('');
  const [target, setTarget] = useState('FOUND');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        const small = await shrinkImage(file);
        const form = new FormData();
        form.append('file', small, 'photo.jpg');
        form.append('target', target);
        form.append('limit', '20');
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

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setFile(f);
  };

  return (
    <Layout title="사진으로 찾기">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />

      {!file ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full mt-2 py-14 rounded-3xl border-2 border-dashed border-violet-200 bg-white flex flex-col items-center gap-2 text-violet-600"
        >
          <span className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center"><Camera className="w-7 h-7" /></span>
          <span className="text-sm font-bold">찾는 물건 사진 고르기</span>
          <span className="text-[11px] text-slate-400 px-8 text-center">비슷한 물건 사진도 괜찮아요. 올린 사진은 저장되지 않아요.</span>
        </button>
      ) : (
        <div className="flex gap-3 items-center bg-white rounded-2xl border border-slate-200 p-3">
          <img src={preview} alt="검색한 사진" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1"><Sparkles className="w-4 h-4 text-violet-500" /> 이 사진과 비슷한 물건</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-indigo-600 mt-1">다른 사진으로 바꾸기</button>
          </div>
        </div>
      )}

      {file && (
        <Segmented
          className="mt-3"
          value={target}
          onChange={setTarget}
          options={[
            { value: 'FOUND', label: '습득물에서', activeClass: 'text-indigo-600' },
            { value: 'LOST', label: '분실물에서', activeClass: 'text-amber-600' },
            { value: 'ALL', label: '전체' },
          ]}
        />
      )}

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="py-14 flex flex-col items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            AI가 사진을 비교하고 있어요...
          </div>
        )}
        {error && <ErrorBox message={error} />}
        {result && result.length === 0 && <Empty title="비슷한 물건을 찾지 못했어요" desc="다른 각도의 사진으로 다시 해보거나, 분실물로 등록해두면 비슷한 습득물을 알려드려요." />}
        {result && result.length > 0 && (
          <>
            <p className="text-[11px] text-slate-400">유사도는 사진이 얼마나 닮았는지예요. 같은 물건일 확률은 아니에요.</p>
            {result.map((it) => <ItemCard key={it.id} item={it} layout="row" />)}
          </>
        )}
      </div>
    </Layout>
  );
}
