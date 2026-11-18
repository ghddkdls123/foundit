import { io } from 'socket.io-client';
import { api, clearSession, getToken, isLoggedIn } from './api';
import { toast } from './toast';

/*
 * 실시간 채팅 연결 (Socket.IO) + 안 읽은 메시지 수
 * - 로그인 상태가 바뀌면(session-change) 자동으로 연결/해제합니다.
 *   로그인 → 연결, 로그아웃·탈퇴·토큰 만료 → socket.disconnect()
 * - 화면에서는 onChatMessage / onChatReconnect / useUnread 를 씁니다.
 */

let socket = null;
let usedToken = '';
let myUserId = null;

const messageListeners = new Set();
const readListeners = new Set();
const updatedListeners = new Set();
const deletedListeners = new Set();
const reconnectListeners = new Set();
const unreadListeners = new Set();
let unread = 0;
let activeConversationId = null; // 지금 화면에 열려 있는 대화방

function setUnread(n) {
  unread = Math.max(0, n || 0);
  unreadListeners.forEach((fn) => fn(unread));
}

export function getUnread() {
  return unread;
}
export function subscribeUnread(fn) {
  unreadListeners.add(fn);
  return () => unreadListeners.delete(fn);
}

/** 서버에서 안 읽은 수 다시 불러오기 (헤더 벨/탭 배지) */
export function refreshUnread() {
  if (!isLoggedIn()) return Promise.resolve(setUnread(0));
  return api('/conversations/unread-count')
    .then((d) => setUnread(d?.unread ?? 0))
    .catch(() => {});
}

export function getMyUserId() {
  return myUserId;
}

/** 메시지 받기. 반환값을 호출하면 구독 해제 */
export function onChatMessage(fn) {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}

export function onConversationRead(fn) {
  readListeners.add(fn);
  return () => readListeners.delete(fn);
}
export function onMessageUpdated(fn) {
  updatedListeners.add(fn);
  return () => updatedListeners.delete(fn);
}
export function onMessageDeleted(fn) {
  deletedListeners.add(fn);
  return () => deletedListeners.delete(fn);
}

/** 재연결될 때마다 (빠진 메시지 다시 받기용) */
export function onChatReconnect(fn) {
  reconnectListeners.add(fn);
  return () => reconnectListeners.delete(fn);
}

/** 대화방 화면이 열려 있는 동안 그 방 번호를 알려줌 (그 방 메시지는 배지에 안 더함) */
export function setActiveConversation(id) {
  activeConversationId = id == null ? null : String(id);
}

function connect() {
  const token = getToken();
  if (!token) return;
  if (socket && usedToken === token) {
    if (!socket.connected) socket.connect();
    return;
  }
  if (socket) {
    socket.auth = { token };
    usedToken = token;
    socket.disconnect().connect();
    return;
  }

  usedToken = token;
  socket = io('/', {
    path: '/api/socket.io', // 꼭 이 경로
    auth: { token }, // Bearer 없이 토큰만
    transports: ['websocket', 'polling'],
  });

  socket.on('ready', ({ userId }) => {
    myUserId = userId;
    refreshUnread();
  });

  socket.on('message:new', (m) => {
    if (!m) return;
    const mine = myUserId != null && String(m.senderId) === String(myUserId);
    const viewing = activeConversationId != null && String(m.conversationId) === activeConversationId;
    // 내 메시지(다른 탭에서 보낸 것 포함)나 지금 보고 있는 방이 아니면 배지 +1
    if (!mine && !viewing) setUnread(unread + 1);
    messageListeners.forEach((fn) => fn(m));
  });

  socket.on('conversation:read', (event) => {
    if (!event) return;
    readListeners.forEach((fn) => fn(event));
  });
  socket.on('message:updated', (event) => {
    if (!event) return;
    updatedListeners.forEach((fn) => fn(event));
  });
  socket.on('message:deleted', (event) => {
    if (!event) return;
    deletedListeners.forEach((fn) => fn(event));
  });

  socket.on('auth_error', () => {
    // 토큰 만료(1시간) 등. 아직 유효한 새 토큰이 있으면 그걸로 다시 연결, 아니면 로그아웃 처리
    const latest = getToken();
    if (isLoggedIn() && latest && latest !== usedToken) {
      connect();
      return;
    }
    if (!isLoggedIn()) return; // isLoggedIn 이 이미 세션을 정리함
    clearSession();
    toast.error('로그인이 만료되었어요. 다시 로그인해주세요.');
  });

  socket.on('connect', () => {
    // 처음 연결 + 재연결 때마다: 열려 있는 대화방은 빠진 메시지를 받아감
    reconnectListeners.forEach((fn) => fn());
  });
}

function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  usedToken = '';
  myUserId = null;
  setUnread(0);
}

function sync() {
  if (isLoggedIn()) {
    if (getToken() !== usedToken || !socket) connect();
  } else {
    disconnect();
  }
}

let started = false;
/** 앱 시작할 때 한 번 호출 (App.jsx) */
export function startChat() {
  if (started) return;
  started = true;
  window.addEventListener('session-change', sync);
  // 다른 탭에서 로그인/로그아웃한 경우
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === 'accessToken') sync();
  });
  sync();
}
