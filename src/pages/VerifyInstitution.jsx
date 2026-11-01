import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';

export default function VerifyInstitution() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    instName: '', 
    managerName: '', 
    email: '', 
    password: '' 
  });
  const [institutionFile, setInstitutionFile] = useState(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const getAuthToken = () => {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('access_token') ||
      ''
    );
  };

  const handleEmailVerify = async () => {
    if (!formData.email) {
      alert('먼저 기관 이메일을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('https://d2561q9uqrldal.cloudfront.net/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setIsEmailSent(true);
        alert(`${formData.email}로 인증 메일이 발송되었습니다. 메일함을 확인해주세요.`);
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || '인증 메일 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('이메일 전송 에러:', error);
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!institutionFile) {
      alert('기관 증명 파일(공문 또는 재직증명서 등)을 업로드해주세요.');
      return;
    }

    setLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch('https://d2561q9uqrldal.cloudfront.net/api/institutions/verification-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          institutionId: 1, // 소속 기관 ID
          evidence: `기관명: ${formData.instName}, 담당자: ${formData.managerName}, 첨부파일: ${institutionFile.name}`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        alert('기관 인증 신청이 완료되었습니다!\n운영자 승인 후 기관 관리자 권한으로 전환됩니다.');
        navigate('/mypage');
      } else {
        alert(data.message || '기관 인증 신청에 실패했습니다.');
      }
    } catch (error) {
      console.error('기관 인증 신청 에러:', error);
      alert('서버 통신 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
        <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full">
          기관 관리자 전용
        </span>
        <h1 className="text-xl font-bold text-slate-800 mt-3 mb-1">기관 계정 인증 신청</h1>
        <p className="text-xs text-slate-500 mb-6">학교 분실물 센터 및 관리부서 등록을 위한 서류를 제출해주세요.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">기관/부서 명</label>
            <input
              type="text"
              required
              placeholder="예: 학생지원팀 / 중앙도서관 분실물센터"
              value={formData.instName}
              onChange={(e) => setFormData({...formData, instName: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">담당자 이름</label>
            <input
              type="text"
              required
              placeholder="관리자 이름"
              value={formData.managerName}
              onChange={(e) => setFormData({...formData, managerName: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">기관 이메일</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="institution@korea.or.kr"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="flex-grow px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleEmailVerify}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1 flex-shrink-0"
              >
                {isEmailSent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Mail className="w-3.5 h-3.5 text-emerald-600" />}
                {isEmailSent ? '재전송' : '이메일 인증'}
              </button>
            </div>
            {isEmailSent && (
              <p className="text-[10px] text-emerald-600 mt-1 pl-1">✔️ 인증 메일이 발송되었습니다. 메일함의 링크를 확인해주세요.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">비밀번호</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 5. 기관 증명 파일 업로드 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">기관 증명 파일 (재직증명서, 공문 등)</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
              <div className="flex flex-col items-center justify-center pt-3 pb-3 px-4 text-center">
                {institutionFile ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                    <FileText className="w-4 h-4" />
                    <span className="truncate max-w-[240px]">{institutionFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <p className="text-xs text-slate-500"><span className="font-semibold text-emerald-600">파일 업로드</span> 또는 여기를 드래그하세요</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG (최대 10MB)</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                required
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setInstitutionFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 leading-relaxed">
              <span className="font-bold">안내:</span> 공문 양식이나 필요한 증빙 서류 가이드는 <button type="button" onClick={() => alert('관련 서류 다운로드 및 가이드 안내 페이지 준비 중')} className="underline font-semibold hover:text-amber-900">여기서 확인</button>하실 수 있습니다.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm disabled:opacity-50"
          >
            {loading ? '신청 처리 중' : '기관 인증 신청하기'}
          </button>

        </form>
      </div>
    </div>
  );
}