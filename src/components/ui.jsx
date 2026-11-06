import { Loader2 } from 'lucide-react';
import { CATEGORIES } from '../lib/constants';

export function CategoryChips({ value, onChange, withAll = true, className = '' }) {
  const list = withAll ? ['전체', ...CATEGORIES] : CATEGORIES;
  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 ${className}`}>
      {list.map((c) => {
        const v = c === '전체' ? '' : c;
        const active = value === v;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
              active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`grid p-1 bg-slate-200/70 rounded-xl ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`py-2 rounded-lg text-xs font-bold transition ${
            value === o.value ? `bg-white shadow-sm ${o.activeClass || 'text-slate-900'}` : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label = '불러오는 중...' }) {
  return (
    <div className="py-16 flex flex-col items-center gap-2 text-xs text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ title, desc, action }) {
  return (
    <div className="py-14 px-6 text-center bg-white rounded-2xl border border-slate-200">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {desc && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="py-10 px-6 text-center bg-rose-50 rounded-2xl border border-rose-100">
      <p className="text-xs text-rose-600 whitespace-pre-line">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-xs font-semibold text-rose-700 underline">
          다시 시도
        </button>
      )}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition';

export function Button({ variant = 'primary', className = '', loading, children, ...props }) {
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20',
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold text-sm rounded-xl py-3 px-4 transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
