import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, Edit3, ImageOff, Lock, MapPin, MessageCircle, MoreVertical, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import KakaoMap from '../components/KakaoMap';
import ItemCard from '../components/ItemCard';
import { NoSimilarNotice, SimilarityHelp } from '../components/SimilarityHelp';
import { Button, ErrorBox, Field, Spinner, inputClass } from '../components/ui';
import { api } from '../lib/api';
import { CATEGORIES, MIN_SIMILARITY, REGIONS, REGION_LABEL, STATUS_LABEL } from '../lib/constants';
import { fullDate } from '../lib/format';
import useSession from '../lib/useSession';
import { toast } from '../lib/toast';

function noteDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function FeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();

  const [item, setItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [similar, setSimilar] = useState({ ready: true, items: [] });
  const [noteData, setNoteData] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [noteScope, setNoteScope] = useState('PRIVATE');
  const [noteText, setNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [askOpen, setAskOpen] = useState(false); // "작성자에게 문의하기" 안내 창
  const [asking, setAsking] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api(`/items/${id}`)
      .then((data) => alive && setItem(data))
      .catch((e) => alive && setError(e.status === 404 ? '게시글을 찾을 수 없어요. 삭제되었을 수 있어요.' : e.message))
      .finally(() => alive && setLoading(false));
    // 사진 분석(임베딩)이 아직이면 4초마다 다시 확인 (최대 약 40초)
    let tries = 0;
    let timer;
    const loadSimilar = () =>
      api(`/items/${id}/similar`, { query: { limit: 10, minSimilarity: MIN_SIMILARITY } })
        .then((data) => {
          if (!alive) return;
          const ready = data?.ready !== false;
          setSimilar({ ready, items: data?.items ?? [], gaveUp: !ready && tries >= 9 });
          if (!ready && ++tries < 10) timer = setTimeout(loadSimilar, 4000);
        })
        .catch(() => {});
    loadSimilar();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, session?.userId]);

  useEffect(() => {
    if (!session?.userId) {
      setCurrentUser(null);
      return undefined;
    }
    let alive = true;
    api('/users/me')
      .then((data) => alive && setCurrentUser(data))
      .catch(() => alive && setCurrentUser(null));
    return () => { alive = false; };
  }, [session?.userId]);

  useEffect(() => {
    if (!session?.userId) {
      setNoteData(null);
      setNotesError('');
      return undefined;
    }
    let alive = true;
    setNotesLoading(true);
    setNotesError('');
    api(`/items/${id}/notes`)
      .then((data) => {
        if (!alive) return;
        setNoteData({
          canWriteInstitution: data?.canWriteInstitution === true,
          private: Array.isArray(data?.private) ? data.private : [],
          institution: Array.isArray(data?.institution) ? data.institution : [],
        });
      })
      .catch((e) => alive && setNotesError(e.message))
      .finally(() => alive && setNotesLoading(false));
    return () => { alive = false; };
  }, [id, session?.userId]);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (loading) return <Layout back width="medium"><Spinner /></Layout>;
  if (error || !item) {
    return (
      <Layout back width="medium">
        <ErrorBox message={error || '게시글을 불러오지 못했어요.'} />
        <Button variant="secondary" className="w-full mt-3" onClick={() => navigate('/feed')}>목록으로</Button>
      </Layout>
    );
  }

  const isFound = item.type === 'FOUND';
  const placeValue = isFound ? item.storageLocation : item.lostLocation;
  const itemInstitutionId = item.institution?.id ?? item.institutionId;
  const userInstitutionId = currentUser?.institution?.id ?? currentUser?.institutionId;
  const canManageStatus = item.isMine === true || (
    currentUser?.role === 'ORG_ADMIN' && itemInstitutionId != null && userInstitutionId != null &&
    String(itemInstitutionId) === String(userInstitutionId)
  );

  const startEdit = () => {
    setForm({
      title: item.title,
      category: item.category,
      place: placeValue ?? '',
      content: item.content ?? '',
      region: item.region ?? '',
    });
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    if (!form.title.trim()) return toast.error('제목을 입력해주세요.');
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim() || undefined,
        region: form.region || null,
        [isFound ? 'storageLocation' : 'lostLocation']: form.place.trim() || undefined,
      };
      const updated = await api(`/items/${id}`, { method: 'PATCH', body });
      setItem((prev) => ({ ...prev, ...updated, region: form.region || null }));
      setEditing(false);
      toast.success('수정되었습니다');
    } catch (e) {
      toast.error(e.message);
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
      toast.success(next === 'RETURNED' ? '반환 완료로 바꿨어요' : '진행 중으로 바꿨어요');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    if (
      !window.confirm(
        '이 게시글을 삭제할까요?\n\n사진과 이 글로 나눈 채팅 대화도 모두 함께 지워져요.\n물건을 찾았거나 돌려줬다면 삭제 대신 "반환 완료로 변경"을 써 주세요.',
      )
    )
      return;
    try {
      await api(`/items/${id}`, { method: 'DELETE' });
      toast.success('삭제되었습니다');
      navigate('/feed', { replace: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const menu = canManageStatus && !editing && (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" aria-label="메뉴">
        <MoreVertical className="w-5 h-5" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-slate-100 py-1 z-50 text-xs font-semibold">
          {item.isMine && <button type="button" onClick={startEdit} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700">
            <Edit3 className="w-3.5 h-3.5 text-blue-600" /> 수정하기
          </button>}
          {canManageStatus && <button type="button" onClick={toggleStatus} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700">
            {item.status === 'OPEN' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            {item.status === 'OPEN' ? '반환 완료로 변경' : '진행 중으로 변경'}
          </button>}
          {item.isMine && <button type="button" onClick={remove} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-rose-50 text-rose-600 border-t border-slate-50">
            <Trash2 className="w-3.5 h-3.5" /> 삭제하기
          </button>}
        </div>
      )}
    </div>
  );

  const images = item.imageUrls ?? [];
  const visibleNotes = noteScope === 'INSTITUTION' ? noteData?.institution ?? [] : noteData?.private ?? [];

  const openAsk = () => {
    if (!session) {
      navigate('/login', { state: { from: `/feed/${id}` } });
      return;
    }
    setAskOpen(true);
  };

  const startChat = async () => {
    setAsking(true);
    try {
      const { conversationId } = await api(`/items/${id}/conversations`, { method: 'POST' });
      setAskOpen(false);
      navigate(`/chats/${conversationId}`);
    } catch (e) {
      if (e.status === 403) {
        toast.error('이메일 인증을 마친 뒤에 문의할 수 있어요. 내 정보에서 인증 메일을 받아주세요.');
      } else {
        toast.error(e.message);
      }
    } finally {
      setAsking(false);
    }
  };

  const submitNote = async (e) => {
    e.preventDefault();
    const content = noteText.trim();
    if (!content || content.length > 1000 || noteSubmitting) return;
    setNoteSubmitting(true);
    try {
      await api(`/items/${id}/notes`, { method: 'POST', body: { content, scope: noteScope } });
      setNoteText('');
      const data = await api(`/items/${id}/notes`);
      setNoteData({
        canWriteInstitution: data?.canWriteInstitution === true,
        private: Array.isArray(data?.private) ? data.private : [],
        institution: Array.isArray(data?.institution) ? data.institution : [],
      });
      toast.success('메모를 저장했어요');
    } catch (e2) {
      toast.error(e2.status === 429 ? '메모를 너무 자주 작성했어요. 잠시 후 다시 시도해주세요.' : e2.message);
    } finally {
      setNoteSubmitting(false);
    }
  };

  const deleteNote = async (note) => {
    if (!note.isMine || deletingNoteId != null) return;
    setDeletingNoteId(note.id);
    try {
      await api(`/items/${id}/notes/${note.id}`, { method: 'DELETE' });
      setNoteData((prev) => prev ? {
        ...prev,
        private: prev.private.filter((entry) => String(entry.id) !== String(note.id)),
        institution: prev.institution.filter((entry) => String(entry.id) !== String(note.id)),
      } : prev);
      toast.success('메모를 삭제했어요');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <Layout back width="wide">
      <div className="grid md:grid-cols-2 gap-6 md:gap-10">
        {/* 왼쪽: 사진 */}
        <div>
          {images.length > 0 ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-lg border border-slate-200 bg-slate-50">
              {images.map((src, i) => (
                <div key={src} className="relative shrink-0 w-full aspect-square snap-center">
                  <img src={src} alt={`${item.title} 사진 ${i + 1}`} className="w-full h-full object-contain" />
                  {images.length > 1 && (
                    <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded">
                      {i + 1} / {images.length}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-sm text-slate-400">
              <ImageOff className="w-6 h-6" /> 등록된 사진이 없어요
            </div>
          )}
          {images.length > 1 && <p className="text-xs text-slate-400 mt-1.5">옆으로 넘기면 사진이 더 있어요.</p>}
        </div>

        {/* 오른쪽: 정보 */}
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded text-white ${isFound ? 'bg-blue-600' : 'bg-amber-500'}`}>
                {isFound ? '습득물' : '분실물'}
              </span>
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${item.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{item.category}</span>
              {item.institution && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> 인증 기관 · {item.institution.name}
                </span>
              )}
            </div>
            {menu}
          </div>

          {editing ? (
            <input className={`${inputClass} mt-3 font-semibold`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">{item.title}</h1>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {fullDate(item.createdAt)}
            {item.author?.name && ` · ${item.author.name}${item.isMine ? ' (나)' : ''}`}
          </p>

          <dl className="mt-5 border-t border-slate-200 divide-y divide-slate-100 text-sm">
            <div className="py-3 grid grid-cols-[96px_1fr] gap-3">
              <dt className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{isFound ? '보관 장소' : '잃어버린 곳'}</dt>
              <dd className="min-w-0">
                {editing ? (
                  <input className={inputClass} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} maxLength={200} />
                ) : isFound && placeValue == null && !session ? (
                  <button type="button" onClick={() => navigate('/login', { state: { from: `/feed/${id}` } })} className="text-blue-600 font-semibold inline-flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> 로그인하면 보관 장소가 보여요
                  </button>
                ) : (
                  <span className="font-medium text-slate-900 break-words">{placeValue || '입력되지 않았어요'}</span>
                )}
              </dd>
            </div>
            {editing && (
              <div className="py-3 grid grid-cols-[96px_1fr] gap-3">
                <dt className="text-slate-500">분류</dt>
                <dd>
                  <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {[...new Set([...CATEGORIES, item.category])].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </dd>
              </div>
            )}
            {(editing || item.region) && (
              <div className="py-3 grid grid-cols-[96px_1fr] gap-3">
                <dt className="text-slate-500">지역</dt>
                <dd>
                  {editing ? (
                    <select className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                      <option value="">지역 선택 안 함</option>
                      {REGIONS.map((r) => <option key={r} value={r}>{REGION_LABEL[r] || r}</option>)}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-900">{REGION_LABEL[item.region] || item.region}</span>
                  )}
                </dd>
              </div>
            )}
            <div className="py-3 grid grid-cols-[96px_1fr] gap-3">
              <dt className="text-slate-500">상세 설명</dt>
              <dd className="min-w-0">
                {editing ? (
                  <textarea rows={5} className={`${inputClass} resize-none`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} maxLength={2000} />
                ) : (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{item.content || '작성된 설명이 없어요.'}</p>
                )}
              </dd>
            </div>
          </dl>

          {editing && (
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>취소</Button>
              <Button className="flex-1" loading={saving} onClick={saveEdit}>저장</Button>
            </div>
          )}

          {!editing && item.isMine && item.type === 'LOST' && (
            <Button variant="amber" className="w-full mt-4" onClick={() => navigate(`/items/${id}/matches`)}>
              내 분실물과 비슷한 습득물 보기
            </Button>
          )}

          {!editing && !item.isMine && item.status === 'OPEN' && (
            <Button className="w-full mt-4" onClick={openAsk}>
              <MessageCircle className="w-4 h-4" /> {item.institution ? `${item.institution.name}에 문의하기` : '작성자에게 문의하기'}
            </Button>
          )}

          {!editing && !item.isMine && item.status === 'OPEN' && (
            isFound ? (
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm">
                <p className="font-semibold text-slate-900">내 물건인가요?</p>
                <ol className="mt-1.5 space-y-0.5 text-slate-600 list-decimal list-inside">
                  <li>위 보관 장소로 찾아가세요{item.institution ? ` (${item.institution.name} 운영 시간 확인)` : ''}.</li>
                  <li>신분증과, 내 물건임을 알 수 있는 특징(색, 안에 든 것 등)을 말해주세요.</li>
                  <li>직접 보관 중인 글이면 작성자가 적은 장소·설명을 참고하세요.</li>
                </ol>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50/60 p-4 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">이 물건을 주우셨나요?</p>
                  <p className="text-slate-600 mt-0.5">습득물로 등록하면 주인이 찾을 수 있어요.</p>
                </div>
                <Button variant="secondary" className="shrink-0" onClick={() => navigate('/write?type=FOUND')}>습득물 등록</Button>
              </div>
            )
          )}

          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{isFound ? '주운 위치' : '잃어버린 지역'}</p>
            <KakaoMap
              className="h-52 rounded-lg overflow-hidden border border-slate-200"
              center={{ lat: item.locationLat, lng: item.locationLng }}
              level={3}
              interactive={false}
              markers={[{ id: item.id, lat: item.locationLat, lng: item.locationLng, kind: item.type }]}
            />
          </div>
        </div>
      </div>

      {!editing && (
        <section className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">메모</h2>
              <p className="mt-1 text-xs text-slate-500">내 메모는 나만 볼 수 있고, 기관 메모는 해당 기관 관리자에게만 보여요.</p>
            </div>
            {session && noteData?.canWriteInstitution && (
              <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
                <button type="button" onClick={() => setNoteScope('PRIVATE')} className={`rounded px-3 py-1.5 font-semibold ${noteScope === 'PRIVATE' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>내 메모</button>
                <button type="button" onClick={() => setNoteScope('INSTITUTION')} className={`rounded px-3 py-1.5 font-semibold ${noteScope === 'INSTITUTION' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>기관 메모</button>
              </div>
            )}
          </div>

          {!session ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex flex-wrap items-center justify-between gap-3">
              <span>로그인하면 이 게시물에 나만 볼 수 있는 메모를 작성할 수 있어요.</span>
              <Button variant="secondary" onClick={() => navigate('/login', { state: { from: `/feed/${id}` } })}>로그인</Button>
            </div>
          ) : notesLoading ? (
            <p className="mt-4 text-sm text-slate-400">메모를 불러오는 중...</p>
          ) : notesError ? (
            <p className="mt-4 text-sm text-rose-600">메모를 불러오지 못했어요. {notesError}</p>
          ) : noteData ? (
            <>
              <form onSubmit={submitNote} className="mt-4">
                <textarea rows={3} maxLength={1000} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder={noteScope === 'INSTITUTION' ? '기관 동료와 공유할 처리 기록을 적어주세요.' : '나만 볼 수 있는 메모를 적어주세요.'}
                  className={`${inputClass} resize-y`} />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">{noteText.length} / 1000자</span>
                  <Button type="submit" disabled={!noteText.trim() || noteSubmitting} loading={noteSubmitting}>메모 저장</Button>
                </div>
              </form>

              {visibleNotes.length === 0 ? (
                <p className="mt-5 rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                  {noteScope === 'INSTITUTION' ? '아직 기관 메모가 없어요.' : '아직 내 메모가 없어요.'}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {visibleNotes.map((note) => (
                    <li key={note.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] text-slate-400">
                          {noteScope === 'INSTITUTION' && <><span className="font-semibold text-slate-600">{note.authorName || '기관 관리자'}</span> · </>}
                          {noteDateLabel(note.createdAt)}
                        </p>
                        {note.isMine === true && (
                          <button type="button" onClick={() => deleteNote(note)} disabled={deletingNoteId === note.id}
                            className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label="메모 삭제" title="메모 삭제">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{note.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </section>
      )}

      {!editing && (
        <section className="mt-10 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <h2 className="text-lg font-bold text-slate-900">사진이 비슷한 {isFound ? '분실물' : '습득물'}</h2>
            <span className="text-xs text-slate-400">유사도 {Math.round(MIN_SIMILARITY * 100)}% 이상</span>
          </div>
          <SimilarityHelp className="mb-4" />
          {images.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              이 글에는 사진이 없어서 사진 비교를 할 수 없어요.
              {!isFound && (
                <button type="button" onClick={() => navigate('/search')} className="ml-1 font-semibold text-blue-600 hover:underline">
                  다른 사진으로 찾아보기 →
                </button>
              )}
            </div>
          ) : !similar.ready ? (
            <p className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
              {similar.gaveUp ? '사진 분석이 아직 끝나지 않았어요. 잠시 후 새로고침해 주세요.' : 'AI가 사진을 분석하고 있어요. 끝나면 여기에 바로 보여드릴게요.'}
            </p>
          ) : similar.items.length === 0 ? (
            <NoSimilarNotice
              targetLabel={isFound ? '분실물' : '습득물'}
              onAction={isFound ? undefined : () => navigate('/feed?source=public')}
              actionLabel="경찰청 유실물에서 직접 찾아보기"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6">
              {similar.items.map((it) => <ItemCard key={it.id} item={it} />)}
            </div>
          )}
        </section>
      )}

      {askOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => !asking && setAskOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className="text-base font-bold text-slate-900">{item.institution ? `${item.institution.name}에 문의할까요?` : '작성자에게 문의할까요?'}</p>
            <p className="text-sm text-slate-500 mt-1 truncate">“{item.title}” 글로 대화를 시작해요.</p>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 text-[13px] text-amber-800 flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p>전화번호, 계좌번호 같은 개인정보는 신중하게 공유하세요. 물건은 가능하면 보관 장소나 사람이 많은 곳에서 주고받으세요.</p>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" disabled={asking} onClick={() => setAskOpen(false)}>취소</Button>
              <Button className="flex-1" loading={asking} onClick={startChat}>대화 시작</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
