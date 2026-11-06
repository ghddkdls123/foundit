import { Link } from 'react-router-dom';

export default function AuthCard({ subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-black tracking-tight text-indigo-600">foundit</Link>
          {subtitle && <p className="text-sm text-slate-500 mt-2">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">{children}</div>
        {footer && <div className="mt-5 text-center text-xs text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
