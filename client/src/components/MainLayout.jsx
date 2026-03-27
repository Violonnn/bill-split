import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';
import ProfileSidebar from './ProfileSidebar';

export default function MainLayout({ children, title }) {
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

  useEffect(() => {
    // Disable overscroll bounce on iOS
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 w-full overflow-x-hidden">
        {/* Header */}
        <div className="pt-4 bg-gradient-to-b from-[#0891b2] to-[#06B6D4]">
          <div className="bg-white shadow-sm rounded-t-lg mx-0">
            <div className="px-6 py-4 md:px-8 flex items-center justify-between">
              <div>
                {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
              </div>
              <ProfileDropdown onViewProfile={() => setIsProfileSidebarOpen(true)} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Profile Sidebar */}
      <ProfileSidebar isOpen={isProfileSidebarOpen} onClose={() => setIsProfileSidebarOpen(false)} />
    </div>
  );
}
