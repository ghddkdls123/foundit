import { useLocation, useNavigate } from 'react-router-dom';
import { House, MapPin, Plus, GalleryVerticalEnd, CircleUserRound } from 'lucide-react';

const TABS = [
  { path: '/', label: '홈', Icon: House },
  { path: '/map', label: '지도', Icon: MapPin },
  { path: '/write', label: '등록', Icon: Plus, primary: true },
  { path: '/feed', label: '게시물', Icon: GalleryVerticalEnd },
  { path: '/mypage', label: '내 정보', Icon: CircleUserRound },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-safe">
      <div className="max-w-md mx-auto h-16 px-2 grid grid-cols-5 items-center">
        {TABS.map(({ path, label, Icon, primary }) =>
          primary ? (
            <button key={path} type="button" onClick={() => navigate(path)} className="flex flex-col items-center -mt-7">
              <span className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 border-4 border-white">
                <Icon className="w-7 h-7 text-white" />
              </span>
              <span className="text-[10px] font-semibold text-slate-700 mt-0.5">{label}</span>
            </button>
          ) : (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 ${isActive(path) ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
