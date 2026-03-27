import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  FileText,
  Archive,
  User,
  LogOut,
  Menu,
  X,
  Receipt,
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/bills', icon: FileText, label: 'Bills' },
    { path: '/archive', icon: Archive, label: 'Archive' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#0891b2] to-[#06B6D4] text-white shadow-lg transform transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } z-40 md:z-10`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-6  border-cyan-400">
          <Receipt size={32} className="text-cyan-100" />
          <h1 className="text-2xl font-bold text-white">BillSplit</h1>
        </div>


        {/* Navigation Menu - same bright white as Logout for inactive items */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Features Section */}
          <div className="mb-4">
            <p className="text-xs font-bold text-cyan-100 uppercase tracking-widest px-4 mb-3">Features</p>
            <div className="space-y-2">
              {menuItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-colors ${
                    isActive(path)
                      ? 'bg-white text-[#0891b2] shadow-lg [&_svg]:text-[#0891b2]'
                      : '!text-white hover:bg-cyan-400/30 [&_svg]:!text-white'
                  }`}
                >
                  <Icon size={22} className="flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
