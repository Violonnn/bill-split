import { useState } from 'react';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';
import ProfileSidebar from './ProfileSidebar';

export default function MainLayout({ children, title }) {
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:ml-64 w-full">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="px-6 py-4 md:px-8 flex items-center justify-between">
            <div>
              {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
            </div>
            <ProfileDropdown onViewProfile={() => setIsProfileSidebarOpen(true)} />
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
