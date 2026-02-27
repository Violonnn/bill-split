import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/auth/welcome';
import Register from './pages/auth/register';
import Login from './pages/auth/login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;