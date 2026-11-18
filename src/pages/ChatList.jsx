import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, MessageCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { onChatMessage, onChatReconnect, onConversationRead, onMessageDeleted, onMessageUpdated, refreshUnread } from '../lib/chat';
import { STATUS_LABEL, TYPE_LABEL } from '../lib/constants';
import { timeAgo } from '../lib/format';

/** 내 대화 목록 */
export default function ChatList() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, items: [], error: '' });

  const load = useCallback(() => {
    return api('/conversations')
      .then((d) => setState({ loading: false, items: Array.isArray(d) ? d : d?.items ?? [], error: '' }))
      .catch((e) => setState({ loading: false, items: [], error: e.message }));
  }, []);

  useEffect(() => {
    load();
    refreshUnread();
    // 새 메시지가 오면 목록(마지막 메시지, 안 읽은 수, 순서)을 다시 불러옴
    const offMsg = onChatMessage(() => load());
    const offRe = onChatReconnect(() => load());
    const offRead = onConversationRead(() => { load(); refreshUnread(); });
    const offUpdated = onMessageUpdated(() => load());
    const offDeleted = onMessageDeleted(() => load());
    return () => {
      offMsg();
      offRe();
      offRead();
      offUpdated();
      offDeleted();
    };
  }, [load]);

  return (
    <Layout title="채팅" width="narrow">
      {state.loading ? (
        <Spinner />
      ) : state.error ? (
        <ErrorBox message={state.error} onRetry={load} />
      ) : state.items.length === 0 ? (
        <Empty
          title="아직 대화가 없어요"
          desc='게시글 상세 화면에서 "작성자에게 문의하기"를 누르면 여기에서 대화를 이어갈 수 있어요.'
          action={<button type="button" onClick={() => navigate('/feed')} className="text-sm font-semibold text-blue-600">게시물 보러 가기 →</button>}
        />
      ) : (
        <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {state.items.map((c) => (
            <li key={c.conversationId}>
              <button
                type="button"
                onClick={() => navigate(`/chats/${c.conversationId}`)}
                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 text-left"
              >
                <span className="w-12 h-12 rounded-md bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
                  {c.item?.thumbnailUrl ? <img src={c.item.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-5 h-5" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 truncate">{c.counterpartName || '상대방'}</span>
                    <span className="ml-auto text-[11px] text-slate-400 shrink-0">{timeAgo(c.lastMessageAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 truncate">
                    {c.item?.type && <span className={c.item.type === 'FOUND' ? 'text-blue-600' : 'text-amber-600'}>{TYPE_LABEL[c.item.type]}</span>}
                    {c.item?.status && c.item.status !== 'OPEN' && <span>· {STATUS_LABEL[c.item.status] ?? c.item.status}</span>}
                    <span className="truncate">· {c.item?.title ?? '삭제된 글'}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className={`flex-1 text-[13px] truncate ${c.unreadCount > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      {c.lastMessage?.content ?? (typeof c.lastMessage === 'string' ? c.lastMessage : '아직 메시지가 없어요')}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-slate-400 flex items-center gap-1">
        <MessageCircle className="w-3.5 h-3.5" /> 게시글을 삭제하면 그 글의 대화도 함께 지워져요.
      </p>
    </Layout>
  );
}
