import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import TopBar from './TopBar';
import BottomNav from './BottomNavBar';
import Footer from './Footer';

const WIDTH = {
  wide: 'max-w-6xl',
  medium: 'max-w-4xl',
  narrow: 'max-w-2xl',
};

/**
 * 모든 화면 공통 틀: 위 헤더 + 가운데 본문 (+ 휴대폰에서는 아래 탭)
 * - title: 본문 위 페이지 제목, back: 뒤로가기 링크 표시, right: 제목 오른쪽 버튼
 */
export default function Layout({ title, back = false, right, width = 'wide', children, className = '' }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar />
      <main className={`w-full ${WIDTH[width]} mx-auto px-4 md:px-6 pt-20 pb-12 md:pb-16 flex-1 ${className}`}>
        {back && (
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="-ml-1 mb-2 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" /> 뒤로
          </button>
        )}
        {(title || right) && (
          <div className="flex items-center justify-between gap-3 mb-5">
            {title && <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>}
            {right}
          </div>
        )}
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
