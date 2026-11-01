import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  const isCalledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('인증 토큰이 존재하지 않습니다.');
      return;
    }

    if (isCalledRef.current) return;
    isCalledRef.current = true;

    const verifyEmail = async () => {
      try {
        const response = await fetch('https://d2561q9uqrldal.cloudfront.net/api/auth/email/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({}));

        // 200~299 (성공)
        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.message || '유효하지 않거나 만료된 인증 링크입니다.');
        }
      } catch (error) {
        console.error('이메일 인증 통신 에러:', error);
        setStatus('error');
        setErrorMessage('서버와의 통신에 실패했습니다.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-[420px] bg-white rounded-2xl shadow-lg p-8 border border-slate-100 text-center">
        {status === 'verifying' && (
          <div>
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-lg font-bold text-slate-800">이메일 인증을 진행 중입니다...</h2>
            <p className="text-xs text-slate-500 mt-2">잠시만 기다려 주세요.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-800">이메일 인증 완료!</h2>
            <p className="text-sm text-slate-500 mt-2 mb-6">성공적으로 인증되었습니다. 로그인 후 사용해 주세요.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm"
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
              ✕
            </div>
            <h2 className="text-xl font-bold text-slate-800">인증 실패</h2>
            <p className="text-sm text-rose-500 mt-2 mb-6">{errorMessage}</p>
            <Link
              to="/login"
              className="inline-block w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm"
            >
              로그인 페이지로 이동
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}