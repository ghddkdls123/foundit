import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useSession from '../lib/useSession';

const LINKS = [
  { to: '/', label: '홈', end: true },
  { to: '/feed', label: '게시물' },
  { to: '/map', label: '지도' },
];

/** 사이트 공통 헤더: 로고 + 메뉴 + 검색 + 등록/로그인 */
export default function TopBar() {
  const navigate = useNavigate();
  const session = useSession();
  const [q, setQ] = useState('');

  const initial = (session?.name || session?.email || '').trim().charAt(0).toUpperCase();

  const onSearch = (e) => {
    e.preventDefault();
    const k = q.trim();
    navigate(k ? `/feed?keyword=${encodeURIComponent(k)}` : '/feed');
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto h-full px-4 md:px-6 flex items-center gap-6">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-1.5 text-lg font-black tracking-tight text-blue-600 shrink-0">
          <img src="/favicon.svg" alt="" className="w-6 h-6" />
          Foundit
        </button>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md font-medium ${isActive ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={onSearch} className="hidden md:block flex-1 max-w-xs ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="물건 이름 검색"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/feed?focus=1')}
            className="md:hidden w-9 h-9 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
            aria-label="검색"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/write')}
            className="hidden md:inline-flex items-center gap-1 h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> 등록하기
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => navigate('/mypage')}
              className="h-9 pl-1 pr-2.5 rounded-md hover:bg-slate-100 flex items-center gap-2 text-sm text-slate-700"
              aria-label="내 정보"
            >
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">{initial || '나'}</span>
              <span className="hidden md:inline font-medium max-w-[96px] truncate">{session.name || '내 정보'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="h-9 px-3 rounded-md border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
