import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import BottomNav from '../components/BottomNavBar';
import { 
  Search, 
  Navigation, 
  Layers, 
  Coffee,
  Utensils,
  Train,
  GraduationCap,
  ShoppingBag,
  FerrisWheel
} from 'lucide-react';


import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPage() {
  const navigate = useNavigate();
  
  // 중심 좌표 (서울 시청 기준)
  const [position, setPosition] = useState([37.566826, 126.978656]);
  const [markerPos, setMarkerPos] = useState(null);

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const currentPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(currentPos);
          setMarkerPos(currentPos);
        },
        (error) => {
          alert('위치 정보를 가져올 수 없습니다. GPS 권한을 확인해주세요.');
          console.error(error);
        },
        { enableHighAccuracy: true }
      );
    } else {
    }
  };

  const categories = [
    { name: '카페', icon: <Coffee className="w-3.5 h-3.5" /> },
    { name: '식당', icon: <Utensils className="w-3.5 h-3.5" /> },
    { name: '지하철역', icon: <Train className="w-3.5 h-3.5" /> },
    { name: '학교/학원', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { name: '쇼핑몰', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { name: '놀이공원', icon: <FerrisWheel className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="relative w-full h-screen bg-slate-100 overflow-hidden flex flex-col">
      
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer 
          center={position} 
          zoom={15} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markerPos && (
            <Marker position={markerPos}>
              <Popup>현재 선택된 위치입니다.</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <header className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-4 pb-2 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-slate-100">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="분실물, 장소, 지하철역 검색..." 
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>


        <div 
          className="max-w-md mx-auto pointer-events-auto flex gap-2 mt-2 overflow-x-auto py-1 px-1"
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

          {categories.map((cat, idx) => (
            <button 
              key={idx}
              className="whitespace-nowrap px-3.5 py-1.5 bg-white/95 backdrop-blur-md text-xs font-medium text-slate-700 rounded-full shadow-md border border-slate-100 hover:bg-violet-50 hover:text-violet-600 transition flex items-center gap-1.5"
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="absolute right-4 bottom-28 flex flex-col gap-3 z-[1000]">
        <button 
          className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 text-slate-700 hover:bg-slate-50 transition active:scale-95"
          title="지도 레이어"
        >
          <Layers className="w-5 h-5 text-slate-600" />
        </button>
        <button 
          onClick={handleCurrentLocation}
          className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 text-violet-600 hover:bg-violet-50 transition active:scale-95"
          title="현재 위치"
        >
          <Navigation className="w-5 h-5 fill-violet-100" />
        </button>
      </div>

      <div className="relative z-[1000] mt-auto">
        <BottomNav />
      </div>

    </div>
  );
}