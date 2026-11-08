import { useEffect, useState } from 'react';
import { subscribeToast } from '../lib/toast';

const STYLE = {
  info: 'bg-slate-900 text-white',
  success: 'bg-slate-900 text-white',
  error: 'bg-rose-600 text-white',
};

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(
    () =>
      subscribeToast((t) => {
        // 같은 문구가 이미 떠 있으면 또 띄우지 않음 (요청 여러 개가 동시에 실패할 때)
        setItems((prev) => (prev.some((x) => x.message === t.message) ? prev : [...prev.slice(-2), t])); // 최대 3개
        setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.kind === 'error' ? 4500 : 2500);
      }),
    [],
  );

  return (
    <div className="fixed z-[100] inset-x-0 bottom-20 md:bottom-8 flex flex-col items-center gap-2 pointer-events-none px-4" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto max-w-md px-4 py-2.5 rounded-md shadow-lg text-sm font-medium whitespace-pre-line ${STYLE[t.kind]}`}>
          {t.kind === 'success' && <span className="text-emerald-400 mr-1.5">✓</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
