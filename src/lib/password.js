// 백엔드 규칙: 8자 이상, 영문+숫자, 72바이트 이하 (회원가입·비밀번호 변경 공통)
export function passwordChecks(pw) {
  const bytes = new TextEncoder().encode(pw).length;
  return [
    { ok: pw.length >= 8, label: '8자 이상' },
    { ok: /[A-Za-z]/.test(pw) && /\d/.test(pw), label: '영문과 숫자 포함' },
    { ok: bytes <= 72, label: '너무 길지 않게 (한글 24자, 영문 72자 이하)' },
  ];
}
