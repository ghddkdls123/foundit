import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MapPinOff } from 'lucide-react';
import { loadKakao, markerImage } from '../lib/kakao';

/**
 * 카카오맵 공통 컴포넌트
 * - markers: [{ id, lat, lng, kind: 'FOUND'|'LOST'|'ME', title }]
 * - onMarkerClick(marker)
 * - pick: { lat, lng } 선택한 위치 핀 (글쓰기용), onPick({lat,lng}) 지도를 누르면 호출
 * - onIdle({ minLat, maxLat, minLng, maxLng }) 지도 이동이 끝날 때마다
 * - interactive=false 면 고정 지도 (상세 화면)
 * ref 로 panTo({lat,lng}) 사용 가능
 */
const KakaoMap = forwardRef(function KakaoMap(
  { center, level = 4, markers = [], onMarkerClick, pick, onPick, onIdle, interactive = true, className = '' },
  ref,
) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const kakaoRef = useRef(null);
  const markerObjs = useRef([]);
  const pickObj = useRef(null);
  const handlers = useRef({});
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  handlers.current = { onMarkerClick, onPick, onIdle };

  useImperativeHandle(ref, () => ({
    panTo({ lat, lng }, newLevel) {
      const kakao = kakaoRef.current;
      if (!kakao || !mapRef.current) return;
      if (newLevel) mapRef.current.setLevel(newLevel);
      mapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
    },
  }));

  // 지도 만들기 (한 번)
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !boxRef.current) return;
        kakaoRef.current = kakao;
        const map = new kakao.maps.Map(boxRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level,
          draggable: interactive,
          scrollwheel: interactive,
          disableDoubleClickZoom: !interactive,
        });
        mapRef.current = map;

        kakao.maps.event.addListener(map, 'click', (e) => {
          const ll = e.latLng;
          handlers.current.onPick?.({ lat: ll.getLat(), lng: ll.getLng() });
        });
        const emitIdle = () => {
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          handlers.current.onIdle?.({ minLat: sw.getLat(), maxLat: ne.getLat(), minLng: sw.getLng(), maxLng: ne.getLng() });
        };
        kakao.maps.event.addListener(map, 'idle', emitIdle);
        setReady(true);
        emitIdle();
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상세 화면처럼 center 가 바뀌면 따라가기 (고정 지도만)
  useEffect(() => {
    if (!ready || interactive) return;
    const kakao = kakaoRef.current;
    mapRef.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
  }, [ready, interactive, center.lat, center.lng]);

  // 마커 다시 그리기
  useEffect(() => {
    if (!ready) return;
    const kakao = kakaoRef.current;
    markerObjs.current.forEach((m) => m.setMap(null));
    markerObjs.current = markers.map((m) => {
      const marker = new kakao.maps.Marker({
        map: mapRef.current,
        position: new kakao.maps.LatLng(m.lat, m.lng),
        image: markerImage(kakao, m.kind),
        title: m.title,
        clickable: true,
        zIndex: m.kind === 'ME' ? 1 : 2,
      });
      kakao.maps.event.addListener(marker, 'click', () => handlers.current.onMarkerClick?.(m));
      return marker;
    });
  }, [ready, markers]);

  // 선택 핀
  useEffect(() => {
    if (!ready) return;
    const kakao = kakaoRef.current;
    if (!pick) {
      pickObj.current?.setMap(null);
      pickObj.current = null;
      return;
    }
    const pos = new kakao.maps.LatLng(pick.lat, pick.lng);
    if (!pickObj.current) {
      pickObj.current = new kakao.maps.Marker({ map: mapRef.current, position: pos, image: markerImage(kakao, 'PICK'), zIndex: 3 });
    } else {
      pickObj.current.setPosition(pos);
    }
  }, [ready, pick]);

  // 컨테이너 크기가 바뀌면 지도 다시 맞추기
  useEffect(() => {
    if (!ready || !boxRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => mapRef.current?.relayout());
    ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [ready]);

  return (
    <div className={`relative bg-slate-100 ${className}`}>
      <div ref={boxRef} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6 text-xs text-slate-500 bg-slate-100">
          <MapPinOff className="w-6 h-6 text-slate-400" />
          <p>{error}</p>
          <p className="text-[11px] text-slate-400">카카오 개발자 콘솔에 이 주소(도메인)가 등록돼 있는지 확인해주세요.</p>
        </div>
      )}
    </div>
  );
});

export default KakaoMap;
