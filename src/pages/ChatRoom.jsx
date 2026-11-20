import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, ImageOff, Loader2, Pencil, RotateCcw, Send, ShieldAlert, Trash2, X } from 'lucide-react';
import Layout from '../components/Layout';
import { ErrorBox, Spinner } from '../components/ui';
import { api, getSession } from '../lib/api';
import { getMyUserId, onChatMessage, onChatReconnect, onConversationRead, onMessageDeleted, onMessageUpdated, refreshUnread, setActiveConversation } from '../lib/chat';
import { STATUS_LABEL, TYPE_LABEL } from '../lib/constants';
import { toast } from '../lib/toast';

const PAGE = 50;
const MAX_LEN = 1000;

const toList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.messages ?? []);

/** 오래된 순으로 정렬 + 같은 id 는 한 번만 */
function merge(prev, incoming) {
  const map = new Map(prev.map((m) => [String(m.id), m]));
  incoming.forEach((m) => {
    if (!m) return;
    const key = String(m.id);
    const old = map.get(key);
    map.set(key, old?.read === true ? { ...old, ...m, read: true } : m);
  });
  return [...map.values()].sort((a, b) => {
    const t = new Date(a.createdAt) - new Date(b.createdAt);
    if (t) return t;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

function timeLabel(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}
function dayLabel(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null); // 목록에서 찾은 이 대화방 정보 (상대 이름, 글)
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [failedMessages, setFailedMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [busyMessageId, setBusyMessageId] = useState(null);
  const [actionsMessageId, setActionsMessageId] = useState(null);

  const listRef = useRef(null);
  const messagesRef = useRef(messages);
  const holdTimerRef = useRef(null);
  messagesRef.current = messages;
  const stickToBottom = useRef(true); // 맨 아래를 보고 있으면 새 메시지 때 자동으로 내려감
  const keepScroll = useRef(null); // 예전 메시지를 위에 붙일 때 보던 위치 유지

  useEffect(() => () => clearTimeout(holdTimerRef.current), []);

  const myId = () => getMyUserId() ?? getSession()?.userId;
  // API의 isMine 판정을 우선 사용, 이 값이 없는 소켓 메시지는 senderId로 구분
  const isMine = (m) => {
    if (typeof m?.isMine === 'boolean') return m.isMine;
    const userId = myId();
    return userId != null && String(m?.senderId) === String(userId);
  };

  const markRead = useCallback(() => {
    api(`/conversations/${id}/read`, { method: 'POST' })
      .then(() => refreshUnread())
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setMessages([]);
    setFailedMessages([]);
    setActiveConversation(id);
    stickToBottom.current = true;

    api(`/conversations/${id}/messages`)
      .then((d) => {
        if (!alive) return;
        const list = toList(d);
        setMessages(merge([], list));
        setHasMore(list.length >= PAGE);
        markRead();
        refreshUnread();
      })
      .catch((e) => alive && setError(e.status === 404 ? '대화방을 찾을 수 없어요. 글이 삭제되었을 수 있어요.' : e.message))
      .finally(() => alive && setLoading(false));

    api('/conversations')
      .then((d) => alive && setInfo(toList(d).find((c) => String(c.conversationId) === String(id)) ?? null))
      .catch(() => {});

    return () => {
      alive = false;
      setActiveConversation(null);
    };
  }, [id, markRead]);

  // 실시간 새 메시지 + 재연결 때 빠진 메시지
  useEffect(() => {
    const offMsg = onChatMessage((m) => {
      if (String(m.conversationId) !== String(id)) return;
      setMessages((prev) => merge(prev, [m]));
      if (!isMine(m)) markRead();
    });
    const offRead = onConversationRead((event) => {
      if (String(event.conversationId) !== String(id)) return;
      const mine = myId();
      if (mine != null && String(event.readerId) === String(mine)) {
        refreshUnread();
      } else if (event.readAt) {
        const readAt = new Date(event.readAt).getTime();
        if (Number.isFinite(readAt)) {
          setMessages((prev) => prev.map((m) => {
            const createdAt = new Date(m.createdAt).getTime();
            return isMine(m) && m.read === false && createdAt <= readAt ? { ...m, read: true } : m;
          }));
        }
      }
    });
    const offUpdated = onMessageUpdated((event) => {
      if (String(event.conversationId) !== String(id)) return;
      setMessages((prev) => prev.map((m) => String(m.id) === String(event.id) ? { ...m, ...event } : m));
    });
    const offDeleted = onMessageDeleted((event) => {
      if (String(event.conversationId) !== String(id)) return;
      setMessages((prev) => prev.map((m) => String(m.id) === String(event.id) ? { ...m, ...event, content: null, deleted: true } : m));
    });
    const offRe = onChatReconnect(() => {
      const list = messagesRef.current;
      const last = list[list.length - 1];
      if (!last) return;
      api(`/conversations/${id}/messages`, { query: { after: last.id } })
        .then((d) => {
          const got = toList(d);
          if (got.length) {
            setMessages((prev) => merge(prev, got));
            markRead();
          }
        })
        .catch(() => {});
    });
    return () => {
      offMsg();
      offRead();
      offUpdated();
      offDeleted();
      offRe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, markRead]);

  const saveEdit = async (m) => {
    const content = editText.trim();
    if (!content || content.length > MAX_LEN || busyMessageId != null) return;
    setBusyMessageId(m.id);
    try {
      const updated = await api(`/conversations/${id}/messages/${m.id}`, { method: 'PATCH', body: { content } });
      setMessages((prev) => prev.map((x) => String(x.id) === String(m.id) ? { ...x, ...updated, content, edited: true } : x));
      setEditingId(null);
      setEditText('');
    } catch (e) {
      toast.error(e.status === 429 ? '잠시 후 다시 시도해주세요.' : e.message);
    } finally {
      setBusyMessageId(null);
    }
  };

  const deleteMessage = async (m) => {
    if (busyMessageId != null) return;
    setBusyMessageId(m.id);
    try {
      await api(`/conversations/${id}/messages/${m.id}`, { method: 'DELETE' });
      setMessages((prev) => prev.map((x) => String(x.id) === String(m.id) ? { ...x, content: null, deleted: true } : x));
    } catch (e) {
      toast.error(e.status === 429 ? '잠시 후 다시 시도해주세요.' : e.message);
    } finally {
      setBusyMessageId(null);
    }
  };

  const startMessageHold = (event, messageId) => {
    clearTimeout(holdTimerRef.current);
    if (event.pointerType !== 'touch') {
      setActionsMessageId((current) => current === messageId ? null : messageId);
      return;
    }
    setActionsMessageId(null);
    holdTimerRef.current = setTimeout(() => setActionsMessageId(messageId), 500);
  };
  const cancelMessageHold = () => clearTimeout(holdTimerRef.current);

  // 스크롤 위치 맞추기
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (keepScroll.current != null) {
      el.scrollTop = el.scrollHeight - keepScroll.current;
      keepScroll.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, failedMessages, loading]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasMore && !loadingOlder) loadOlder();
  };

  const loadOlder = async () => {
    const first = messagesRef.current[0];
    if (!first) return;
    setLoadingOlder(true);
    try {
      const got = toList(await api(`/conversations/${id}/messages`, { query: { before: first.id } }));
      keepScroll.current = listRef.current ? listRef.current.scrollHeight - listRef.current.scrollTop : null;
      setMessages((prev) => merge(prev, got));
      setHasMore(got.length >= PAGE);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (rawContent = text, retryId = null) => {
    const content = rawContent.trim();
    if (!content || sending) return;
    if (content.length > MAX_LEN) return toast.error(`메시지는 ${MAX_LEN}자까지 보낼 수 있어요.`);
    setSending(true);
    stickToBottom.current = true;
    try {
      const m = await api(`/conversations/${id}/messages`, { method: 'POST', body: { content } });
      if (m?.id == null) throw new Error('메시지 전송 결과를 확인하지 못했습니다. 다시 시도해주세요.');
      setMessages((prev) => merge(prev, [m])); // 소켓으로 같은 id 가 또 와도 한 번만 들어감
      if (retryId) setFailedMessages((prev) => prev.filter((failed) => failed.id !== retryId));
      setText((current) => current.trim() === content ? '' : current);
    } catch (e) {
      if (!retryId) {
        setFailedMessages((prev) => [...prev, { id: `failed-${Date.now()}-${Math.random()}`, content }]);
        setText((current) => current.trim() === content ? '' : current);
      }
      toast.error(e.status === 429 ? '메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 보내주세요.' : e.message);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    // 한글 조합 중 Enter 는 무시 (마지막 글자가 두 번 보내지는 문제 방지)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  if (loading) return <Layout back width="narrow"><Spinner /></Layout>;
  if (error) {
    return (
      <Layout back width="narrow">
        <ErrorBox message={error} />
      </Layout>
    );
  }

  const item = info?.item;
  let lastDay = '';

  return (
    <Layout back width="narrow" className="!pb-20 md:!pb-10">
      {/* 상대 + 글 정보 */}
      <div className="border border-slate-200 rounded-t-lg px-4 py-3 flex items-center gap-3">
        <span className="w-10 h-10 rounded-md bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
          {item?.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{info?.counterpartName || '대화'}</p>
          {item && (
            <p className="text-[11px] text-slate-400 truncate">
              <span className={item.type === 'FOUND' ? 'text-blue-600' : 'text-amber-600'}>{TYPE_LABEL[item.type] ?? ''}</span>
              {item.status && ` · ${STATUS_LABEL[item.status] ?? item.status}`} · {item.title}
            </p>
          )}
        </div>
        {item?.id != null && (
          <button type="button" onClick={() => navigate(`/feed/${item.id}`)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center shrink-0">
            글 보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 메시지 */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="border-x border-slate-200 bg-slate-50 px-3 py-3 h-[calc(100svh-19rem)] md:h-[calc(100svh-17rem)] min-h-[260px] overflow-y-auto"
      >
        {loadingOlder && (
          <p className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 예전 메시지 불러오는 중
          </p>
        )}
        {!hasMore && (
          <p className="mb-3 mx-auto max-w-sm rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-[12px] text-amber-800 flex gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-px" />
            전화번호, 계좌번호 같은 개인정보는 신중하게 공유하세요. 물건은 가능하면 사람이 많은 곳이나 보관 장소에서 주고받으세요.
          </p>
        )}
        {messages.length === 0 && failedMessages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">첫 메시지를 보내 보세요.</p>}
        {messages.map((m) => {
          const mine = isMine(m);
          const day = dayLabel(m.createdAt);
          const showDay = day && day !== lastDay;
          lastDay = day || lastDay;
          return (
            <div key={m.id} onPointerDown={() => setActionsMessageId(null)}>
              {showDay && <p className="my-3 text-center text-[11px] text-slate-400">{day}</p>}
              <div className={`mb-1.5 flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                {/* 글자 그대로 표시 (HTML 로 해석하지 않음) */}
                {editingId === m.id ? (
                  <div className="max-w-[75%] min-w-[180px]">
                    <textarea autoFocus rows={2} maxLength={MAX_LEN} value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                    <div className="mt-1 flex justify-end gap-1">
                      <button type="button" onClick={() => { setEditingId(null); setEditText(''); }} className="rounded p-1 text-slate-500" aria-label="수정 취소"><X className="h-4 w-4" /></button>
                      <button type="button" onClick={() => saveEdit(m)} disabled={!editText.trim() || busyMessageId === m.id} className="rounded p-1 text-blue-600 disabled:opacity-40" aria-label="수정 저장"><Check className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : <p
                  onPointerDown={(e) => { if (mine && !m.deleted) { e.stopPropagation(); startMessageHold(e, m.id); } }}
                  onPointerUp={cancelMessageHold}
                  onPointerCancel={cancelMessageHold}
                  onPointerLeave={cancelMessageHold}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                    mine ? (m.deleted ? 'bg-slate-200 text-slate-500 rounded-br-md' : 'bg-blue-600 text-white rounded-br-md select-none') : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                  }`}
                >
                  {m.deleted ? '삭제된 메시지입니다' : m.content}
                  {m.edited && !m.deleted && (
                    <span className={`mt-1 block text-right text-[10px] leading-none ${mine ? 'text-white/70' : 'text-slate-400'}`}>수정됨</span>
                  )}
                </p>}
                <span className="flex shrink-0 flex-col items-end text-right text-[10px] text-slate-400">
                  {mine && m.read === false && !m.deleted && <span className="font-bold text-amber-500">1</span>}
                  {timeLabel(m.createdAt)}
                </span>
              </div>
              {mine && !m.deleted && editingId !== m.id && actionsMessageId === m.id && <div onPointerDown={(e) => e.stopPropagation()} className="-mt-1 mb-2 mr-8 flex justify-end gap-2">
                <button type="button" onClick={() => { setEditingId(m.id); setEditText(m.content ?? ''); }} className="text-[10px] text-slate-400 hover:text-slate-700" aria-label="메시지 수정"><Pencil className="inline h-3 w-3" /> 수정</button>
                <button type="button" onClick={() => deleteMessage(m)} disabled={busyMessageId === m.id} className="text-[10px] text-slate-400 hover:text-rose-600 disabled:opacity-40" aria-label="메시지 삭제"><Trash2 className="inline h-3 w-3" /> 삭제</button>
              </div>}
            </div>
          );
        })}
        {failedMessages.map((failed) => (
          <div key={failed.id} className="mb-3 flex flex-col items-end gap-1">
            <p className="max-w-[75%] rounded-2xl rounded-br-md bg-rose-50 px-3 py-2 text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words border border-rose-200">
              {failed.content}
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <button type="button" onClick={() => send(failed.content, failed.id)} disabled={sending} className="rounded p-0.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="다시 보내기" title="다시 보내기">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </button>
              <span className="text-rose-600">전송 실패</span>
            </div>
          </div>
        ))}
      </div>

      {/* 입력 */}
      <div className="border border-slate-200 rounded-b-lg p-2 flex items-end gap-2 bg-white">
        <div className="flex-1 min-w-0">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_LEN}
            placeholder="메시지 입력 (Shift+Enter 줄바꿈)"
            className="w-full max-h-32 resize-none px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {text.length > MAX_LEN - 100 && <p className="px-3 text-[11px] text-slate-400">{text.length} / {MAX_LEN}</p>}
        </div>
        <button
          type="button"
          onClick={() => send()}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          aria-label="보내기"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </Layout>
  );
}
