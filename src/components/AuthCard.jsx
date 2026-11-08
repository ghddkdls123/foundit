import TopBar from './TopBar';
import Footer from './Footer';
import BottomNav from './BottomNavBar';

/** 로그인·회원가입·인증 화면 공통 틀: 사이트 헤더 + 가운데 폼 */
export default function AuthCard({ title, desc, children, footer }) {
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <main className="pt-14 px-4">
        <div className="w-full max-w-sm mx-auto pt-12 md:pt-20 pb-16">
          {title && <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>}
          {desc && <p className="text-sm text-slate-500 mt-1.5">{desc}</p>}
          <div className={title || desc ? 'mt-7' : ''}>{children}</div>
          {footer && <div className="mt-6 pt-5 border-t border-slate-200 text-sm text-slate-500">{footer}</div>}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
