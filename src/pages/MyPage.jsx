import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, ExternalLink, LogOut, Mail, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Empty, ErrorBox, Segmented, Spinner } from '../components/ui';
import { api, clearSession } from '../lib/api';
import useSession from '../lib/useSession';
import useCooldown from '../lib/useCooldown';
import { POLICE_LOST_URL } from '../lib/constants';
import { toast } from '../lib/toast';

function Row({ Icon, title, desc, right, onClick, danger }) {
  return (
    <button type="button" onClick={onClick} className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 text-left">
      <Icon className={`w-[18px] h-[18px] shrink-0 ${danger ? 'text-rose-500' : 'text-slate-400'}`} />
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{title}</span>
        {desc && <span className="block text-[11px] text-slate-400 mt-0.5">{desc}</span>}
      </span>
      {right ?? <ChevronRight className="w-4 h-4 text-slate-300" />}
    </button>
  );
}

function Pill({ ok, children }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{children}</span>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [counts, setCounts] = useState({ FOUND: null, LOST: null });
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [tab, setTab] = useState('mine'); // mine | org
  const [typeFilter, setTypeFilter] = useState('');
  const [list, setList] = useState({ loading: true, items: [], error: '' });
  const [cooldown, startCooldown] = useCooldown();

  useEffect(() => {
    Promise.all(
      ['FOUND', 'LOST'].map((t) => api('/items/mine', { query: { type: t, limit: 1 } }).then((d) => d?.total ?? 0).catch(() => null)),
    ).then(([FOUND, LOST]) => setCounts({ FOUND, LOST }));
    // 기관 관리자만 성공하는 요청이라 역할 확인용으로 씀
    api('/items/org', { query: { limit: 1 } })
      .then(() => setIsOrgAdmin(true))
      .catch(() => setIsOrgAdmin(false));
  }, []);

  useEffect(() => {
    let alive = true;
    setList((l) => ({ ...l, loading: true, error: '' }));
    api(tab === 'org' ? '/items/org' : '/items/mine', { query: { type: typeFilter, limit: 30 } })
      .then((d) => alive && setList({ loading: false, items: d?.items ?? [], error: '' }))
      .catch((e) => alive && setList({ loading: false, items: [], error: e.message }));
    return () => {
      alive = false;
    };
  }, [tab, typeFilter]);

  if (!session) return null;

  const resend = async () => {
    try {
      await api('/auth/email/send', { method: 'POST', auth: false, body: { email: session.email } });
      startCooldown();
      toast.success(`${session.email}로 인증 메일을 보냈어요`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const logout = () => {
    clearSession();
    toast.success('로그아웃되었습니다');
    navigate('/', { replace: true });
  };

  return (
    <Layout title="내 정보">
      <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">
        {/* 왼쪽: 프로필 + 계정 설정 */}
        <aside className="space-y-4">
          <section className="border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-lg font-bold flex items-center justify-center shrink-0">
              {(session.name || session.email || '나').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold text-slate-900 truncate">{session.name || '회원'}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOrgAdmin ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {isOrgAdmin ? '기관 관리자' : '일반 회원'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{session.email}</p>
            </div>
          </section>

          <section className="grid grid-cols-2 border border-slate-200 rounded-lg divide-x divide-slate-200">
            {[
              ['FOUND', '내 습득물', 'text-blue-600'],
              ['LOST', '내 분실물', 'text-amber-600'],
            ].map(([t, label, color]) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab('mine');
                  setTypeFilter(t);
                }}
                className="p-3 text-left hover:bg-slate-50"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{counts[t] ?? '–'}<span className="text-xs font-medium text-slate-400 ml-0.5">건</span></p>
              </button>
            ))}
          </section>

          <section className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            <p className="px-4 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50">계정</p>
            <Row
              Icon={Mail}
              title="이메일 인증"
              desc={session.emailVerified ? '인증 완료' : cooldown > 0 ? `메일을 보냈어요 · ${cooldown}초 뒤 다시 보낼 수 있어요` : '인증 메일 다시 보내기'}
              right={<Pill ok={session.emailVerified}>{session.emailVerified ? '완료' : '필요'}</Pill>}
              onClick={session.emailVerified || cooldown > 0 ? undefined : resend}
            />
            <Row
              Icon={ShieldCheck}
              title="2단계 인증(MFA)"
              desc={session.mfaVerified ? '로그인할 때 인증 앱 코드를 확인해요' : '인증 앱으로 계정을 더 안전하게'}
              right={<Pill ok={session.mfaVerified}>{session.mfaVerified ? '사용 중' : '등록하기'}</Pill>}
              onClick={session.mfaVerified ? undefined : () => navigate('/mfa')}
            />
            {!isOrgAdmin && <Row Icon={Building2} title="기관 인증 신청" desc="학교·부서 분실물 담당자라면" onClick={() => navigate('/verify-institution')} />}
            <Row
              Icon={ExternalLink}
              title="경찰청 유실물 조회"
              desc="경찰민원24에서 직접 찾기"
              onClick={() => window.open(POLICE_LOST_URL, '_blank', 'noopener')}
            />
            <Row Icon={LogOut} title="로그아웃" danger right={<span />} onClick={logout} />
          </section>
        </aside>

        {/* 오른쪽: 내 글 */}
        <section className="min-w-0">
          {isOrgAdmin && (
            <Segmented
              className="mb-4"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'mine', label: '내가 쓴 글' },
                { value: 'org', label: '우리 기관 전체' },
              ]}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">{tab === 'org' ? '우리 기관 게시글' : '내가 쓴 글'}</h2>
            <div className="flex gap-1 text-xs">
              {[
                ['', '전체'],
                ['FOUND', '습득물'],
                ['LOST', '분실물'],
              ].map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTypeFilter(v)}
                  className={`h-7 px-2.5 rounded-md font-medium ${typeFilter === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {list.loading ? (
            <Spinner />
          ) : list.error ? (
            <ErrorBox message={list.error} />
          ) : list.items.length === 0 ? (
            <Empty
              title="아직 쓴 글이 없어요"
              action={<button type="button" onClick={() => navigate('/write')} className="text-sm font-semibold text-blue-600">첫 글 등록하기 →</button>}
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {list.items.map((it) => <ItemCard key={it.id} item={it} layout="row" />)}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
