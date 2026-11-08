// 화면 아래에 잠깐 떴다 사라지는 알림
// 사용: toast('로그인되었습니다') / toast.error('실패했어요')
let nextId = 1;
const listeners = new Set();

function emit(message, kind) {
  if (!message) return;
  const t = { id: nextId++, message, kind };
  listeners.forEach((fn) => fn(t));
}

export function toast(message) {
  emit(message, 'info');
}
toast.success = (message) => emit(message, 'success');
toast.error = (message) => emit(message, 'error');

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
