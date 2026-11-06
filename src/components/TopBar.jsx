import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import useSession from '../lib/useSession';

/**
 * 기본: 로고 + 로그인/프로필
 * title 을 주면: 뒤로가기 + 제목 (상세, 글쓰기 같은 하위 화면)
 */
export default function TopBar({ title, right }) {
  const navigate = useNavigate();
  const session = useSession();

  const initial = (session?.name || session?.email || '').trim().charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
      <div className="max-w-md mx-auto h-14 px-4 flex items-center justify-between gap-2">
        {title ? (
          <>
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              className="-ml-2 p-2 rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-[15px] font-bold text-slate-800 truncate">{title}</h1>
            <div className="min-w-[36px] flex justify-end">{right}</div>
          </>
        ) : (
          <>
            <button type="button" onClick={() => navigate('/')} className="text-xl font-black tracking-tight text-indigo-600">
              foundit
            </button>
            {session ? (
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-sm flex items-center justify-center"
                aria-label="내 정보"
              >
                {initial || '나'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-full"
              >
                로그인
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
