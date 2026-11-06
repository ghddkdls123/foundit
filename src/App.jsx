import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isLoggedIn } from './lib/api';
import Home from './pages/Home';
import FeedPage from './pages/Feedpage';
import FeedDetail from './pages/FeedDetail';
import PublicDetail from './pages/PublicDetail';
import MapPage from './pages/MapPage';
import WritePage from './pages/WritePage';
import MatchResult from './pages/MatchResult';
import PhotoSearch from './pages/PhotoSearch';
import Login from './pages/UserLogin';
import SignupGeneral from './pages/SignupGeneral';
import VerifyEmail from './pages/VerifyEmail';
import MfaSetup from './pages/MfaSetup';
import VerifyInstitution from './pages/VerifyInstitution';
import MyPage from './pages/MyPage';

/** 로그인이 필요한 화면: 로그인 후 원래 화면으로 돌아옵니다 */
function RequireAuth({ children }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/feed/:id" element={<FeedDetail />} />
        <Route path="/public/:id" element={<PublicDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/write" element={<RequireAuth><WritePage /></RequireAuth>} />
        <Route path="/items/:id/matches" element={<MatchResult />} />
        <Route path="/search" element={<RequireAuth><PhotoSearch /></RequireAuth>} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupGeneral />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/mfa" element={<RequireAuth><MfaSetup /></RequireAuth>} />
        <Route path="/verify-institution" element={<RequireAuth><VerifyInstitution /></RequireAuth>} />
        <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />

        {/* 예전 주소 호환 */}
        <Route path="/Home" element={<Navigate to="/" replace />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/MapPage" element={<Navigate to="/map" replace />} />
        <Route path="/MyPage" element={<Navigate to="/mypage" replace />} />
        <Route path="/verifyinstitution" element={<Navigate to="/verify-institution" replace />} />
        <Route path="/signup/general" element={<Navigate to="/signup" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
