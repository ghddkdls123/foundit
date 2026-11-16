import { Info } from 'lucide-react';
import { MIN_SIMILARITY } from '../lib/constants';

const PCT = Math.round(MIN_SIMILARITY * 100);

/** "유사도가 뭔지, 왜 안 나오는지" 안내 (누르면 펼쳐짐) */
export function SimilarityHelp({ className = '' }) {
  return (
    <details className={`group text-xs text-slate-500 ${className}`}>
      <summary className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-slate-800 list-none">
        <Info className="w-3.5 h-3.5" />
        유사도는 어떻게 정해지나요?
      </summary>
      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-3 leading-relaxed space-y-1">
        <p>· AI가 두 사진의 모양·색·형태를 비교해 0~100%로 계산한 값이에요.</p>
        <p>· <b className="text-slate-700">{PCT}% 이상</b>으로 닮은 것만 보여줘요. 그보다 덜 닮은 사진은 다른 물건일 가능성이 커서 숨겨요.</p>
        <p>· 같은 물건 확률이 아니에요. 각도·배경·조명이 다르면 같은 물건도 낮게 나올 수 있어요.</p>
        <p>· 사진이 있는 글끼리만 비교하고, 반환 완료된 글은 빼요.</p>
      </div>
    </details>
  );
}

/** 결과가 없을 때 이유를 알려주는 안내 */
export function NoSimilarNotice({ targetLabel, onAction, actionLabel }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 leading-relaxed">
      <p className="font-semibold text-slate-800">
        유사도 {PCT}% 이상으로 닮은 {targetLabel}이 아직 없어요.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        지금 등록된 {targetLabel} 사진 중 이 사진과 충분히 닮은 게 없다는 뜻이에요. 새 글이 올라오면 다시 비교되니 나중에 다시 확인해 보세요.
      </p>
      {onAction && (
        <button type="button" onClick={onAction} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}
