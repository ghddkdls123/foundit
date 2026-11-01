import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNavBar';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('전체');

  // 분실물 임시 데이터
  const lostItems = [
    { id: 1, title: '검은색 가죽 지갑', location: '강남역 2번 출구', date: '5분 전', category: '지갑', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbXCgMF6ClgGjHouWKoCRfF98a6mA7rUizEalHsyh0bA&s' },
    { id: 2, title: '애플 에어팟 프로', location: '한강 반포지구', date: '2시간 전', category: '전자기기', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqCKt6YlOLWnqYh6kyvfbOLQID5759bkY50N27uG_8cg&s=10' },
    { id: 3, title: '베이지색 우산', location: '교보문고 잠실점', date: '3시간 전', category: '우산', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqB8jtBZlyvUaRiJ65PRDZ8PlzGbvlZl5cgRwcW37Utg&s' },
    { id: 4, title: '아이패드 에어 5세대', location: '학교 도서관 3층', date: '5시간 전', category: '전자기기', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=400&auto=format&fit=crop' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <TopBar />

      <main className="flex-grow pt-20 px-6 pb-24 max-w-7xl mx-auto w-full">
        
        <section className="my-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">안녕하세요, 길동님 👋</h1>
          <p className="text-xs text-slate-500 mt-1">오늘 잃어버린 물건이나 습득한 물건을 검색해보세요.</p>

          <div className="relative mt-5">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="무엇을 잃어버리셨나요?" 
              className="w-full pl-12 pr-16 py-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
            />
            
            <button className="absolute inset-y-2 right-2 flex items-center justify-center w-20 h-9 rounded-xl border border-indigo-200/60 shadow-sm transition-all duration-300 group overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-[length:200%_200%] animate-gradient hover:scale-105 hover:shadow-indigo-200 hover:shadow-md">
              <div className="flex items-center gap-1 text-white transition-transform duration-200 group-hover:-translate-y-0.5">
                <Sparkles className="w-4 h-4 fill text-white animate-pulse" />
                <span className="font-semibold text-sm tracking-wide text-white">AI</span>
              </div>
            </button>
          </div>
        </section>



        <section className="my-6">
          <div 
            className="flex gap-2 overflow-x-auto pb-2 px-1"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none', 
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                display: none; /* 크롬, 사파리 스크롤바 숨김 */
              }
            `}</style>

            {['전체', '지갑', '전자기기', '우산', '의류', '가방','귀중품','기타'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="my-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">실시간 습득물 피드</h3>
          <span 
  onClick={() => navigate('/feed')}
  className="text-xs text-indigo-600 cursor-pointer hover:underline font-medium"
>
  전체보기
</span>
          </div>
            
          <div className="grid grid-cols-2 gap-4">
            {lostItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-300 transition cursor-pointer flex flex-col shadow-sm">
                <div className="relative h-36 bg-slate-100">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                    {item.category}
                  </span>
                </div>
                <div className="p-3.5 flex flex-col justify-between flex-grow">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">📍 {item.location}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                    <span className="text-[10px] font-semibold text-indigo-600">상세보기 &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
      <BottomNav />
    </div>
  );
}