import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/UserLogin';
import SignupSelect from './pages/SignupSelect';
import SignupGeneral from './pages/SignupGeneral';
import VerifyInstitution from './pages/VerifyInstitution';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import FeedPage from './pages/Feedpage';
import FeedDetail from './pages/FeedDetail';
import WritePage from './pages/WritePage';
import MyPage from './pages/MyPage';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* 메인 페이지*/}
        <Route path="/" element={<Home />} />

        {/* 로그인 및 회원가입 */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupSelect />} />
        <Route path="/signup/general" element={<SignupGeneral />} />

        {/* 기관 인증 */}
        <Route path="/verifyinstitution" element={<VerifyInstitution />} />

        {/* 이메일 인증 라우트 */}
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* 일반 유저용 화면들 */}
        <Route path="/Home" element={<Home />} />
        <Route path="/MapPage" element={<MapPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/feed/:id" element={<FeedDetail />} />
        <Route path="/write" element={<WritePage />} />
        <Route path="/MyPage" element={<MyPage />} />

      </Routes>
    </Router>
  );
}

export default App;