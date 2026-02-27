import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/auth/welcome';
import Register from './pages/auth/register';
import Login from './pages/auth/login';
import ForgotPassword from './pages/auth/forgot-password';
import ResetPassword from './pages/auth/reset-password';
import GuestJoin from './pages/auth/guest-join';
import GuestUpgrade from './pages/auth/guest-upgrade';
import Dashboard from './pages/dashboard';
import BillView from './pages/bill-view';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bill/:id" element={<BillView />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/guest/join" element={<GuestJoin />} />
        <Route path="/guest/upgrade" element={<GuestUpgrade />} />
      </Routes>
    </Router>
  );
}

export default App;