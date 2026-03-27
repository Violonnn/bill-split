import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, User, Crown, Lock } from 'lucide-react';

export default function ProfileSidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const [isRendered, setIsRendered] = useState(isOpen);

  if (!user) return null;

  const statusLabel = user.userType.charAt(0).toUpperCase() + user.userType.slice(1);
  const fullName = `${user.firstName} ${user.lastName}`;

  // Handle rendering lifecycle
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <>
      {/* Overlay */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(100%);
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeInOverlay {
          from {
            opacity: 0;
            background-color: rgba(0, 0, 0, 0);
          }
          to {
            opacity: 1;
            background-color: rgba(0, 0, 0, 0.5);
          }
        }

        @keyframes fadeOutOverlay {
          from {
            opacity: 1;
            background-color: rgba(0, 0, 0, 0.5);
          }
          to {
            opacity: 0;
            background-color: rgba(0, 0, 0, 0);
          }
        }

        .sidebar-open {
          animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .sidebar-close {
          animation: slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .overlay-open {
          animation: fadeInOverlay 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .overlay-close {
          animation: fadeOutOverlay 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .info-card {
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          opacity: 0;
        }

        .info-card:nth-child(1) { animation-delay: 0.15s; }
        .info-card:nth-child(2) { animation-delay: 0.25s; }
        .info-card:nth-child(3) { animation-delay: 0.35s; }
        .info-card:nth-child(4) { animation-delay: 0.45s; }
      `}</style>

      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 ${isOpen ? 'overlay-open' : 'overlay-close'}`}
      />

      <div
        className={`fixed right-0 top-0 h-screen w-80 bg-white shadow-2xl z-50 ${
          isOpen ? 'sidebar-open' : 'sidebar-close'
        }`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg transform transition-transform hover:scale-105">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">{fullName}</h3>
            <div className="mt-2 flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
              <Crown size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">{statusLabel}</span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            {/* Email */}
            <div className="info-card bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={18} className="text-gray-600" />
                <label className="text-sm font-semibold text-gray-600">Email</label>
              </div>
              <p className="text-sm text-gray-900 font-medium break-all">{user.email}</p>
            </div>

            {/* First Name */}
            <div className="info-card bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-gray-600" />
                <label className="text-sm font-semibold text-gray-600">First Name</label>
              </div>
              <p className="text-sm text-gray-900 font-medium">{user.firstName}</p>
            </div>

            {/* Last Name */}
            <div className="info-card bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-gray-600" />
                <label className="text-sm font-semibold text-gray-600">Last Name</label>
              </div>
              <p className="text-sm text-gray-900 font-medium">{user.lastName}</p>
            </div>

            {/* Account Type Info */}
            {user.userType === 'premium' && (
              <div className="info-card bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={18} className="text-yellow-600" />
                  <label className="text-sm font-semibold text-yellow-600">Premium Account</label>
                </div>
                <p className="text-sm text-yellow-700">Enjoy all premium features</p>
              </div>
            )}

            {user.userType === 'guest' && (
              <div className="info-card bg-purple-50 border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={18} className="text-purple-600" />
                  <label className="text-sm font-semibold text-purple-600">Guest Account</label>
                </div>
                <p className="text-sm text-purple-700">Limited access mode</p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
