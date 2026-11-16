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
function distanceKm(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

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

  const anim = useRef({ raf: 0, timers: [] });
  const wheelCleanup = useRef(null);

  const stopAnim = () => {
    cancelAnimationFrame(anim.current.raf);
    anim.current.timers.forEach(clearTimeout);
    anim.current = { raf: 0, timers: [] };
  };

  /** 중심 좌표를 부드럽게(천천히 출발 → 빠르게 → 천천히 도착) 옮김 */
  const glide = (map, kakao, from, to, duration, done) => {
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const k = ease(t);
      map.setCenter(new kakao.maps.LatLng(from.lat + (to.lat - from.lat) * k, from.lng + (to.lng - from.lng) * k));
      if (t < 1) anim.current.raf = requestAnimationFrame(step);
      else done?.();
    };
    anim.current.raf = requestAnimationFrame(step);
  };

  /** 확대 단계를 한 칸씩 부드럽게 (여러 칸을 한 번에 바꾸면 지도가 흐려짐) */
  const stepZoom = (map, endLevel, done) => {
    const cur = map.getLevel();
    if (cur === endLevel) return done?.();
    map.setLevel(cur + (endLevel > cur ? 1 : -1), { animate: { duration: 220 } });
    anim.current.timers.push(setTimeout(() => stepZoom(map, endLevel, done), 260));
  };

  /** 지도 상자에 CSS 효과 주기 (카카오 지도 자체가 아니라 보이는 화면만 움직임) */
  const setLook = (el, { scale = 1, x = 0, y = 0, opacity = 1 }, ms, easing = 'cubic-bezier(.4,0,.2,1)') => {
    el.style.transition = ms ? `transform ${ms}ms ${easing}, opacity ${ms}ms ${easing}` : 'none';
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    el.style.opacity = String(opacity);
  };

  /**
   * 아주 먼 곳: 카메라가 떠오르듯 화면이 작아지며 이동 방향 반대로 빠지고,
   * 새 위치 지도가 불러와지면 반대편에서 들어오며 커짐. (확대·축소를 CSS로 해서 흐려지지 않음)
   */
  const swoopJump = (map, kakao, target, endLevel, dir) => {
    const el = boxRef.current;
    const push = 90;
    setLook(el, { scale: 0.82, x: -dir.x * push, y: -dir.y * push, opacity: 0 }, 380, 'cubic-bezier(.5,0,.75,0)');
    anim.current.timers.push(
      setTimeout(() => {
        map.setLevel(endLevel);
        map.setCenter(target);
        setLook(el, { scale: 0.88, x: dir.x * push, y: dir.y * push, opacity: 0 }, 0);
        let shown = false;
        const show = () => {
          if (shown) return;
          shown = true;
          kakao.maps.event.removeListener(map, 'tilesloaded', show);
          requestAnimationFrame(() => setLook(el, {}, 520, 'cubic-bezier(.16,1,.3,1)'));
        };
        kakao.maps.event.addListener(map, 'tilesloaded', show);
        anim.current.timers.push(setTimeout(show, 600));
      }, 390),
    );
  };

  useImperativeHandle(ref, () => ({
    /** 확대(+1 → 더 가깝게는 -1) 버튼용 */
    zoomBy(delta) {
      const map = mapRef.current;
      if (!map) return;
      const level = Math.min(14, Math.max(1, map.getLevel() + delta));
      map.setLevel(level, { animate: { duration: 200 } });
    },
    /**
     * 부드럽게 이동
     * - 화면 근처: 스르륵 미끄러짐
     * - 조금 먼 곳: 한 칸씩 축소 → 미끄러짐 → 한 칸씩 확대 (실제로 날아가는 느낌)
     * - 아주 먼 곳: 화면이 빠졌다가 새 위치에서 들어오는 전환
     */
    panTo({ lat, lng }, newLevel) {
      const kakao = kakaoRef.current;
      const map = mapRef.current;
      const el = boxRef.current;
      if (!kakao || !map || !el) return;
      stopAnim();
      setLook(el, {}, 0);

      const target = new kakao.maps.LatLng(lat, lng);
      const c = map.getCenter();
      const from = { lat: c.getLat(), lng: c.getLng() };
      const to = { lat, lng };
      const startLevel = map.getLevel();
      const endLevel = newLevel ?? startLevel;

      // 목표가 지금 화면에서 화면 크기의 몇 배만큼 떨어져 있는지
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      let dx = 0;
      let dy = 0;
      if (map.getProjection) {
        const pt = map.getProjection().containerPointFromCoords(target);
        dx = pt.x - w / 2;
        dy = pt.y - h / 2;
      } else {
        dx = (distanceKm(from.lat, from.lng, lat, lng) / 2) * w;
      }
      const screens = Math.max(Math.abs(dx) / w, Math.abs(dy) / h);
      const len = Math.hypot(dx, dy) || 1;
      const dir = { x: dx / len, y: dy / len };

      if (screens <= 1.5) {
        glide(map, kakao, from, to, Math.min(800, 380 + len * 0.35), () => stepZoom(map, endLevel));
        return;
      }

      // 한 칸 축소할 때마다 화면상 거리가 절반이 됨 → 화면 1.2배 안에 들어올 만큼만 축소
      const outSteps = Math.ceil(Math.log2(screens / 1.2));
      if (outSteps <= 3) {
        const outLevel = Math.min(14, startLevel + outSteps);
        stepZoom(map, outLevel, () =>
          glide(map, kakao, from, to, 700, () => stepZoom(map, endLevel)),
        );
        return;
      }
      swoopJump(map, kakao, target, endLevel, dir);
    },
  }));

  useEffect(() => () => {
    stopAnim();
    wheelCleanup.current?.();
  }, []);

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
          scrollwheel: false, // 휠·트랙패드는 아래에서 직접 처리
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
        // 사용자가 지도를 직접 끌면 진행 중인 이동 애니메이션을 멈춤
        // 트랙패드: 두 손가락으로 밀면 이동, 핀치(ctrl+휠)는 확대·축소. 일반 마우스 휠은 확대·축소
        if (interactive) {
          let zoomAcc = 0;
          let lastZoom = 0;
          const onWheel = (e) => {
            e.preventDefault();
            const isPinch = e.ctrlKey;
            const isMouseWheel = !isPinch && e.deltaX === 0 && (e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY)));
            if (isPinch || isMouseWheel) {
              zoomAcc += e.deltaY;
              const now = Date.now();
              const threshold = isPinch ? 12 : 1;
              if (Math.abs(zoomAcc) >= threshold && now - lastZoom > 220) {
                const level = map.getLevel() + (zoomAcc > 0 ? 1 : -1);
                if (level >= 1 && level <= 14) {
                  // 커서 위치를 기준으로 확대·축소
                  const rect = boxRef.current.getBoundingClientRect();
                  const anchor = map.getProjection().coordsFromContainerPoint(new kakao.maps.Point(e.clientX - rect.left, e.clientY - rect.top));
                  map.setLevel(level, { anchor, animate: { duration: 200 } });
                }
                zoomAcc = 0;
                lastZoom = now;
              }
              return;
            }
            // 두 손가락 밀기 → 그만큼 지도 이동
            cancelAnimationFrame(anim.current.raf);
            anim.current.timers.forEach(clearTimeout);
            const proj = map.getProjection();
            const center = proj.containerPointFromCoords(map.getCenter());
            const next = proj.coordsFromContainerPoint(new kakao.maps.Point(center.x + e.deltaX, center.y + e.deltaY));
            map.setCenter(next);
          };
          boxRef.current.addEventListener('wheel', onWheel, { passive: false });
          wheelCleanup.current = () => boxRef.current?.removeEventListener('wheel', onWheel);
        }

        kakao.maps.event.addListener(map, 'dragstart', () => {
          cancelAnimationFrame(anim.current.raf);
          anim.current.timers.forEach(clearTimeout);
        });
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

  // className 에 absolute/fixed 가 있으면 relative 를 붙이지 않음 (둘이 같이 있으면 높이가 0이 됨)
  const position = /(^|\s)(absolute|fixed)(\s|$)/.test(className) ? '' : 'relative';

  return (
    <div className={`${position} overflow-hidden bg-slate-100 ${className}`}>
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
