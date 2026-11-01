import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function SignupGeneral() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    verificationCode: '',
    email: '',
    password: '',
  });

  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [authMessage, setAuthMessage] = useState({ text: '', type: '' });
  const [loading, setLoading]= useState(false);

  const handlePhoneChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    
    if (rawValue.length > 11) return;

    let formattedValue = '';

    if (rawValue.length < 4) {
      formattedValue = rawValue;
    } else if (rawValue.length < 7) {
      formattedValue = `${rawValue.slice(0, 3)}-${rawValue.slice(3)}`;
    } else if (rawValue.length < 11) {
      formattedValue = `${rawValue.slice(0, 3)}-${rawValue.slice(3, 6)}-${rawValue.slice(6)}`;
    } else {
      formattedValue = `${rawValue.slice(0, 3)}-${rawValue.slice(3, 7)}-${rawValue.slice(7, 11)}`;
    }

    setFormData({ ...formData, phone: formattedValue });

    if (rawValue.length > 0 && rawValue.length < 11) {
      setPhoneError('휴대폰 번호 11자리를 모두 입력해주세요.');
    } else {
      setPhoneError('');
    }

    if (rawValue.length < 11) {
      setIsCodeSent(false);
      setAuthMessage({ text: '', type: '' });
    }
  };

  const handleSendCode = () => {
    setIsCodeSent(true);
    setAuthMessage({
      text: '인증번호가 발송되었습니다. (임시 인증번호: 1234)',
      type: 'success',
    });
  };

  const handleVerifyCode = () => {
    if (formData.verificationCode === '1234') {
      setIsVerified(true);
      setAuthMessage({
        text: '✓ 전화번호 인증이 완료되었습니다.',
        type: 'success',
      });
    } else {
      setAuthMessage({
        text: '인증번호가 일치하지 않습니다. (1234 입력)',
        type: 'error',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try{
      const response = await fetch('https://d2561q9uqrldal.cloudfront.net/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone
        }),
      });

      const data = await response.json();

      if (!response.ok){
        throw new Error(data.message || '회원가입에 실패했습니다.')
      }

      alert('일반 회원가입이 완료되었습니다!');
      navigate('/login');
    
    } catch (error){
      console.error('회원가입 통신 에러:', error);
      alert(error.message || '서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.');
    }finally{
      setLoading(false);
    }
  };


  const rawPhoneLength = formData.phone.replace(/[^0-9]/g, '').length;
  const isPhoneComplete = rawPhoneLength === 11;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-[420px] bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
        
        <div className="text-center mb-6">
          <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            AI 분실물 찾기 플랫폼
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-3">foundit</h1>
          <p className="text-sm text-slate-500 mt-1">일반 회원가입을 진행합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">이름</label>
            <input
              type="text"
              required
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">전화번호</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                maxLength={13}
                disabled={isVerified}
                placeholder="010-1234-5678"
                value={formData.phone}
                onChange={handlePhoneChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isPhoneComplete && !isVerified) {
                    e.preventDefault();
                    handleSendCode();
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isVerified || !isPhoneComplete}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCodeSent ? '재전송' : '인증요청'}
              </button>
            </div>
            
            {phoneError && (
              <p className="text-xs text-rose-500 font-medium text-left mt-1 ml-2">
                {phoneError}
              </p>
            )}
          </div>

          {isPhoneComplete && isCodeSent && !isVerified && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">인증번호</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="인증번호 4자리 입력 (1234)"
                  value={formData.verificationCode}
                  onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyCode();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition whitespace-nowrap shadow-sm"
                >
                  확인
                </button>
              </div>
            </div>
          )}

          {authMessage.text && (
            <p className={`text-xs text-left font-medium mt-1 ml-2 ${authMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
              {authMessage.text}
            </p>
          )}

          <div
            className={`transition-all duration-500 ease-in-out ${
              isVerified ? 'opacity-100 mt-4 space-y-4' : 'opacity-0 max-h-0 pointer-events-none'
            }`}
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">이메일</label>
              <input
                type="email"
                required={isVerified}
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 text-left ml-2">비밀번호</label>
              <input
                type="password"
                required={isVerified}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {isVerified && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm mt-4 animate-fadeIn"
            >
              {loading ? '가입 처리 중...' :'가입 완료'}
            </button>
          )}


        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-400">이미 계정이 있으신가요?</span>
          <Link to="/login" className="text-xs font-semibold text-indigo-600 hover:underline ml-2">
            로그인하기
          </Link>
        </div>

      </div>
    </div>
  );
}