import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { CATEGORIES, FEED_REGIONS, REGIONS } from '../lib/constants';

export function CategoryChips({ value, onChange, withAll = true, className = '' }) {
  const list = withAll ? ['전체', ...CATEGORIES] : CATEGORIES;
  return (
    <div className={`flex gap-1.5 overflow-x-auto no-scrollbar ${className}`}>
      {list.map((c) => {
        const v = c === '전체' ? '' : c;
        const active = value === v;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(v)}
            className={`h-8 px-3 rounded-md text-[13px] whitespace-nowrap border transition ${
              active ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

export function RegionChips({ value, onChange, includeOverseas = false, className = '' }) {
  const regions = includeOverseas ? FEED_REGIONS : REGIONS;
  const list = ['전체', ...regions];
  return (
    <div className={`flex gap-1.5 overflow-x-auto no-scrollbar ${className}`} aria-label="지역 필터">
      {list.map((name) => {
        const region = name === '전체' ? '' : name;
        const active = value === region;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(region)}
            className={`h-8 px-3 rounded-md text-[13px] whitespace-nowrap border transition ${
              active ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

export function RegionFilterGroup({ value, onChange, includeOverseas = false, showTitle = false, className = '' }) {
  const regions = includeOverseas ? FEED_REGIONS : REGIONS;
  const [open, setOpen] = useState(false);
  const selected = regions.includes(value) ? value : '';
  return (
    <div className={`w-full max-w-[220px] ${className}`}>
      {showTitle && <p className="mb-2 text-xs font-medium text-slate-400">해당 지역</p>}
      <div className="relative">
      <button type="button" aria-label="지역 필터" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-[13px] text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100">
        <span className={selected ? '' : 'text-slate-400'}>{selected || '지역 선택'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto no-scrollbar rounded-lg border border-slate-200 bg-white p-1 shadow-lg" role="listbox" aria-label="지역 선택">
          <button type="button" role="option" aria-selected={!selected} onClick={() => { onChange(''); setOpen(false); }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 ${!selected ? 'font-semibold text-blue-700' : 'text-slate-700'}`}>
            전체 지역 {!selected && <Check className="h-4 w-4" />}
          </button>
          {regions.map((region) => (
            <button key={region} type="button" role="option" aria-selected={selected === region} onClick={() => { onChange(region); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 ${selected === region ? 'font-semibold text-blue-700' : 'text-slate-700'}`}>
              {region} {selected === region && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, placeholder = '전체', className = '' }) {
  return (
    <label className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <span className="w-[4.5rem] shrink-0 text-sm font-semibold text-slate-800">{label}</span>
      <span className="relative min-w-0 flex-1">
        <select value={value || ''} onChange={(event) => onChange(event.target.value)} aria-label={label}
          className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
      </span>
    </label>
  );
}

/** 밑줄 탭 */
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-5 border-b border-slate-200 ${className}`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`-mb-px pb-2.5 text-sm font-semibold border-b-2 transition ${
              active ? `${o.activeClass || 'text-slate-900'} border-current` : 'text-slate-400 border-transparent hover:text-slate-700'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ label = '불러오는 중...' }) {
  return (
    <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ title, desc, action }) {
  return (
    <div className="py-14 px-6 text-center border border-dashed border-slate-200 rounded-lg">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {desc && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="py-8 px-6 text-center bg-rose-50 rounded-lg border border-rose-100">
      <p className="text-sm text-rose-600 whitespace-pre-line">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-rose-700 underline">
          다시 시도
        </button>
      )}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full bg-white border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition';

export function Button({ variant = 'primary', className = '', loading, children, ...props }) {
  const styles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
    danger: 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white',
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold text-sm rounded-md h-10 px-4 transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/** 구분선 있는 정보 상자 */
export function Panel({ title, children, className = '' }) {
  return (
    <section className={`border border-slate-200 rounded-lg ${className}`}>
      {title && <h2 className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-800">{title}</h2>}
      {children}
    </section>
  );
}

/** 불러오는 동안 카드 모양 회색 틀 */
export function SkeletonGrid({ count = 10, className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6' }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/3] rounded-lg bg-slate-100" />
          <div className="h-3.5 bg-slate-100 rounded mt-2.5 w-3/4" />
          <div className="h-3 bg-slate-100 rounded mt-1.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}
