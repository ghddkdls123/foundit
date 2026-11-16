import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Check, ChevronRight, ExternalLink, KeyRound, LogOut, Mail, MessageCircle, PencilLine, ShieldCheck, UserX,
} from 'lucide-react';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Button, Empty, ErrorBox, Field, Segmented, Spinner, inputClass } from '../components/ui';
import { api, clearSession, saveSession } from '../lib/api';
import useSession from '../lib/useSession';
import useCooldown from '../lib/useCooldown';
import useUnread from '../lib/useUnread';
import { passwordChecks } from '../lib/password';
import { POLICE_LOST_URL } from '../lib/constants';
import { toast } from '../lib/toast';

const ROLE_LABEL = { USER: '일반 회원', ORG_ADMIN: '기관 관리자', SUPER_ADMIN: '운영자' };

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

/** 가운데 뜨는 창 */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-xl max-h-[90svh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <p className="text-base font-bold text-slate-900 mb-4">{title}</p>
        {children}
      </div>
    </div>
  );
}

function NameModal({ current, onClose, onSaved }) {
  const [name, setName] = useState(current || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const trimmed = name.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!trimmed) return setError('이름을 입력해주세요.');
    if (trimmed.length > 30) return setError('이름은 30자까지 쓸 수 있어요.');
    setSaving(true);
    setError('');
    try {
      const me = await api('/users/me', { method: 'PATCH', body: { name: trimmed } });
      onSaved(me);
      toast.success('이름을 바꿨어요');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="이름 변경" onClose={() => !saving && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="이름" hint={`${trimmed.length} / 30자`}>
          <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={saving} onClick={onClose}>취소</Button>
          <Button type="submit" className="flex-1" loading={saving} disabled={!trimmed || trimmed === current}>저장</Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const checks = passwordChecks(form.next);
  const pwOk = checks.every((c) => c.ok);
  const confirmOk = form.confirm.length > 0 && form.confirm === form.next;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.current) return setError('현재 비밀번호를 입력해주세요.');
    if (!pwOk) return setError('새 비밀번호 조건을 확인해주세요.');
    if (!confirmOk) return setError('새 비밀번호가 서로 달라요.');
    if (form.current === form.next) return setError('지금과 다른 비밀번호를 입력해주세요.');
    setSaving(true);
    setError('');
    try {
      await api('/users/me/password', { method: 'PATCH', body: { currentPassword: form.current, newPassword: form.next } });
      toast.success('비밀번호를 바꿨어요');
      onClose();
    } catch (err) {
      // 400: 현재 비밀번호가 틀림 / 같은 비밀번호 (로그아웃시키지 않음)
      if (err.status === 429) setError('시도가 너무 많아요. 1분 뒤에 다시 시도해주세요.');
      else if (err.status === 400 && /현재|current|일치|incorrect|wrong/i.test(err.message)) setError('현재 비밀번호가 올바르지 않습니다.');
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="비밀번호 변경" onClose={() => !saving && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="현재 비밀번호">
          <input autoFocus type="password" className={inputClass} value={form.current} onChange={set('current')} autoComplete="current-password" />
        </Field>
        <Field label="새 비밀번호">
          <input type="password" className={inputClass} value={form.next} onChange={set('next')} autoComplete="new-password" />
          <span className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {checks.map((c) => (
              <span key={c.label} className={`text-[11px] flex items-center gap-0.5 ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> {c.label}
              </span>
            ))}
          </span>
        </Field>
        <Field label="새 비밀번호 확인">
          <input type="password" className={inputClass} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          {form.confirm && !confirmOk && <span className="block text-[11px] text-rose-500 mt-1">새 비밀번호가 서로 달라요.</span>}
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={saving} onClick={onClose}>취소</Button>
          <Button type="submit" className="flex-1" loading={saving}>변경</Button>
        </div>
      </form>
    </Modal>
  );
}

function WithdrawModal({ onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return setError('비밀번호를 입력해주세요.');
    setSaving(true);
    setError('');
    try {
      await api('/users/me/withdraw', { method: 'POST', body: { password } });
      onDone();
    } catch (err) {
      if (err.status === 429) setError('시도가 너무 많아요. 1분 뒤에 다시 시도해주세요.');
      else setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="회원 탈퇴" onClose={() => !saving && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-[13px] text-rose-700 space-y-1">
          <p className="font-semibold">탈퇴하면 되돌릴 수 없어요.</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>내가 쓴 분실물·습득물 글과 사진이 모두 지워져요.</li>
            <li>내가 참여한 채팅 대화가 모두 지워져요.</li>
          </ul>
        </div>
        <Field label="비밀번호 확인">
          <input autoFocus type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="w-4 h-4" />
          위 내용을 확인했고 탈퇴할게요.
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={saving} onClick={onClose}>취소</Button>
          <Button type="submit" variant="danger" className="flex-1" loading={saving} disabled={!agree || !password}>탈퇴하기</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const session = useSession();
  const unread = useUnread();
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState('');
  const [tab, setTab] = useState('mine'); // mine | org
  const [typeFilter, setTypeFilter] = useState('');
  const [list, setList] = useState({ loading: true, items: [], error: '' });
  const [modal, setModal] = useState(''); // name | password | withdraw
  const [cooldown, startCooldown] = useCooldown();

  const applyMe = (d) => {
    setMe(d);
    // 헤더 이름 등도 서버 값으로 맞춤
    saveSession({ name: d.name ?? '', email: d.email ?? '', emailVerified: !!d.emailVerified });
  };

  const loadMe = () => {
    setMeError('');
    api('/users/me')
      .then(applyMe)
      .catch((e) => setMeError(e.message));
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOrgAdmin = me?.role === 'ORG_ADMIN';
  const isUser = me?.role === 'USER';

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

  const name = me?.name ?? session.name;
  const email = me?.email ?? session.email;
  const emailVerified = me ? !!me.emailVerified : session.emailVerified;
  const mfaOn = me ? !!me.mfaEnabled : session.mfaVerified;

  const resend = async () => {
    try {
      await api('/auth/email/send', { method: 'POST', auth: false, body: { email } });
      startCooldown();
      toast.success(`${email}로 인증 메일을 보냈어요`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const logout = () => {
    clearSession(); // 채팅 소켓도 같이 끊김 (lib/chat.js)
    toast.success('로그아웃되었습니다');
    navigate('/', { replace: true });
  };

  const afterWithdraw = () => {
    clearSession(); // 저장된 토큰 삭제 + 채팅 socket.disconnect()
    setModal('');
    toast.success('탈퇴가 완료되었어요. 그동안 이용해 주셔서 감사합니다.');
    navigate('/', { replace: true });
  };

  return (
    <Layout title="내 정보">
      <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">
        {/* 왼쪽: 프로필 + 계정 설정 */}
        <aside className="space-y-4">
          {meError && <ErrorBox message={meError} onRetry={loadMe} />}
          <section className="border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 text-lg font-bold flex items-center justify-center shrink-0">
              {(name || email || '나').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold text-slate-900 truncate">{name || '회원'}</p>
                {me && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isUser ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}>
                    {ROLE_LABEL[me.role] ?? me.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{email}</p>
              {me?.institution && (
                <p className="text-xs text-blue-700 truncate mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {me.institution.name}
                </p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 border border-slate-200 rounded-lg divide-x divide-slate-200">
            {[
              ['FOUND', '내 습득물', 'text-blue-600', me?.stats?.found],
              ['LOST', '내 분실물', 'text-amber-600', me?.stats?.lost],
            ].map(([t, label, color, n]) => (
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
                <p className={`text-xl font-bold ${color}`}>{n ?? '–'}<span className="text-xs font-medium text-slate-400 ml-0.5">건</span></p>
              </button>
            ))}
          </section>

          <section className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            <Row
              Icon={MessageCircle}
              title="채팅"
              desc="문의한 글, 내 글에 온 문의"
              right={
                unread > 0 ? (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
                ) : undefined
              }
              onClick={() => navigate('/chats')}
            />
          </section>

          <section className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            <p className="px-4 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50">계정</p>
            <Row Icon={PencilLine} title="이름 변경" desc={name || undefined} onClick={() => setModal('name')} />
            <Row Icon={KeyRound} title="비밀번호 변경" onClick={() => setModal('password')} />
            <Row
              Icon={Mail}
              title="이메일 인증"
              desc={emailVerified ? '인증 완료' : cooldown > 0 ? `메일을 보냈어요 · ${cooldown}초 뒤 다시 보낼 수 있어요` : '인증 메일 다시 보내기 (채팅 문의에 필요해요)'}
              right={<Pill ok={emailVerified}>{emailVerified ? '완료' : '필요'}</Pill>}
              onClick={emailVerified || cooldown > 0 ? undefined : resend}
            />
            <Row
              Icon={ShieldCheck}
              title="2단계 인증(MFA)"
              desc={mfaOn ? '로그인할 때 인증 앱 코드를 확인해요' : '인증 앱으로 계정을 더 안전하게'}
              right={<Pill ok={mfaOn}>{mfaOn ? '사용 중' : '등록하기'}</Pill>}
              onClick={mfaOn ? undefined : () => navigate('/mfa')}
            />
            {isUser && <Row Icon={Building2} title="기관 인증 신청" desc="학교·부서 분실물 담당자라면" onClick={() => navigate('/verify-institution')} />}
            <Row
              Icon={ExternalLink}
              title="경찰청 유실물 조회"
              desc="경찰민원24에서 직접 찾기"
              onClick={() => window.open(POLICE_LOST_URL, '_blank', 'noopener')}
            />
            <Row Icon={LogOut} title="로그아웃" danger right={<span />} onClick={logout} />
          </section>

          {me && (
            isUser ? (
              <button type="button" onClick={() => setModal('withdraw')} className="px-1 text-xs text-slate-400 hover:text-rose-600 inline-flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" /> 회원 탈퇴
              </button>
            ) : (
              <p className="px-1 text-xs text-slate-400">{ROLE_LABEL[me.role] ?? '관리자'} 계정은 탈퇴하려면 운영자에게 요청해 주세요.</p>
            )
          )}
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
            <h2 className="text-lg font-bold text-slate-900">
              {tab === 'org' ? '우리 기관 게시글' : '내가 쓴 글'}
              {tab === 'mine' && me?.stats && (
                <span className="ml-1.5 text-sm font-medium text-slate-400">{(me.stats.lost ?? 0) + (me.stats.found ?? 0)}건</span>
              )}
            </h2>
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

      {modal === 'name' && <NameModal current={name} onClose={() => setModal('')} onSaved={applyMe} />}
      {modal === 'password' && <PasswordModal onClose={() => setModal('')} />}
      {modal === 'withdraw' && <WithdrawModal onClose={() => setModal('')} onDone={afterWithdraw} />}
    </Layout>
  );
}
