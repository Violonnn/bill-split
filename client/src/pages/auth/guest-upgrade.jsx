import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function GuestUpgrade() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upgradePromptMessage, setUpgradePromptMessage] = useState('');

  useEffect(() => {
    if (location.state?.fromLogin && location.state?.message) {
      setUpgradePromptMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.fromLogin, location.state?.message, location.pathname, navigate]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F0F9FA]">
        <LoadingSpinner />
      </div>
    );
  }
  if (!user || user.userType !== 'guest') {
    navigate('/');
    return null;
  }

  const validatePassword = (pwd) => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 8 || pwd.length > 16) return 'Password must be 8-16 characters long';
    if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd)) return 'Password must contain upper and lower case letters';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) return 'Password must contain at least one special character';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const freshErrors = {};
    const pwErr = validatePassword(formData.password);
    if (pwErr) freshErrors.password = pwErr;
    if (!formData.confirmPassword) freshErrors.confirmPassword = 'Confirm password is required';
    else if (formData.password !== formData.confirmPassword) freshErrors.confirmPassword = 'Passwords do not match';

    setErrors(freshErrors);
    if (Object.keys(freshErrors).length > 0) return;

    setSubmitting(true);

    try {
      const { user: userData, token } = await apiRequest('/api/guest/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      login(userData, token);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ password: err.message || 'Upgrade failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex">
      {/* Left panel - decorative / brand */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA] relative items-center justify-center px-12 py-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#06B6D4] rounded-full opacity-20" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#164E63] rounded-full opacity-20" />
        <div className="relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#164E63] mb-6">Upgrade Your Account</h2>
          <p className="text-lg text-[#0E7490] mb-12 leading-relaxed">
            Add a password to keep your account and unlock the full BillSplit experience.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 border-2 border-white text-[#0E7490] text-base rounded-full font-semibold hover:bg-white hover:text-[#06B6D4] transition-all duration-300 transform hover:scale-105 focus:outline-none"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full md:w-1/2 relative flex items-center justify-center px-6 py-8 overflow-y-auto">
        <button
          onClick={() => navigate('/')}
          className="md:hidden absolute top-6 left-6 z-10 text-[#06B6D4] hover:text-[#0891b2] font-semibold transition focus:outline-none"
        >
          ← Back
        </button>
        <div className="w-full max-w-md">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#164E63] mb-2">Complete Your Upgrade</h1>
          {upgradePromptMessage && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {upgradePromptMessage}
            </div>
          )}
          <p className="text-gray-600 text-sm mb-6">
            Add a password to keep your account. We&apos;ll use your existing details: {user.firstName} {user.lastName} ({user.email})
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {Object.values(errors).some(Boolean) && (
              <div className="flex items-center gap-1 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle size={16} /> {Object.values(errors).find(Boolean)}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Choose a password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Confirm password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium disabled:opacity-70 hover:shadow-lg transition"
            >
              {submitting ? 'Upgrading...' : 'Upgrade to Registered User'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2 text-[#06B6D4] hover:text-[#0891b2] text-sm font-semibold transition"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
