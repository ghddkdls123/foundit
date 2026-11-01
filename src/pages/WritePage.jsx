import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import TopBar from '../components/TopBar';
import BottomNav from '../components/BottomNavBar';
import { ArrowLeft, Camera, MapPin, X } from 'lucide-react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationSelector({ position, setPosition, setFormData }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      setFormData(prev => ({
        ...prev,
        locationLat: lat,
        locationLng: lng
      }));
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function WritePage() {
  const navigate = useNavigate();
  const isCheckedRef = useRef(false);

  const [postType, setPostType] = useState('found');
  const [formData, setFormData] = useState({
    title: '',
    category: '전자기기',
    location: '',
    content: '',
    locationLat: 36.799,
    locationLng: 127.114
  });
  
  const [position, setPosition] = useState([36.799, 127.114]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

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
    if (isCheckedRef.current) return;
    isCheckedRef.current = true;

    const token = getAuthToken();
    if (!token) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const token = getAuthToken();
    if (!token) {
      alert('로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
      navigate('/login');
      return;
    }

    try {
      // 💡 location 필드 대신 스웨거 명세에 맞춰 storageLocation으로 전달
      const payload = {
        title: formData.title,
        type: postType === 'found' ? 'FOUND' : 'LOST',
        category: formData.category,
        locationLat: formData.locationLat,
        locationLng: formData.locationLng,
        storageLocation: formData.location,
        content: formData.content
      };

      console.log('🔥 [작성요청 Payload]:', payload);

      const itemResponse = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const itemResponseText = await itemResponse.text();
      let itemData = {};
      try {
        itemData = itemResponseText ? JSON.parse(itemResponseText) : {};
      } catch (e) {}

      if (!itemResponse.ok) {
        throw new Error(itemData.message || '게시글 등록에 실패했습니다.');
      }

      const itemId = itemData.id || itemData.itemId || itemData.data?.id;

      if (imageFile && itemId) {
        const urlResponse = await fetch(`/api/items/${itemId}/images/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            filename: imageFile.name,
            contentType: imageFile.type
          })
        });

        const urlResponseText = await urlResponse.text();
        let urlData = {};
        try {
          urlData = urlResponseText ? JSON.parse(urlResponseText) : {};
        } catch (e) {}

        if (!urlResponse.ok) {
          throw new Error(urlData.message || '사진 업로드 URL 발급에 실패했습니다.');
        }

        const { uploadUrl, key } = urlData;

        if (uploadUrl && key) {
          const s3Response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': imageFile.type },
            body: imageFile
          });

          if (!s3Response.ok) {
            throw new Error('S3 이미지 업로드에 실패했습니다.');
          }

          const imageRegisterResponse = await fetch(`/api/items/${itemId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ key })
          });

          if (!imageRegisterResponse.ok) {
            throw new Error('이미지 정보 등록에 실패했습니다.');
          }
        }
      }

      alert('게시글과 사진이 성공적으로 등록되었습니다!');
      navigate('/feed');
    } catch (error) {
      console.error('등록 에러:', error);
      alert(error.message || '서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <TopBar />
      <main className="flex-grow pt-20 px-6 pb-28 max-w-xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>돌아가기</span>
          </button>
          <h1 className="text-base font-bold text-slate-800">새 글 작성하기</h1>
          <div className="w-12"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/70 rounded-2xl">
            <button
              type="button"
              onClick={() => setPostType('found')}
              className={`py-3 rounded-xl text-xs font-bold transition shadow-sm ${
                postType === 'found' ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              🏷️ 습득물 신고
            </button>
            <button
              type="button"
              onClick={() => setPostType('lost')}
              className={`py-3 rounded-xl text-xs font-bold transition shadow-sm ${
                postType === 'lost' ? 'bg-amber-600 text-white' : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              🔍 분실물 찾기 (요청)
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2 shadow-sm relative">
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden" 
              id="image-upload"
            />
            
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-slate-900/60 hover:bg-slate-900 text-white p-1.5 rounded-full transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label htmlFor="image-upload" className="cursor-pointer block space-y-2 py-2">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 hover:bg-slate-200 transition">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-xs font-medium text-slate-600">물품 사진을 업로드해주세요</p>
                <p className="text-[10px] text-slate-400">선택사항이지만 등록하면 주인을 찾을 확률이 높아져요!</p>
              </label>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">제목</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={postType === 'found' ? '예: [중앙도서관] 에어팟 프로 습득했습니다' : '예: 중앙도서관에서 지갑을 잃어버렸습니다ㅠㅠ'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">카테고리</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 transition"
                >
                  <option value="전자기기">전자기기</option>
                  <option value="지갑/카드">지갑/카드</option>
                  <option value="귀중품">귀중품</option>
                  <option value="가방">가방</option>
                  <option value="의류">의류</option>
                  <option value="우산">우산</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {postType === 'found' ? '습득 장소' : '분실 장소'}
                </label>
                <input 
                  type="text" 
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder={postType === 'found' ? '예: 중앙도서관 3층 보관' : '예: 중앙도서관 1층 로비'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">지도에서 위치 지정</label>
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 isolate">
                <MapContainer 
                  center={position} 
                  zoom={16} 
                  style={{ width: '100%', height: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationSelector 
                    position={position} 
                    setPosition={setPosition} 
                    setFormData={setFormData} 
                  />
                </MapContainer>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">지도를 클릭하면 해당 위치의 위도/경도가 백엔드 전송용으로 자동 지정됩니다.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">상세 내용</label>
              <textarea 
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows="4"
                placeholder="물품의 특징, 상태 등 상세한 내용을 적어주세요."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 transition resize-none"
                required
              ></textarea>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition text-sm shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? '등록 중...' : '게시글 등록하기'}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}