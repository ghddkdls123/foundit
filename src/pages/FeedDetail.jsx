import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import TopBar from '../components/TopBar';
import { ArrowLeft, MapPin, User, Trash2, Edit3, MoreVertical, Check, X, Building2 } from 'lucide-react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function FeedDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    location: '',
    content: ''
  });

  const menuRef = useRef(null);

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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchItemDetail = async () => {
      if (!id || id === 'feed') {
        setLoading(false);
        return;
      }

      try {
        const token = getAuthToken();
        const response = await fetch(`/api/items/${id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) throw new Error('상세 조회 실패');
        const json = await response.json();
        const data = json.item || json.data || json;

        let resolvedImg = '';
        if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
          resolvedImg = data.imageUrls[0];
        } else if (data.thumbnailUrl) {
          resolvedImg = data.thumbnailUrl;
        } else if (data.imageUrl) {
          resolvedImg = data.imageUrl;
        }

       // 💡 테스트용으로 강제 true 설정 (나중에 백 연동 후 아래 원래 코드로 복구예정)
        const isInstitutionAcc = true; 
        /* 원래 코드:
        // 💡 기관 계정 여부 판단 (role, isInstitution, authorType 등이 'INSTITUTION' 이거나 백엔드 필드에 맞게 매핑)
        const isInstitutionAcc = 
          data.isInstitution || 
          data.role === 'INSTITUTION' || 
          data.authorType === 'INSTITUTION' ||
          data.institution != null;
        */
        const fetchedData = {
          id: data.id ?? data.itemId,
          type: data.type ? data.type.toLowerCase() : 'found',
          title: data.title ?? '',
          category: data.category ?? '',
          status: data.status ?? '',
          location: data.storageLocation ?? data.location ?? data.place ?? '장소 미입력',
          content: data.content ?? data.description ?? data.text ?? data.memo ?? data.body ?? '작성된 상세 내용이 없습니다.',
          img: resolvedImg,
          authorName: data.authorName ?? (data.author && data.author.name) ?? '작성자',
          isMine: data.isMine ?? data.mine ?? false,
          isInstitution: isInstitutionAcc, // 기관 계정 여부 저장
          lat: data.locationLat ?? data.lat ?? 36.799,
          lng: data.locationLng ?? data.lng ?? 127.114,
          date: data.createdAt ?? data.date ?? ''
        };

        setItem(fetchedData);
        setEditForm({
          title: fetchedData.title,
          location: fetchedData.location,
          content: fetchedData.content
        });
      } catch (error) {
        console.error('상세 조회 에러:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetail();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">불러오는 중...</div>;
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-500 space-y-4">
        <p>게시글 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/feed')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl">목록으로</button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      try {
        const token = getAuthToken();
        const res = await fetch(`/api/items/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('삭제 실패');
        alert('게시글이 삭제되었습니다.');
        navigate('/feed');
      } catch (e) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleUpdateSubmit = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editForm.title,
          storageLocation: editForm.location,
          content: editForm.content
        })
      });

      if (!response.ok) throw new Error('수정 실패');

      setItem(prev => ({
        ...prev,
        title: editForm.title,
        location: editForm.location,
        content: editForm.content
      }));

      setIsEditing(false);
      alert('게시글이 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('수정 에러:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <TopBar />
      <main className="flex-grow pt-20 px-6 pb-24 max-w-2xl mx-auto w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>돌아가기</span>
        </button>

        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative">
          
          <div className="relative h-64 sm:h-80 bg-slate-100 flex items-center justify-center">
            {item.img ? (
              <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">등록된 이미지가 없습니다.</span>
            )}

            <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-xl shadow-md ${
              item.type === 'found' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {item.type === 'found' ? '🏷️ 습득물' : '🔍 분실요청'}
            </span>

            {item.isMine && !isEditing && (
              <div className="absolute top-4 right-4" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition shadow-lg"
                  title="메뉴"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button 
                      onClick={() => { setIsMenuOpen(false); setIsEditing(true); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>수정하기</span>
                    </button>
                    <button 
                      onClick={() => { setIsMenuOpen(false); handleDelete(); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition border-t border-slate-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>삭제하기</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg">{item.category}</span>
                {item.date && <span className="text-xs text-slate-400">{new Date(item.date).toLocaleString()}</span>}
                
                {/* 기관 계정 글일 때만 '인증 기관 보관중' 뱃지 표시 */}
                {item.isInstitution && (
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-lg ml-auto flex items-center gap-1 border border-indigo-100 shadow-sm">
                    <Building2 className="w-3 h-3" /> 인증 기관 보관중
                  </span>
                )}
              </div>

              {isEditing ? (
                <input 
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full text-lg font-bold text-slate-900 border border-indigo-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="제목을 입력하세요"
                />
              ) : (
                <h1 className="text-xl font-bold text-slate-900">{item.title}</h1>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="flex items-center gap-2 flex-grow">
                  장소: 
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="flex-grow bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none"
                    />
                  ) : (
                    <strong className="text-slate-800">{item.location}</strong>
                  )}
                </span>
              </div>
              {item.authorName && (
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <User className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>작성자: <strong className="text-slate-800">{item.authorName}</strong></span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">등록된 위치 지도</label>
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 isolate">
                <MapContainer 
                  center={[item.lat, item.lng]} 
                  zoom={16} 
                  style={{ width: '100%', height: '100%' }}
                  dragging={false}
                  zoomControl={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[item.lat, item.lng]} />
                </MapContainer>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">상세 내용</h3>
              {isEditing ? (
                <textarea 
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={5}
                  className="w-full text-sm text-slate-700 bg-white border border-indigo-300 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                  placeholder="상세 내용을 입력하세요"
                />
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {item.content}
                </p>
              )}
            </div>

            {isEditing && (
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition"
                >
                  <X className="w-4 h-4" /> 취소
                </button>
                <button 
                  onClick={handleUpdateSubmit} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition"
                >
                  <Check className="w-4 h-4" /> 수정 완료
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}