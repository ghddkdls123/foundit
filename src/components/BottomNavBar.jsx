import { useLocation, useNavigate } from 'react-router-dom';
import { House, MapPin, Plus, GalleryVerticalEnd, CircleUserRound } from 'lucide-react';

const TABS = [
  { path: '/', label: '홈', Icon: House },
  { path: '/feed', label: '게시물', Icon: GalleryVerticalEnd },
  { path: '/write', label: '등록', Icon: Plus, primary: true },
  { path: '/map', label: '지도', Icon: MapPin },
  { path: '/mypage', label: '내 정보', Icon: CircleUserRound },
];

/** 휴대폰 화면에서만 보이는 아래 탭 (넓은 화면은 위 헤더 메뉴 사용) */
export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] pb-safe">
      <div className="h-16 grid grid-cols-5 px-1">
        {TABS.map(({ path, label, Icon, primary }) => {
          const active = isActive(path);
          if (primary) {
            // 가운데 등록 버튼: 배경 없이 파란 + 아이콘만
            return (
              <button key={path} type="button" onClick={() => navigate(path)} className="relative flex flex-col items-center justify-center gap-1" aria-label="등록하기">
                <span className={`absolute top-0 h-0.5 w-8 rounded-full ${active ? 'bg-blue-600' : 'bg-transparent'}`} />
                <span className="h-7 flex items-center justify-center text-blue-600">
                  <Icon className="w-7 h-7" strokeWidth={2.4} />
                </span>
                <span className={`text-[11px] ${active ? 'font-semibold text-blue-600' : 'font-medium text-slate-500'}`}>{label}</span>
              </button>
            );
          }
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="relative flex flex-col items-center justify-center gap-1"
              aria-current={active ? 'page' : undefined}
            >
              {/* 선택된 탭: 위쪽 파란 막대 */}
              <span className={`absolute top-0 h-0.5 w-8 rounded-full transition ${active ? 'bg-blue-600' : 'bg-transparent'}`} />
              <span className={`h-7 flex items-center justify-center ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                <Icon className="w-6 h-6" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={`text-[11px] ${active ? 'font-semibold text-blue-600' : 'font-medium text-slate-500'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
