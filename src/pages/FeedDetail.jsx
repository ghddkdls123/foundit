import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, Edit3, ImageOff, Lock, MapPin, MoreVertical, RotateCcw, Sparkles, Trash2, User } from 'lucide-react';
import Layout from '../components/Layout';
import KakaoMap from '../components/KakaoMap';
import ItemCard from '../components/ItemCard';
import { Button, ErrorBox, Field, Spinner, inputClass } from '../components/ui';
import { api } from '../lib/api';
import { CATEGORIES, STATUS_LABEL } from '../lib/constants';
import { fullDate } from '../lib/format';
import useSession from '../lib/useSession';

export default function FeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [similar, setSimilar] = useState({ ready: true, items: [] });
  const menuRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api(`/items/${id}`)
      .then((data) => alive && setItem(data))
      .catch((e) => alive && setError(e.status === 404 ? '게시글을 찾을 수 없어요. 삭제되었을 수 있어요.' : e.message))
      .finally(() => alive && setLoading(false));
    api(`/items/${id}/similar`, { query: { limit: 6 } })
      .then((data) => alive && setSimilar({ ready: data?.ready !== false, items: data?.items ?? [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, session?.userId]);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (loading) return <Layout title="게시글"><Spinner /></Layout>;
  if (error || !item) {
    return (
      <Layout title="게시글">
        <ErrorBox message={error || '게시글을 불러오지 못했어요.'} />
        <Button variant="secondary" className="w-full mt-3" onClick={() => navigate('/feed')}>목록으로</Button>
      </Layout>
    );
  }

  const isFound = item.type === 'FOUND';
  const placeValue = isFound ? item.storageLocation : item.lostLocation;

  const startEdit = () => {
    setForm({
      title: item.title,
      category: item.category,
      place: placeValue ?? '',
      content: item.content ?? '',
    });
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    if (!form.title.trim()) return alert('제목을 입력해주세요.');
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim() || undefined,
        [isFound ? 'storageLocation' : 'lostLocation']: form.place.trim() || undefined,
      };
      const updated = await api(`/items/${id}`, { method: 'PATCH', body });
      setItem((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const next = item.status === 'OPEN' ? 'RETURNED' : 'OPEN';
    const msg = next === 'RETURNED' ? '주인에게 돌려줬거나 물건을 찾았나요? 반환 완료로 바꿀게요.' : '다시 진행 중으로 바꿀까요?';
    if (!window.confirm(msg)) return;
    setMenuOpen(false);
    try {
      await api(`/items/${id}/status`, { method: 'PATCH', body: { status: next } });
      setItem((prev) => ({ ...prev, status: next }));
    } catch (e) {
      alert(e.message);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!window.confirm('이 게시글을 삭제할까요? 사진도 함께 지워집니다.')) return;
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      navigate('/feed', { replace: true });
    } catch (e) {
      alert(e.message);
    }
  };

  const menu = item.isMine && !editing && (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-2 -mr-2 rounded-full text-slate-600 hover:bg-slate-100" aria-label="메뉴">
        <MoreVertical className="w-5 h-5" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 text-xs font-semibold">
          <button type="button" onClick={startEdit} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700">
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> 수정하기
          </button>
          <button type="button" onClick={toggleStatus} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700">
            {item.status === 'OPEN' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            {item.status === 'OPEN' ? '반환 완료로 변경' : '진행 중으로 변경'}
          </button>
          <button type="button" onClick={remove} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600 border-t border-slate-50">
            <Trash2 className="w-3.5 h-3.5" /> 삭제하기
          </button>
        </div>
      )}
    </div>
  );

  const images = item.imageUrls ?? [];

  return (
    <Layout title={isFound ? '습득물' : '분실물'} right={menu}>
      <div className="-mx-4">
        {images.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-slate-900">
            {images.map((src, i) => (
              <div key={src} className="relative shrink-0 w-full aspect-square snap-center">
                <img src={src} alt={`${item.title} 사진 ${i + 1}`} className="w-full h-full object-contain" />
                {images.length > 1 && (
                  <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
                    {i + 1} / {images.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-slate-100 flex flex-col items-center justify-center gap-1 text-xs text-slate-400">
            <ImageOff className="w-6 h-6" /> 등록된 사진이 없어요
          </div>
        )}
      </div>

      <div className="pt-4 space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md text-white ${isFound ? 'bg-indigo-600' : 'bg-amber-500'}`}>
              {isFound ? '습득물' : '분실물'}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${item.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.category}</span>
            {item.institution && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> 인증 기관 · {item.institution.name}
              </span>
            )}
          </div>

          {editing ? (
            <input className={`${inputClass} mt-3 font-bold`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 mt-2">{item.title}</h1>
          )}
          <p className="text-[11px] text-slate-400 mt-1">{fullDate(item.createdAt)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-sm">
          <div className="p-4 flex gap-3">
            <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isFound ? 'text-indigo-600' : 'text-amber-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 font-semibold">{isFound ? '보관 장소 (맡긴 곳)' : '잃어버린 장소'}</p>
              {editing ? (
                <input className={`${inputClass} mt-1.5`} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} maxLength={200} />
              ) : isFound && placeValue == null && !session ? (
                <button type="button" onClick={() => navigate('/login', { state: { from: `/feed/${id}` } })} className="mt-0.5 text-indigo-600 font-semibold flex items-center gap-1 text-sm">
                  <Lock className="w-3.5 h-3.5" /> 로그인하면 보관 장소가 보여요
                </button>
              ) : (
                <p className="font-semibold text-slate-800 mt-0.5 break-words">{placeValue || '입력되지 않았어요'}</p>
              )}
            </div>
          </div>
          {editing && (
            <div className="p-4">
              <Field label="분류">
                <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {[...new Set([...CATEGORIES, item.category])].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          )}
          {item.author?.name && (
            <div className="p-4 flex gap-3 items-center">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-slate-600">
                작성자 <span className="font-semibold text-slate-800">{item.author.name}</span>
                {item.isMine && <span className="ml-1 text-[11px] text-indigo-600 font-semibold">(나)</span>}
              </p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-bold text-slate-500 mb-2">{isFound ? '주운 위치' : '잃어버린 지역'}</h2>
          <KakaoMap
            className="h-48 rounded-2xl overflow-hidden border border-slate-200"
            center={{ lat: item.locationLat, lng: item.locationLng }}
            level={3}
            interactive={false}
            markers={[{ id: item.id, lat: item.locationLat, lng: item.locationLng, kind: item.type }]}
          />
        </div>

        <div>
          <h2 className="text-xs font-bold text-slate-500 mb-2">상세 설명</h2>
          {editing ? (
            <textarea rows={5} className={`${inputClass} resize-none`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} maxLength={2000} />
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200 whitespace-pre-wrap break-words">
              {item.content || '작성된 설명이 없어요.'}
            </p>
          )}
        </div>

        {editing && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>취소</Button>
            <Button className="flex-1" loading={saving} onClick={saveEdit}>저장</Button>
          </div>
        )}

        {!editing && item.isMine && item.type === 'LOST' && (
          <Button variant="amber" className="w-full" onClick={() => navigate(`/items/${id}/matches`)}>
            <Sparkles className="w-4 h-4" /> 내 분실물과 비슷한 습득물 보기
          </Button>
        )}

        {!editing && (similar.items.length > 0 || (!similar.ready && images.length > 0)) && (
          <section>
            <h2 className="text-sm font-bold text-slate-800 mb-2">사진이 비슷한 {isFound ? '분실물' : '습득물'}</h2>
            {!similar.ready ? (
              <p className="text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-4">사진을 분석하고 있어요. 잠시 후 다시 확인해주세요.</p>
            ) : (
              <div className="space-y-2">
                {similar.items.map((it) => <ItemCard key={it.id} item={it} layout="row" />)}
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
