import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MainLayout from '../components/MainLayout';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { Crown, CreditCard, Zap, Users, FileText } from 'lucide-react';

/**
 * Premium upgrade page: benefits, price, and payment checkout.
 * Standard users complete payment to become Premium (mock payment – no charge).
 */
export default function Upgrade() {
  const navigate = useNavigate();
  const { user, updateUser, loading: authLoading } = useAuth();
  const [amount, setAmount] = useState({ amountCents: 499, amountFormatted: '$4.99' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [paymentErrors, setPaymentErrors] = useState({});

  useEffect(() => {
    apiRequest('/api/auth/premium-upgrade-info')
      .then((data) => setAmount({ amountCents: data.amountCents, amountFormatted: data.amountFormatted || `$${(data.amountCents / 100).toFixed(2)}` }))
      .catch(() => setAmount({ amountCents: 499, amountFormatted: '$4.99' }));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (user.userType === 'guest') {
      navigate('/profile');
      return;
    }
    if (user.userType === 'premium') {
      navigate('/profile');
      return;
    }
  }, [authLoading, user, navigate]);

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
      setShowPaymentModal(false);
      setPaymentForm({ cardNumber: '', expiry: '', cvv: '', name: '' });
      setPaymentErrors({});
      setSuccess('Payment successful. You are now a Premium user.');
      setTimeout(() => {
        setSuccess('');
        navigate('/profile');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Payment could not be completed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.userType === 'guest' || user.userType === 'premium') return null;

  const defaultName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <MainLayout title="Upgrade to Premium">
      <div className="max-w-2xl mx-auto">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
          <CardBody className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-100 rounded-xl">
                <Crown size={32} className="text-cyan-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Premium</h1>
                <p className="text-gray-600">Unlimited access for serious bill-splitters</p>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-gray-700">
                <FileText size={20} className="text-cyan-600 flex-shrink-0" />
                <span>Unlimited bills per month (Standard: max 5)</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Users size={20} className="text-cyan-600 flex-shrink-0" />
                <span>Unlimited people per bill (Standard: max 3)</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Zap size={20} className="text-cyan-600 flex-shrink-0" />
                <span>All Standard features, no limits</span>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
              <div>
                <p className="text-3xl font-bold text-gray-900">{amount.amountFormatted}</p>
                <p className="text-sm text-gray-500">one-time payment</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setPaymentForm((prev) => ({ ...prev, name: prev.name || defaultName }));
                  setError('');
                  setPaymentErrors({});
                  setShowPaymentModal(true);
                }}
                className="flex items-center gap-2"
              >
                <CreditCard size={20} />
                Pay with card
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Payment / Checkout modal */}
      <Modal
        isOpen={showPaymentModal}
        title="Payment"
        onClose={() => !paying && setShowPaymentModal(false)}
        size="md"
      >
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
            <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={paying}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={paying}>
              {paying ? 'Processing...' : `Pay ${amount.amountFormatted}`}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
