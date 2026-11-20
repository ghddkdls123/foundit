import { useNavigate } from 'react-router-dom';
import { Building2, Lock, MapPin } from 'lucide-react';
import { timeAgo } from '../lib/format';
import { REGION_LABEL, toOurCategory } from '../lib/constants';

/** 서버 응답 3가지(피드 카드, 우리 게시글, 공공 습득물)를 한 모양으로 */
export function normalizeItem(raw) {
  if (raw.source === 'public' || raw.foundDate !== undefined || raw.storagePlace !== undefined) {
    return {
      key: `p-${raw.id}`,
      href: `/public/${raw.id}`,
      source: 'public',
      type: 'FOUND',
      title: raw.title ?? raw.name ?? '이름 없는 물건',
      category: toOurCategory(raw.category ?? raw.categoryMain),
      place: raw.place ?? raw.storagePlace ?? '',
      date: raw.date ?? raw.foundDate ?? '',
      img: raw.thumbnailUrl ?? raw.imageUrl ?? '',
      institution: '경찰청 유실물',
      region: raw.region ?? '',
      status: 'OPEN',
      similarity: raw.similarity,
    };
  }
  const type = raw.type ?? 'FOUND';
  return {
    key: `i-${raw.id}`,
    href: `/feed/${raw.id}`,
    source: 'internal',
    type,
    title: raw.title ?? '제목 없음',
    category: raw.category ?? '',
    place: type === 'LOST' ? raw.lostLocation ?? '' : raw.place ?? raw.storageLocation ?? '',
    placeHidden: type === 'FOUND' && (raw.place ?? raw.storageLocation) == null,
    date: raw.date ?? raw.createdAt ?? '',
    img: raw.thumbnailUrl ?? '',
    institution: typeof raw.institution === 'string' ? raw.institution : raw.institution?.name ?? '',
    region: raw.region ?? '',
    status: raw.status ?? 'OPEN',
    similarity: raw.similarity,
  };
}

function TypeBadge({ item }) {
  if (item.source === 'public') {
    return <span className="bg-slate-800/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">경찰청</span>;
  }
  return item.type === 'LOST' ? (
    <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">분실물</span>
  ) : (
    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">습득물</span>
  );
}

export default function ItemCard({ item: raw, layout = 'grid', className = '' }) {
  const navigate = useNavigate();
  const item = normalizeItem(raw);
  const placeText = item.place || (item.placeHidden ? '보관 장소 비공개' : '장소 정보 없음');
  const PlaceIcon = !item.place && item.placeHidden ? Lock : MapPin;
  // 사진이 없을 때: 회색 빈 칸 대신 분류 이름을 보여줌
  const noPhoto = (big) => (
    <span className={`w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-semibold ${big ? 'text-sm' : 'text-[11px]'}`}>
      {item.category || '사진 없음'}
    </span>
  );

  if (layout === 'row') {
    return (
      <button
        type="button"
        onClick={() => navigate(item.href)}
        className={`w-full flex gap-3 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-400 transition text-left ${className}`}
      >
        <div className="relative w-20 h-20 shrink-0 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center">
          {item.img ? <img src={item.img} alt="" className="w-full h-full object-cover" loading="lazy" /> : noPhoto(false)}
          {item.status === 'RETURNED' && (
            <span className="absolute inset-0 bg-slate-900/55 text-white text-[11px] font-bold flex items-center justify-center">반환 완료</span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-center gap-1.5">
            <TypeBadge item={item} />
            {item.category && <span className="text-[11px] text-slate-400 truncate">{item.category}</span>}
            {item.region && <span className="text-[11px] text-slate-400 truncate">{REGION_LABEL[item.region] || item.region}</span>}
            {typeof item.similarity === 'number' && (
              <span className="ml-auto text-[11px] font-bold text-emerald-600">유사도 {Math.round(item.similarity * 100)}%</span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 truncate mt-1">{item.title}</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
            <PlaceIcon className="w-3 h-3 shrink-0" />
            {placeText}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(item.date)}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(item.href)}
      className={`group flex flex-col text-left ${className}`}
    >
      <div className="relative w-full aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
        {item.img ? (
          <img src={item.img} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" loading="lazy" />
        ) : (
          noPhoto(true)
        )}
        <span className="absolute top-2 left-2">
          <TypeBadge item={item} />
        </span>
        {typeof item.similarity === 'number' && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {Math.round(item.similarity * 100)}%
          </span>
        )}
        {item.status === 'RETURNED' && (
          <span className="absolute inset-0 bg-slate-900/55 text-white text-xs font-bold flex items-center justify-center">반환 완료</span>
        )}
      </div>
      <div className="pt-2 flex-1 flex flex-col">
        <p className="text-sm font-semibold text-slate-900 truncate group-hover:underline">{item.title}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
          {item.institution && item.source === 'internal' ? <Building2 className="w-3 h-3 shrink-0" /> : <PlaceIcon className="w-3 h-3 shrink-0" />}
          {item.institution && item.source === 'internal' ? item.institution : placeText}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{[item.region && (REGION_LABEL[item.region] || item.region), item.category, timeAgo(item.date)].filter(Boolean).join(' · ')}</p>
      </div>
    </button>
  );
}
