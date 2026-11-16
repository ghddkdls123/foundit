import { toast } from './toast';

// 모든 백엔드 호출은 이 파일을 거칩니다.
// 주소는 항상 /api/... 로 쓰고, 실제 서버 주소는 vite.config.js 의 proxy 가 정합니다.

const TOKEN_KEY = 'accessToken';
const NAME_KEY = 'userName';
const EMAIL_KEY = 'userEmail';
const EMAIL_VERIFIED_KEY = 'emailVerified';
const NAME_BY_EMAIL_KEY = 'nameByEmail'; // 가입할 때 입력한 이름을 이메일별로 기억 (로그인 응답에 이름이 없어서)

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* 저장 불가 환경은 무시 */
  }
}

export function getToken() {
  return safeGet(TOKEN_KEY) || '';
}

/** JWT 안의 값 (sub = 사용자 id, mfa = MFA 인증 여부). 서명 검증은 서버가 합니다. */
export function getTokenPayload() {
  const token = getToken();
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(part)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  const p = getTokenPayload();
  if (!p) return false;
  if (p.exp && p.exp * 1000 < Date.now()) {
    clearSession();
    return false;
  }
  return true;
}

export function getSession() {
  if (!isLoggedIn()) return null;
  const p = getTokenPayload();
  return {
    userId: p.sub,
    mfaVerified: p.mfa === true,
    name: safeGet(NAME_KEY) || '',
    email: safeGet(EMAIL_KEY) || '',
    emailVerified: safeGet(EMAIL_VERIFIED_KEY) === 'true',
  };
}

export function saveSession({ accessToken, email, name, emailVerified }) {
  if (accessToken) safeSet(TOKEN_KEY, accessToken);
  if (email !== undefined) safeSet(EMAIL_KEY, email);
  if (name !== undefined) safeSet(NAME_KEY, name);
  if (emailVerified !== undefined) safeSet(EMAIL_VERIFIED_KEY, emailVerified ? 'true' : 'false');
  window.dispatchEvent(new Event('session-change'));
}

export function clearSession() {
  [TOKEN_KEY, NAME_KEY, EMAIL_KEY, EMAIL_VERIFIED_KEY].forEach((k) => safeSet(k, null));
  window.dispatchEvent(new Event('session-change'));
}

export function rememberName(email, name) {
  try {
    const map = JSON.parse(safeGet(NAME_BY_EMAIL_KEY) || '{}');
    map[email.trim().toLowerCase()] = name;
    safeSet(NAME_BY_EMAIL_KEY, JSON.stringify(map));
  } catch {
    /* 무시 */
  }
}

export function recallName(email) {
  try {
    const map = JSON.parse(safeGet(NAME_BY_EMAIL_KEY) || '{}');
    return map[email.trim().toLowerCase()] || '';
  } catch {
    return '';
  }
}

function toMessage(data, status) {
  const m = data && data.message;
  if (Array.isArray(m)) return m.join('\n');
  if (typeof m === 'string' && m) return m;
  if (status === 401) return '로그인이 필요합니다.';
  if (status === 403) return '권한이 없습니다.';
  if (status === 429) return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.';
  if (status >= 500) return '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.';
  return '요청을 처리하지 못했습니다.';
}

/**
 * api('/items', { query: {...} })
 * api('/items', { method: 'POST', body: {...} })
 * api('/items/search-by-image', { method: 'POST', form: formData })
 */
export async function api(path, { method = 'GET', body, form, query, auth = true } = {}) {
  let url = `/api${path}`;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers = {};
  const token = auth ? getToken() : '';
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    // 토큰이 만료됐으면 세션을 정리 (로그인 요청 자체의 401은 제외)
    if (res.status === 401 && token && !path.startsWith('/auth/')) {
      clearSession();
      toast.error('로그인이 만료되었어요. 다시 로그인해주세요.');
    }
    throw new ApiError(res.status, toMessage(data, res.status));
  }
  return data;
}

/** 게시글 사진 올리기: 업로드 URL 발급 → S3 PUT → 등록 */
export async function uploadItemImage(itemId, file) {
  const { uploadUrl, key } = await api(`/items/${itemId}/images/upload-url`, {
    method: 'POST',
    body: { filename: file.name || 'photo.jpg', contentType: file.type || 'image/jpeg' },
  });
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!put.ok) throw new ApiError(put.status, '사진 업로드에 실패했습니다.');
  await api(`/items/${itemId}/images`, { method: 'POST', body: { key } });
}
