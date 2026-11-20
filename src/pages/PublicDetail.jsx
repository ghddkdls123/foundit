import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, CalendarDays, ImageOff, MapPin, Phone, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import ItemNotesButton from '../components/ItemNotesButton';
import { ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { POLICE_LOST_URL, REGION_LABEL, toOurCategory } from '../lib/constants';

export default function PublicDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api(`/public-items/${id}`)
      .then((d) => alive && setItem(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <Layout back width="medium"><ErrorBox message={error} /></Layout>;
  if (!item) return <Layout back width="medium"><Spinner /></Layout>;

  const rows = [
    { Icon: CalendarDays, label: '습득일', value: item.foundDate },
    { Icon: Building2, label: '세부 분류', value: [item.categoryMain, item.categorySub].filter(Boolean).join(' > ') },
    { Icon: MapPin, label: '보관 장소', value: item.storagePlace },
    { Icon: Building2, label: '보관 기관', value: item.institutionName },
    { Icon: Phone, label: '연락처', value: item.phone, href: item.phone ? `tel:${item.phone.replace(/[^0-9]/g, '')}` : null },
  ].filter((r) => r.value);

  return (
    <Layout back width="wide">
      <div className="grid md:grid-cols-2 gap-6 md:gap-10">
        <div>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full aspect-square object-contain rounded-lg border border-slate-200 bg-slate-50" />
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-sm text-slate-400">
              <ImageOff className="w-6 h-6" /> 사진이 없는 유실물이에요
            </div>
          )}
        </div>

        <div className="min-w-0">
          {item.listed === false && (
            <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
              경찰청 목록에서 내려간 물건이에요. 이미 주인이 찾아갔을 수 있어요.
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">경찰청 유실물</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{toOurCategory(item.categoryMain)}</span>
            {item.region && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{REGION_LABEL[item.region] || item.region}</span>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">{item.name}</h1>

          <dl className="mt-5 border-t border-slate-200 divide-y divide-slate-100 text-sm">
            {rows.map(({ Icon, label, value, href }) => (
              <div key={label} className="py-3 grid grid-cols-[96px_1fr] gap-3">
                <dt className="text-slate-500 flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{label}</dt>
                <dd className="min-w-0">
                  {href ? <a href={href} className="font-semibold text-blue-600">{value}</a> : <span className="font-medium text-slate-900">{value}</span>}
                </dd>
              </div>
            ))}
            {item.content && (
              <div className="py-3 grid grid-cols-[96px_1fr] gap-3">
                <dt className="text-slate-500">특이사항</dt>
                <dd className="text-slate-700 leading-relaxed whitespace-pre-wrap">{item.content}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 leading-relaxed">
            경찰청 유실물 시스템에 등록된 물건이에요. 찾으러 갈 때는 신분증을 챙기고, 먼저 보관 기관에 전화로 확인하세요.
            <a href={POLICE_LOST_URL} target="_blank" rel="noreferrer" className="mt-2 font-semibold text-blue-600 flex items-center gap-1">
              경찰민원24에서 보기 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">메모</h2>
          <p className="mt-1 text-xs text-slate-500">내 메모는 나만 확인할 수 있어요.</p>
        </div>
        <ItemNotesButton item={{ id: item.id, title: item.name, source: 'public' }} label="메모 확인 / 작성" />
      </section>
    </Layout>
  );
}
