import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 이메일 미인증 상태 관리
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // 60초 타이머
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://d2561q9uqrldal.cloudfront.net/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.token || data.accessToken || data.accesstoken);
        if (email) {
          localStorage.setItem('userEmail', email);
        }
        
        if (data.name) {
          localStorage.setItem('userName', data.name);
        } else {
          localStorage.setItem('userName', email.split('@')[0]);
        }

        // 이메일 미인증 상태 체크
        if (data.emailVerified === false) {
          setUnverifiedEmail(email);
        } else {
          setUnverifiedEmail('');
        }

        if (email.includes('admin')) {
          alert('기관 관리자로 로그인되었습니다.');
          navigate('/admin');
        } else {
          alert('로그인 성공!');
          navigate('/home');
        }
      } else {
        alert(data.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      console.error('통신 에러:', error);
      alert('서버와 연결할 수 없습니다. 네트워크를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 재발송 요청
  const handleResendEmail = async () => {
    if (cooldown > 0 || !unverifiedEmail) return;
    setResendLoading(true);

    try {
      const response = await fetch('https://d2561q9uqrldal.cloudfront.net/api/auth/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      if (response.ok) {
        alert('인증 메일이 재발송되었습니다. 메일함을 확인해주세요.');
        setCooldown(60);
      } else {
        alert('인증 메일 재발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('재발송 에러:', error);
      alert('서버 통신 에러가 발생했습니다.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-[420px] bg-white rounded-2xl shadow-lg p-8 border border-slate-100 flex flex-col justify-between">
        <div>
          <div className="text-center mb-6">
            <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              AI 분실물 찾기 플랫폼
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-3">foundit</h1>
            <p className="text-sm text-slate-500 mt-1">분실물 찾기와 습득신고는 foundit에서</p>
          </div>

          {/* 이메일 미인증 안내 박스 */}
          {unverifiedEmail && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                ⚠️ 이메일 인증이 아직 완료되지 않았습니다. 관리자 승인 후 이용 가능합니다.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">이메일</label>
              <input
                type="email"
                required
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">비밀번호</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition shadow-sm text-sm disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-400">
            아직 계정이 없으신가요?
          </span>
          <Link
            to="/signup"
            className="text-xs font-semibold text-indigo-600 hover:underline ml-2"
          >
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}