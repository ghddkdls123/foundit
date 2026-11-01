import React from 'react';
import { Link } from 'react-router-dom';

export default function SignupSelect() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-[420px] min-h-[475px] bg-white rounded-2xl shadow-lg p-8 border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="text-center mb-12">
            <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              AI 분실물 찾기 플랫폼
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-3">foundit</h1>
            <p className="text-sm text-slate-500 mt-1">가입하실 계정의 유형을 선택해주세요.</p>
          </div>

          <div className="space-y-3.5">
            
            <Link
              to="/signup/general"
              className="block w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm">
                    👤 일반 회원가입
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    분실물 등록 및 찾기를 이용하려는 일반 사용자
                  </p>
                </div>
                <span className="text-slate-400 group-hover:text-indigo-600">→</span>
              </div>
            </Link>

            <Link
              to="/signup/institution"
              className="block w-full p-3.5 rounded-xl border border-slate-200 hover:border-emerald-700 hover:bg-emerald-50/50 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700 text-sm">
                    🏢 기관 회원가입
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    학교, 경찰서, 기업 등 분실물 보관·관리 담당자
                  </p>
                </div>
                <span className="text-slate-400 group-hover:text-emerald-700">→</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-400">
            이미 계정이 있으신가요?</span>
          <Link
            to="/"
            className="text-xs font-semibold text-indigo-600 hover:underline ml-2">
            로그인하기
          </Link>
        </div>

      </div>
    </div>
  );
}