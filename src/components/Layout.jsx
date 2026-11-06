import TopBar from './TopBar';
import BottomNav from './BottomNavBar';

/** 모든 화면 공통 틀: 위 바 + 가운데 모바일 폭 본문 + 아래 탭 */
export default function Layout({ title, right, nav = true, children, className = '' }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title={title} right={right} />
      <main className={`max-w-md mx-auto px-4 pt-[72px] ${nav ? 'pb-28' : 'pb-10'} ${className}`}>{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}
