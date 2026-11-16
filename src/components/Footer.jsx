import { Link } from 'react-router-dom';
import { POLICE_LOST_URL } from '../lib/constants';

const SERVICE = [
  ['/', '홈'],
  ['/feed', '게시물'],
  ['/map', '지도'],
  ['/search', '사진으로 찾기'],
  ['/write', '습득물·분실물 등록'],
];

/** 사이트 하단 정보 */
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 mb-16 md:mb-0">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 sm:py-5 grid gap-4 sm:gap-5 sm:grid-cols-3 text-[13px]">
        <div>
          <p className="flex items-center gap-1.5 text-base font-black tracking-tight text-blue-600">
            <img src="/favicon.svg" alt="" className="w-5 h-5" />
            Foundit
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            사진 한 장으로 찾는 캠퍼스 분실물 서비스.
            <br />
            경찰청 유실물까지 함께 보여줘요.
          </p>
        </div>

        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-slate-900 mb-1.5">서비스</p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {SERVICE.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-slate-500 hover:text-slate-900">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-900 mb-1.5">분실물 도움말</p>
          <ul className="space-y-1 text-slate-500">
            <li>
              <a href={POLICE_LOST_URL} target="_blank" rel="noreferrer" className="hover:text-slate-900">경찰민원24 유실물 조회 ↗</a>
            </li>
            <li>분실물 신고 · 문의 <a href="tel:182" className="hover:text-slate-900">국번 없이 182</a></li>
            <li className="text-xs leading-relaxed">물건을 찾으러 갈 때는 신분증을 꼭 챙기세요.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-2.5 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:justify-between gap-1">
          <span>© 2026 Foundit. All rights reserved.</span>
          <span>경찰청 유실물 정보는 공공데이터포털 기준으로 6시간마다 갱신돼요.</span>
        </div>
      </div>
    </footer>
  );
}
