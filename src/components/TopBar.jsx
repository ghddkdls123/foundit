import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const getSecondLetter = (name) => {
    if (!name) return '유저';
    let cleanName = name;
    if (name.includes('@')) {
      cleanName = name.split('@')[0];
    }
    if (cleanName.length >= 2) {
      return cleanName[1];
    }
    return cleanName[0];
  };

  const handleUserClick = () => {
    if (userName) {
      navigate('/mypage');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-50 shadow-sm">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <span className="text-xl font-black tracking-wider text-indigo-600">foundit</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition">
          🔔
        </button>
        
        {userName ? (
          <div 
            onClick={handleUserClick}
            className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-indigo-100 transition"
            title="마이페이지로 이동"
          >
            {getSecondLetter(userName)}
          </div>
        ) : (
          <button 
            onClick={handleUserClick}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}