import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function GuestJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const { login } = useAuth();
  const [step, setStep] = useState(codeFromUrl ? 'form' : 'code');
  const [code, setCode] = useState(codeFromUrl);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [codeValid, setCodeValid] = useState(false);

  const validateName = (v, name) => {
    if (!v?.trim()) return `${name} is required`;
    if (/\s/.test(v.trim())) return 'Spaces are not valid input';
    if (v.trim().length < 2) return `${name} must be at least 2 characters`;
    return null;
  };

  const validateEmail = (v) => {
    if (!v?.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address';
    return null;
  };

  const handleCheckCode = async (e) => {
    e.preventDefault();
    if (!code?.trim()) {
      setErrors({ code: 'Invitation code is required' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const res = await apiRequest('/api/guest/search-bill', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      if (res.billId) {
        setCodeValid(true);
        setStep('form');
      }
    } catch (err) {
      setErrors({ code: err.message || 'Invalid invitation code' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitGuestForm = async (e) => {
    e.preventDefault();

    const freshErrors = {};
    const fnErr = validateName(formData.firstName, 'First name');
    if (fnErr) freshErrors.firstName = fnErr;
    const lnErr = validateName(formData.lastName, 'Last name');
    if (lnErr) freshErrors.lastName = lnErr;
    const emailErr = validateEmail(formData.email);
    if (emailErr) freshErrors.email = emailErr;

    setErrors(freshErrors);
    if (Object.keys(freshErrors).length > 0) return;

    setSubmitting(true);

    try {
      const { user: userData, token, billId } = await apiRequest('/api/guest/join', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
        }),
      });

      login(userData, token);
      navigate(billId ? `/bill/${billId}` : '/');
    } catch (err) {
      setErrors({ email: err.message || 'Failed to join' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA] relative items-center justify-center px-12 py-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#06B6D4] rounded-full opacity-20" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#164E63] rounded-full opacity-20" />
        <div className="relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#164E63] mb-6">Join as Guest</h2>
          <p className="text-lg text-[#0E7490] mb-12 leading-relaxed">
            Enter the invitation code and your details to access the bill. No account required.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 border-2 border-white text-[#0E7490] text-base rounded-full font-semibold hover:bg-white hover:text-[#06B6D4] transition-all duration-300 transform hover:scale-105 focus:outline-none"
          >
            Back to Home
          </button>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-8 overflow-y-auto">
          <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-[#06B6D4] hover:text-[#0891b2] font-semibold transition md:hidden"
          >
            ← Back to Home
          </button>

            <h1 className="text-2xl font-bold text-[#164E63] mb-8">
              {step === 'code' ? 'Enter Invitation Code' : 'Your Information'}
            </h1>

            {step === 'code' ? (
              <form onSubmit={handleCheckCode} className="space-y-4">
                {errors.code && (
                  <div className="flex items-center gap-1 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    <AlertCircle size={16} /> {errors.code}
                  </div>
                )}
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="INVITATION CODE"
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm uppercase"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium disabled:opacity-70"
                >
                  {submitting ? 'Checking...' : 'Continue'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitGuestForm} className="space-y-4">
                {Object.values(errors).some(Boolean) && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {Object.values(errors).filter(Boolean).join('. ')}
                  </div>
                )}
                <div>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First Name"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last Name"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-[#06B6D4] hover:text-[#0891b2] text-sm font-semibold"
                >
                  ← Change code
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium disabled:opacity-70"
                >
                  {submitting ? 'Joining...' : 'Access Bill'}
                </button>
              </form>
            )}
          </div>
        </div>
    </div>
  );
}
