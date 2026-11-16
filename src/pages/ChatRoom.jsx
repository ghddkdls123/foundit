import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ImageOff, Loader2, Send, ShieldAlert } from 'lucide-react';
import Layout from '../components/Layout';
import { ErrorBox, Spinner } from '../components/ui';
import { api, getSession } from '../lib/api';
import { getMyUserId, onChatMessage, onChatReconnect, refreshUnread, setActiveConversation } from '../lib/chat';
import { STATUS_LABEL, TYPE_LABEL } from '../lib/constants';
import { toast } from '../lib/toast';

const PAGE = 50;
const MAX_LEN = 1000;

const toList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.messages ?? []);

/** 오래된 순으로 정렬 + 같은 id 는 한 번만 */
function merge(prev, incoming) {
  const map = new Map(prev.map((m) => [String(m.id), m]));
  incoming.forEach((m) => m && map.set(String(m.id), m));
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

  const listRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const stickToBottom = useRef(true); // 맨 아래를 보고 있으면 새 메시지 때 자동으로 내려감
  const keepScroll = useRef(null); // 예전 메시지를 위에 붙일 때 보던 위치 유지

  const myId = () => getMyUserId() ?? getSession()?.userId;
  const isMine = (m) => myId() != null && String(m.senderId) === String(myId());

  const markRead = useCallback(() => {
    api(`/conversations/${id}/read`, { method: 'POST' })
      .then(() => refreshUnread())
      .catch(() => {});
  }, [id]);

  // 처음 불러오기 (GET 하면 읽음 처리도 됨)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setMessages([]);
    setActiveConversation(id);
    stickToBottom.current = true;

    api(`/conversations/${id}/messages`)
      .then((d) => {
        if (!alive) return;
        const list = toList(d);
        setMessages(merge([], list));
        setHasMore(list.length >= PAGE);
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
  }, [id]);

  // 실시간 새 메시지 + 재연결 때 빠진 메시지
  useEffect(() => {
    const offMsg = onChatMessage((m) => {
      if (String(m.conversationId) !== String(id)) return;
      setMessages((prev) => merge(prev, [m]));
      if (!isMine(m)) markRead();
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
      offRe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, markRead]);

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
  }, [messages, loading]);

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

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    if (content.length > MAX_LEN) return toast.error(`메시지는 ${MAX_LEN}자까지 보낼 수 있어요.`);
    setSending(true);
    stickToBottom.current = true;
    try {
      const m = await api(`/conversations/${id}/messages`, { method: 'POST', body: { content } });
      if (m?.id != null) setMessages((prev) => merge(prev, [m])); // 소켓으로 같은 id 가 또 와도 한 번만 들어감
      setText('');
    } catch (e) {
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
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">첫 메시지를 보내 보세요.</p>}
        {messages.map((m) => {
          const mine = isMine(m);
          const day = dayLabel(m.createdAt);
          const showDay = day && day !== lastDay;
          lastDay = day || lastDay;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] text-slate-400">{day}</p>}
              <div className={`mb-1.5 flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                {/* 글자 그대로 표시 (HTML 로 해석하지 않음) */}
                <p
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                    mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                  }`}
                >
                  {m.content}
                </p>
                <span className="text-[10px] text-slate-400 shrink-0">{timeLabel(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
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
          onClick={send}
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
