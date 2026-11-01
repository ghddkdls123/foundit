import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  House,
  MapPin,
  Plus,
  GalleryVerticalEnd,
  CircleUserRound
} from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const getNavStyle = (path) => {
    return currentPath === path 
      ? "flex flex-col items-center text-indigo-600 transition" 
      : "flex flex-col items-center text-slate-400 hover:text-slate-800 transition";
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 px-6 z-50 flex items-center justify-around shadow-lg">
      <button onClick={() => navigate('/Home')} className={getNavStyle('/Home')}>
        <House className="w-6 h-6" />
        <span className="text-[10px] font-semibold mt-1">홈</span>
      </button>

      <button onClick={() => navigate('/MapPage')} className={getNavStyle('/MapPage')}>
        <MapPin className="w-6 h-6" />
        <span className="text-[10px] font-medium mt-1">지도보기</span>
      </button>

      <button onClick={() => navigate('/write')} className="flex flex-col items-center -mt-8">
        <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white hover:bg-indigo-700 transition">
          <Plus className="w-7 h-7 text-white" />
        </div>
        <span className="text-[10px] font-semibold text-slate-800 mt-1">습득신고</span>
      </button>

      <button onClick={() => navigate('/feed')} className={getNavStyle('/feed')}>
        <GalleryVerticalEnd className="w-6 h-6" />
        <span className="text-[10px] font-medium mt-1">게시물</span>
      </button>

      <button onClick={() => navigate('/MyPage')} className={getNavStyle('/MyPage')}>
        <CircleUserRound className="w-6 h-6" />
        <span className="text-[10px] font-medium mt-1">내 정보</span>
      </button>
    </footer>
  );
}