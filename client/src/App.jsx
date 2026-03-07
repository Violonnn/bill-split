import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Welcome from './pages/auth/welcome';
import Register from './pages/auth/register';
import Login from './pages/auth/login';
import ForgotPassword from './pages/auth/forgot-password';
import ResetPassword from './pages/auth/reset-password';
import GuestJoin from './pages/auth/guest-join';
import GuestUpgrade from './pages/auth/guest-upgrade';
import Dashboard from './pages/dashboard';
import Bills from './pages/bills';
import BillView from './pages/bill-view';
import EditBill from './pages/edit-bill';
import Profile from './pages/profile';
import Archive from './pages/archive';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/bill/:id" element={<BillView />} />
          <Route path="/edit-bill/:id" element={<EditBill />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/guest/join" element={<GuestJoin />} />
          <Route path="/guest/upgrade" element={<GuestUpgrade />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;