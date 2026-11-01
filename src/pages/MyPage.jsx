import React,{useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  FileText, 
  Info,
  LogOut, 
  ChevronRight 
} from 'lucide-react';
import BottomNav from '../components/BottomNavBar';

export default function MyPage() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState('사용자');
  const [userEmail, setUserEmail] = useState('등록된 이메일이 없습니다.');

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');

    console.log('마이페이지에서 불러온 이메일:', savedEmail); // F12 콘솔에서 확인용

    if (savedName && savedName !== 'undefined') {
      setUserName(savedName);
    }
    if (savedEmail && savedEmail !== 'undefined') {
      setUserEmail(savedEmail);
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      alert('성공적으로 로그아웃되었습니다.');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="h-16 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">마이페이지</h1>
        <button 
          onClick={() => navigate('/edit-profile')} 
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto">
        {/* 1. 프로필 영역 */}
        <div 
          onClick={() => navigate('/edit-profile')}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
        >
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-slate-800">{userName}</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                  일반회원
                </span>
              </div>
              <p className="text-xs text-slate-400 text-left mt-0.5">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center text-xs text-slate-400 font-medium">
            <span>수정</span>
            <ChevronRight className="w-4 h-4 ml-1 text-slate-300" />
          </div>
        </div>

        {/* 2. 활동 요약 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm grid grid-cols-2 divide-x divide-slate-100 text-center">
          <button onClick={() => navigate('/my-reports')} className="py-1 hover:opacity-80 transition">
            <p className="text-xs text-slate-400 font-medium">내가 쓴 습득신고</p>
            <p className="text-lg font-bold text-indigo-600 mt-0.5">2건</p>
          </button>
          <button onClick={() => navigate('/my-bookmarks')} className="py-1 hover:opacity-80 transition">
            <p className="text-xs text-slate-400 font-medium">관심 게시물</p>
            <p className="text-lg font-bold text-indigo-600 mt-0.5">5건</p>
          </button>
        </div>

        {/* 메뉴 리스트 - 계정 설정 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            계정 설정
          </div>
          <div className="divide-y divide-slate-50">
            <MenuItem 
              icon={<User className="w-4 h-4 text-slate-400" />} 
              title="회원정보 수정" 
              onClick={() => navigate('/edit-profile')} 
            />
            <MenuItem 
              icon={<Bell className="w-4 h-4 text-slate-400" />} 
              title="알림 설정 (키워드/채팅)" 
              onClick={() => alert('알림 설정 기능 준비 중')} 
            />
            <MenuItem 
              icon={<Shield className="w-4 h-4 text-slate-400" />} 
              title="기관 인증 / 추가 인증" 
              onClick={() => navigate('/verifyinstitution')} 
            />
          </div>
        </div>

        {/* 메뉴 리스트 - 고객지원 & 안내 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            고객지원 & 안내
          </div>
          <div className="divide-y divide-slate-50">
            <MenuItem 
              icon={<FileText className="w-4 h-4 text-slate-400" />} 
              title="유실물 처리절차 안내" 
              onClick={() => alert('유실물 처리절차 안내 페이지 준비 중')}
            />
            <MenuItem 
              icon={<FileText className="w-4 h-4 text-slate-400" />} 
              title="기능 가이드 / 자주 묻는 질문" 
              onClick={() => alert('자주 묻는 질문 페이지로 이동합니다.')} 
            />
            <MenuItem 
              icon={<HelpCircle className="w-4 h-4 text-slate-400" />} 
              title="고객센터 / 1:1 문의하기" 
              onClick={() => alert('고객센터 문의하기 페이지로 이동합니다.')} 
            />
            <MenuItem 
              icon={<Info className="w-4 h-4 text-slate-400" />} 
              title="서비스 이용약관 및 개인정보 처리방침" 
              onClick={() => alert('약관 페이지로 이동합니다.')} 
            />
          </div>
        </div>

        {/* 메뉴 리스트 - 기타 (로그아웃) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-red-50/50 transition text-red-500 font-medium text-sm"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="w-4 h-4 text-red-500" />
              <span>로그아웃</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-300" />
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-300 pt-2">
          foundit v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

// 메뉴 아이템 재사용 컴포넌트
function MenuItem({ icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
    >
      <div className="flex items-center space-x-3 text-slate-700">
        <span>{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </button>
  );
}