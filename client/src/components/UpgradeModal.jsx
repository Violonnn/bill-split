import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Button } from './Button';
import { apiRequest } from '../api/client.js';
import { Crown, CreditCard, Zap, Users, FileText } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, onProceedToPayment }) {
  const [amount, setAmount] = useState({ amountCents: 499, amountFormatted: '₱4.99' });

  useEffect(() => {
    if (isOpen) {
      apiRequest('/api/auth/premium-upgrade-info')
        .then((data) => setAmount({ amountCents: data.amountCents, amountFormatted: data.amountFormatted || `₱${(data.amountCents / 100).toFixed(2)}` }))
        .catch(() => setAmount({ amountCents: 499, amountFormatted: '₱4.99' }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} title="Upgrade to Premium" onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Price Banner */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-6 border border-cyan-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">One-time payment</p>
              <p className="text-4xl font-bold text-cyan-600 mt-2">{amount.amountFormatted}</p>
              <p className="text-gray-600 text-sm mt-1">Lifetime Premium access</p>
            </div>
            <Crown size={48} className="text-cyan-600" />
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What you get:</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Zap size={20} className="text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Unlimited Bills Per Month</p>
                <p className="text-sm text-gray-600">Create unlimited bills and track expenses without limits</p>
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">Standard: Max 5 bills per month</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Users size={20} className="text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Unlimited People Per Bill</p>
                <p className="text-sm text-gray-600">Add as many participants as needed to each bill</p>
                <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">Standard: Max 3 people per bill</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <FileText size={20} className="text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">All Standard Features, No Limits</p>
                <p className="text-sm text-gray-600">Enjoy all features with unlimited access and no restrictions</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Info Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Secure Payment:</span> Your payment information is encrypted and secure. This is a one-time upgrade fee.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose} className="px-6">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onProceedToPayment?.();
            }}
            className="flex items-center gap-2 px-6"
          >
            <CreditCard size={18} />
            Proceed to Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
