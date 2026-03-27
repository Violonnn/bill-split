import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function GuestJoin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const { login } = useAuth();
  const [step, setStep] = useState(codeFromUrl ? 'email' : 'code');
  const [code, setCode] = useState(codeFromUrl);
  const [emailOnly, setEmailOnly] = useState('');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [codeValid, setCodeValid] = useState(false);
  const [upgradePromptMessage, setUpgradePromptMessage] = useState('');

  useEffect(() => {
    if (location.state?.fromLogin && location.state?.message) {
      setUpgradePromptMessage(location.state.message);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.state?.fromLogin, location.state?.message, location.pathname, location.search, navigate]);

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
      setErrors({ code: 'Invitation code required' });
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
        setStep('email');
      }
    } catch (err) {
      setErrors({ code: err.message || 'Invalid invitation code' });
    } finally {
      setSubmitting(false);
    }
  };

  // Returning guest: email only → rejoin. If not found, show full form.
  const handleRejoinWithEmail = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(emailOnly);
    if (emailErr) {
      setErrors({ emailOnly: emailErr });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await apiRequest('/api/guest/rejoin', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          email: emailOnly.trim().toLowerCase(),
        }),
      });
      const { user: userData, token, billId, message } = res;
      login(userData, token);
      navigate(billId ? `/bill/${billId}` : '/', { state: { guestWelcomeBack: message } });
    } catch (err) {
      setErrors({ emailOnly: err.message || 'No guest found for this email.' });
      setFormData((prev) => ({ ...prev, email: emailOnly.trim().toLowerCase() }));
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit guest details (firstName, lastName, email). Server reuses existing guest by email if invited before.
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
      const res = await apiRequest('/api/guest/join', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
        }),
      });

      const { user: userData, token, billId, existingGuest, alreadyInBill, message } = res;
      login(userData, token);
      if (existingGuest && alreadyInBill && message) {
        navigate(billId ? `/bill/${billId}` : '/', { state: { guestWelcomeBack: message } });
      } else {
        navigate(billId ? `/bill/${billId}` : '/');
      }
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
              {step === 'code' ? 'Enter Invitation Code' : step === 'email' ? 'Welcome back' : 'Your Information'}
            </h1>

            {upgradePromptMessage && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {upgradePromptMessage}
              </div>
            )}

            {step === 'code' ? (
              <form onSubmit={handleCheckCode} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    onFocus={() => setErrors((prev) => ({ ...prev, code: '' }))}
                    placeholder="INVITATION CODE"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:ring-2 text-sm uppercase ${
                      errors.code ? 'border-red-500 focus:ring-red-300' : code.trim() ? 'border-green-500 focus:ring-green-300' : 'border-gray-300 focus:ring-[#06B6D4]'
                    }`}
                  />
                  {errors.code && (
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                      <AlertCircle size={12} /> {errors.code}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium disabled:opacity-70"
                >
                  {submitting ? 'Checking...' : 'Continue'}
                </button>
              </form>
            ) : step === 'email' ? (
              <form onSubmit={handleRejoinWithEmail} className="space-y-4">
                <p className="text-gray-600 text-sm mb-4">
                  Already joined this bill? Enter your email to sign back in.
                </p>
                {errors.emailOnly && (
                  <div className="flex items-center gap-1 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    <AlertCircle size={16} /> {errors.emailOnly}
                  </div>
                )}
                <input
                  type="email"
                  value={emailOnly}
                  onChange={(e) => {
                    setEmailOnly(e.target.value);
                    setErrors((prev) => ({ ...prev, emailOnly: '' }));
                  }}
                  placeholder="Your email"
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium disabled:opacity-70"
                >
                  {submitting ? 'Signing in...' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('code')}
                  className="text-[#06B6D4] hover:text-[#0891b2] text-sm font-semibold"
                >
                  ← Change code
                </button>
                <p className="text-gray-500 text-sm pt-2 border-t border-gray-200 mt-4">
                  New to this bill?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setFormData((prev) => ({ ...prev, email: emailOnly.trim().toLowerCase() }));
                      setStep('form');
                    }}
                    className="text-[#06B6D4] hover:text-[#0891b2] font-semibold"
                  >
                    Enter your details to join
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSubmitGuestForm} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, firstName: e.target.value }));
                      if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    placeholder="First Name"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:ring-2 text-sm ${
                      errors.firstName ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-[#06B6D4]'
                    }`}
                  />
                  {errors.firstName && (
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                      <AlertCircle size={12} /> {errors.firstName}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, lastName: e.target.value }));
                      if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: '' }));
                    }}
                    placeholder="Last Name"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:ring-2 text-sm ${
                      errors.lastName ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-[#06B6D4]'
                    }`}
                  />
                  {errors.lastName && (
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                      <AlertCircle size={12} /> {errors.lastName}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, email: e.target.value }));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="Email"
                    className={`w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:ring-2 text-sm ${
                      errors.email ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-[#06B6D4]'
                    }`}
                  />
                  {errors.email && (
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                      <AlertCircle size={12} /> {errors.email}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[#06B6D4] hover:text-[#0891b2] text-sm font-semibold"
                >
                  ← Back
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
