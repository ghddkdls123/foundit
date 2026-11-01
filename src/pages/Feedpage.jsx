import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNavBar';

export default function FeedPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthToken = () => {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('access_token') ||
      ''
    );
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = getAuthToken();
        console.log('🔥 [피드조회] 사용할 토큰 존재 여부:', !!token);

        const response = await fetch('/api/items', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        console.log('🔥 [피드조회] 응답 상태코드:', response.status);

        if (!response.ok) {
          const errText = await response.text();
          console.error('🔥 [피드조회 실패 응답]:', errText);
          throw new Error(`목록 조회 실패 (상태코드: ${response.status})`);
        }

        const data = await response.json();
        console.log('🔥 [피드조회] 서버 응답 원본 데이터:', data);

        // 💡 배열 추출 방어 (서버가 주는 구조에 맞게 유연하게 대처)
        let itemsArray = [];
        if (Array.isArray(data)) {
          itemsArray = data;
        } else if (data && Array.isArray(data.items)) {
          itemsArray = data.items;
        } else if (data && Array.isArray(data.content)) {
          itemsArray = data.content;
        } else if (data && Array.isArray(data.data)) {
          itemsArray = data.data;
        }

        console.log('🔥 [피드조회] 추출된 아이템 배열:', itemsArray);

        const formattedItems = itemsArray.map(item => {
          let resolvedImg = item.thumbnailUrl || item.imageUrl || '';
          if (!resolvedImg && Array.isArray(item.imageUris) && item.imageUris.length > 0) {
            resolvedImg = item.imageUris[0];
          }

          let resolvedAuthor = '익명';
          if (item.author) {
            if (typeof item.author === 'string') resolvedAuthor = item.author;
            else if (typeof item.author === 'object') resolvedAuthor = item.author.name || item.author.username || '작성자';
          } else if (item.authorName || item.writer || item.institution) {
            resolvedAuthor = item.authorName || item.writer || item.institution;
          }

          return {
            id: item.id ?? item.itemId,
            type: item.type ? item.type.toLowerCase() : 'found',
            title: item.title ?? '제목 없음',
            storageLocation: item.storageLocation ?? item.location ?? '장소 미입력',
            date: item.createdAt ?? item.date ?? '',
            category: item.category ?? '기타',
            img: resolvedImg,
            author: String(resolvedAuthor)
          };
        });

        setFeedItems(formattedItems);
      } catch (error) {
        console.error('🔥 [피드 로딩 에러 발생]:', error);
        setFeedItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = feedItems.filter(item => {
    if (filterType === 'found') return item.type === 'found';
    if (filterType === 'lost') return item.type === 'lost';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <TopBar />
      <main className="flex-grow pt-20 px-6 pb-24 max-w-7xl mx-auto w-full">
        <div className="my-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">전체 게시물 피드</h1>
          <p className="text-xs text-slate-500 mt-1">캠퍼스 내 모든 습득물과 분실신고를 확인하세요.</p>
        </div>

        <div className="flex gap-2 my-4">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${filterType === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            전체 보기
          </button>
          <button
            onClick={() => setFilterType('found')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${filterType === 'found' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            🏷️ 습득물
          </button>
          <button
            onClick={() => setFilterType('lost')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${filterType === 'lost' ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            🔍 분실 요청글
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-xs text-slate-400">게시글을 불러오는 중입니다...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 mt-4">
            등록된 게시글이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/feed/${item.id}`)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-300 transition cursor-pointer flex flex-col shadow-sm"
              >
                <div className="relative h-36 bg-slate-100 flex items-center justify-center">
                  {item.img ? (
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-slate-400">이미지 없음</span>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm ${
                    item.type === 'found' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {item.type === 'found' ? '습득물' : '분실요청'}
                  </span>
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                </div>

                <div className="p-3.5 flex flex-col justify-between flex-grow">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">📍 {item.storageLocation}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : ''} · {item.author}</span>
                    <span className="text-[10px] font-semibold text-indigo-600">상세 &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}