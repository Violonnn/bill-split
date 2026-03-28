import { useState } from 'react';
import Modal from './Modal';
import { Button } from './Button';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from './Alert';

export default function PaymentModal({ isOpen, onClose, amount, onPaymentSuccess }) {
  const { updateUser } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [paymentErrors, setPaymentErrors] = useState({});

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validatePaymentForm = () => {
    const errs = {};
    const digitsOnly = paymentForm.cardNumber.replace(/\s/g, '');
    if (digitsOnly.length < 13) errs.cardNumber = 'Enter a valid card number';
    if (!paymentForm.expiry || paymentForm.expiry.length < 5) errs.expiry = 'Enter MM/YY';
    if (!paymentForm.cvv || paymentForm.cvv.length < 3) errs.cvv = 'Enter CVV';
    if (!paymentForm.name?.trim()) errs.name = 'Enter cardholder name';
    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validatePaymentForm()) return;

    setPaying(true);
    try {
      const { user: updatedUser } = await apiRequest('/api/auth/upgrade-to-premium', {
        method: 'POST',
        body: JSON.stringify({ paymentConfirmed: true }),
      });
      updateUser(updatedUser);
      setPaymentForm({ cardNumber: '', expiry: '', cvv: '', name: '' });
      setPaymentErrors({});
      onPaymentSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Payment could not be completed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Payment"
      onClose={() => !paying && onClose()}
      size="md"
    >
      {error && <Alert type="error" message={error} />}

      <form onSubmit={handlePaymentSubmit} className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
          <span className="text-gray-600">Amount due</span>
          <span className="text-xl font-bold text-gray-900">{amount.amountFormatted}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Card number</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={paymentForm.cardNumber}
            onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
            placeholder="1234 5678 9012 3456"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] font-mono ${
              paymentErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={paying}
            maxLength={19}
          />
          {paymentErrors.cardNumber && (
            <p className="mt-1 text-sm text-red-600">{paymentErrors.cardNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Expiry (MM/YY)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={paymentForm.expiry}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
              placeholder="MM/YY"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                paymentErrors.expiry ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={paying}
              maxLength={5}
            />
            {paymentErrors.expiry && (
              <p className="mt-1 text-sm text-red-600">{paymentErrors.expiry}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">CVV</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={paymentForm.cvv}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="123"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                paymentErrors.cvv ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={paying}
              maxLength={4}
            />
            {paymentErrors.cvv && (
              <p className="mt-1 text-sm text-red-600">{paymentErrors.cvv}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Cardholder name</label>
          <input
            type="text"
            autoComplete="cc-name"
            value={paymentForm.name}
            onChange={(e) => setPaymentForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name on card"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
              paymentErrors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={paying}
          />
          {paymentErrors.name && (
            <p className="mt-1 text-sm text-red-600">{paymentErrors.name}</p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={paying}>
            {paying ? 'Processing...' : `Pay ${amount.amountFormatted}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
