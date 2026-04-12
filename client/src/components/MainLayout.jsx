import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';
import ProfileSidebar from './ProfileSidebar';
import UpgradeModal from './UpgradeModal';
import PaymentModal from './PaymentModal';
import { apiRequest } from '../api/client.js';

export default function MainLayout({ children, title }) {
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [amount, setAmount] = useState({ amountCents: 499, amountFormatted: '₱4.99' });

  useEffect(() => {
    // Disable overscroll bounce on iOS
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, []);

  useEffect(() => {
    if (isUpgradeModalOpen || isPaymentModalOpen) {
      apiRequest('/api/auth/premium-upgrade-info')
        .then((data) => setAmount({ amountCents: data.amountCents, amountFormatted: data.amountFormatted || `₱${(data.amountCents / 100).toFixed(2)}` }))
        .catch(() => setAmount({ amountCents: 499, amountFormatted: '₱4.99' }));
    }
  }, [isUpgradeModalOpen, isPaymentModalOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#0891b2] to-[#06B6D4]">
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
      <ProfileSidebar 
        isOpen={isProfileSidebarOpen} 
        onClose={() => setIsProfileSidebarOpen(false)}
        onUpgradeClick={() => setIsUpgradeModalOpen(true)}
      />

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)}
        onProceedToPayment={() => {
          setIsUpgradeModalOpen(false);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={amount}
        onPaymentSuccess={() => {
          setIsPaymentModalOpen(false);
        }}
      />
    </div>
  );
}
