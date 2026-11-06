import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, CalendarDays, ImageOff, MapPin, Phone, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import { ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';

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

  if (error) return <Layout title="경찰청 유실물"><ErrorBox message={error} /></Layout>;
  if (!item) return <Layout title="경찰청 유실물"><Spinner /></Layout>;

  const rows = [
    { Icon: CalendarDays, label: '습득일', value: item.foundDate },
    { Icon: MapPin, label: '보관 장소', value: item.storagePlace },
    { Icon: Building2, label: '보관 기관', value: item.institutionName },
    { Icon: Phone, label: '연락처', value: item.phone, href: item.phone ? `tel:${item.phone.replace(/[^0-9]/g, '')}` : null },
  ].filter((r) => r.value);

  return (
    <Layout title="경찰청 유실물">
      <div className="-mx-4">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full aspect-square object-contain bg-slate-900" />
        ) : (
          <div className="w-full aspect-[16/9] bg-slate-100 flex flex-col items-center justify-center gap-1 text-xs text-slate-400">
            <ImageOff className="w-6 h-6" /> 사진이 없는 유실물이에요
          </div>
        )}
      </div>

      <div className="pt-4 space-y-5">
        <div>
          <div className="flex gap-1.5">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-white">경찰청 유실물</span>
            {item.categoryMain && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.categoryMain}{item.categorySub ? ` > ${item.categorySub}` : ''}</span>}
            {item.region && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.region}</span>}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{item.name}</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {rows.map(({ Icon, label, value, href }) => (
            <div key={label} className="p-4 flex gap-3 text-sm">
              <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400 font-semibold">{label}</p>
                {href ? (
                  <a href={href} className="font-semibold text-indigo-600">{value}</a>
                ) : (
                  <p className="font-semibold text-slate-800">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {item.content && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 mb-2">특이사항</h2>
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200 whitespace-pre-wrap">{item.content}</p>
          </div>
        )}

        <div className="bg-slate-100 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
          경찰청 유실물 통합포털(LOST112)에 등록된 물건이에요. 찾으러 갈 때는 신분증을 챙기고, 먼저 보관 기관에 전화로 확인하세요.
          <a href="https://www.lost112.go.kr" target="_blank" rel="noreferrer" className="mt-2 font-semibold text-indigo-600 flex items-center gap-1">
            LOST112 열기 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Layout>
  );
}
