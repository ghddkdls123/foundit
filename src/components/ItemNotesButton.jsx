import { useEffect, useRef, useState } from 'react';
import { Edit3, MessageSquareText, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { fullDate } from '../lib/format';
import { Button, Empty, ErrorBox, Spinner } from './ui';
import { toast } from '../lib/toast';

export default function ItemNotesButton({ item, className = '', compact = false }) {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState({ loading: false, error: '', private: [], institution: [], canWriteInstitution: false });
  const [hasNotes, setHasNotes] = useState(null);
  const [scope, setScope] = useState('PRIVATE');
  const [reload, setReload] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let alive = true;
    let observer;
    const checkForNotes = () => {
      api(`/items/${item.id}/notes`)
        .then((data) => alive && setHasNotes(
          (Array.isArray(data?.private) && data.private.length > 0) ||
          (Array.isArray(data?.institution) && data.institution.length > 0),
        ))
        .catch(() => {});
    };
    const element = buttonRef.current;
    if (element && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          checkForNotes();
        }
      }, { rootMargin: '120px' });
      observer.observe(element);
    } else {
      checkForNotes();
    }
    return () => {
      alive = false;
      observer?.disconnect();
    };
  }, [item.id]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setNotes({ loading: true, error: '', private: [], institution: [], canWriteInstitution: false });
    api(`/items/${item.id}/notes`)
      .then((data) => {
        if (!alive) return;
        const canWriteInstitution = data?.canWriteInstitution === true;
        setNotes({
          loading: false,
          error: '',
          private: Array.isArray(data?.private) ? data.private : [],
          institution: Array.isArray(data?.institution) ? data.institution : [],
          canWriteInstitution,
        });
        setHasNotes((Array.isArray(data?.private) && data.private.length > 0) || (Array.isArray(data?.institution) && data.institution.length > 0));
        setScope((current) => current === 'INSTITUTION' && canWriteInstitution ? current : canWriteInstitution ? 'INSTITUTION' : 'PRIVATE');
      })
      .catch((error) => alive && setNotes((current) => ({ ...current, loading: false, error: error.message })));
    return () => { alive = false; };
  }, [open, item.id, reload]);

  const entries = scope === 'INSTITUTION' ? notes.institution : notes.private;

  const saveNote = async (event) => {
    event.preventDefault();
    const content = noteText.trim();
    if (!content || content.length > 1000 || saving) return;
    setSaving(true);
    try {
      const targetScope = editingNote?.scope || scope;
      await api(`/items/${item.id}/notes`, { method: 'POST', body: { content, scope: targetScope } });
      if (editingNote) {
        try {
          await api(`/items/${item.id}/notes/${editingNote.id}`, { method: 'DELETE' });
        } catch {
          setNoteText('');
          setEditingNote(null);
          setReload((value) => value + 1);
          toast.error('수정 내용은 저장했지만 이전 메모를 지우지 못했어요. 메모 목록을 확인해주세요.');
          return;
        }
      }
      setNoteText('');
      setEditingNote(null);
      setReload((value) => value + 1);
      toast.success(editingNote ? '메모를 수정했어요' : '메모를 저장했어요');
    } catch (error) {
      toast.error(error.status === 429 ? '메모를 너무 자주 작성했어요. 잠시 후 다시 시도해주세요.' : error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (note) => {
    if (note.isMine !== true || deletingId != null) return;
    setDeletingId(note.id);
    try {
      await api(`/items/${item.id}/notes/${note.id}`, { method: 'DELETE' });
      if (String(editingNote?.id) === String(note.id)) {
        setEditingNote(null);
        setNoteText('');
      }
      setReload((value) => value + 1);
      toast.success('메모를 삭제했어요');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return <>
    <button ref={buttonRef} type="button" onClick={() => { setEditingNote(null); setNoteText(''); setScope('PRIVATE'); setOpen(true); }} aria-label={`${item.title || '게시글'} 메모 보기`} title="게시글 메모 보기" className={`${compact ? 'h-8 w-8' : 'mt-2 h-9 w-9'} inline-flex shrink-0 items-center justify-center rounded-md border transition ${hasNotes ? 'border-blue-200 bg-blue-50/60 text-blue-600 hover:border-blue-300 hover:bg-blue-50' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'} ${className}`}>
      <MessageSquareText className="h-4 w-4" />
    </button>

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby={`item-notes-title-${item.id}`} onClick={(event) => event.stopPropagation()} className="flex max-h-[85svh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0"><h2 id={`item-notes-title-${item.id}`} className="text-base font-bold text-slate-900">게시글 메모</h2><p className="mt-1 truncate text-xs text-slate-500">{item.title || '제목 없음'}</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="메모 창 닫기" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex gap-2 border-b border-slate-200 px-5 pt-3">
          {notes.canWriteInstitution && <button type="button" disabled={!!editingNote} onClick={() => setScope('INSTITUTION')} className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold ${scope === 'INSTITUTION' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400'} disabled:opacity-40`}>기관 메모</button>}
          <button type="button" disabled={!!editingNote} onClick={() => setScope('PRIVATE')} className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold ${scope === 'PRIVATE' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400'} disabled:opacity-40`}>내 메모</button>
        </div>
        <div className="min-h-32 overflow-y-auto p-5">
          {notes.loading ? <Spinner label="메모를 불러오는 중..." /> : notes.error ? <ErrorBox message={notes.error} onRetry={() => setReload((value) => value + 1)} /> : entries.length ? (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {entries.map((note) => <li key={note.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] text-slate-400">{scope === 'INSTITUTION' && <><span className="font-semibold text-slate-600">{note.authorName || '기관 관리자'}</span> · </>}{note.createdAt ? fullDate(note.createdAt) : ''}</p>
                  {note.isMine === true && <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="메모 수정" title="메모 수정" disabled={saving || deletingId != null} onClick={() => { setEditingNote({ ...note, scope }); setScope(scope); setNoteText(note.content || ''); }} className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="메모 삭제" title="메모 삭제" disabled={saving || deletingId === note.id} onClick={() => deleteNote(note)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{note.content}</p>
              </li>)}
            </ul>
          ) : <Empty title={scope === 'INSTITUTION' ? '기관 메모가 없어요' : '내 메모가 없어요'} />}
          {!notes.loading && !notes.error && <form onSubmit={saveNote} className="mt-4">
            {editingNote && <p className="mb-1 text-xs font-semibold text-blue-700">메모 수정 중</p>}
            <textarea rows={3} maxLength={1000} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={scope === 'INSTITUTION' ? '기관 동료와 공유할 처리 기록을 작성하세요.' : '나만 볼 수 있는 메모를 작성하세요.'} className="w-full resize-y rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15" />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">{noteText.length} / 1000자</span>
              <div className="flex gap-2">
                {editingNote && <Button type="button" variant="secondary" className="h-9 px-3 text-xs" disabled={saving} onClick={() => { setEditingNote(null); setNoteText(''); }}>취소</Button>}
                <Button type="submit" className="h-9 px-3 text-xs" disabled={!noteText.trim() || saving} loading={saving}>{editingNote ? '수정 저장' : '메모 추가'}</Button>
              </div>
            </div>
          </form>}
        </div>
      </section>
    </div>}
  </>;
}
