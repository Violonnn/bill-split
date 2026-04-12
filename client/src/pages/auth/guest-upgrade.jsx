import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function GuestUpgrade() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upgradePromptMessage, setUpgradePromptMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const fromBillId = location.state?.fromBillId || '';

  useEffect(() => {
    if (location.state?.fromLogin && location.state?.message) {
      setUpgradePromptMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: { fromBillId } });
    }
  }, [location.state?.fromLogin, location.state?.message, location.pathname, navigate, fromBillId]);

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

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    switch (name) {
      case 'password': {
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /[0-9]/.test(value);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);
        const isLengthValid = value.length >= 8 && value.length <= 16;

        if (!value) {
          newErrors.password = 'Password is required';
        } else if (!isLengthValid) {
          newErrors.password = 'Password must be 8-16 characters long';
        } else if (!hasUpperCase || !hasLowerCase) {
          newErrors.password = 'Password must contain upper and lower case letters';
        } else if (!hasNumbers) {
          newErrors.password = 'Password must contain at least one number';
        } else if (!hasSpecialChar) {
          newErrors.password = 'Password must contain at least one special character';
        } else {
          delete newErrors.password;
        }

        let strength = 0;
        if (isLengthValid) strength++;
        if (hasUpperCase && hasLowerCase) strength++;
        if (hasNumbers) strength++;
        if (hasSpecialChar) strength++;
        setPasswordStrength(strength);

        // Re-validate confirm if already touched
        if (submitted) {
          if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Confirm password is required';
          } else if (value !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;
      }
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Confirm password is required';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitted) {
      validateField(name, value);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark as submitted to show validation
    setSubmitted(true);
    const newErrors = {};
    const pwd = formData.password;
    if (!pwd) newErrors.password = 'Password is required';
    else if (pwd.length < 8 || pwd.length > 16) newErrors.password = 'Password must be 8-16 characters long';
    else if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd)) newErrors.password = 'Password must contain upper and lower case letters';
    else if (!/[0-9]/.test(pwd)) newErrors.password = 'Password must contain at least one number';
    else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) newErrors.password = 'Password must contain at least one special character';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

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
      setErrors((prev) => ({ ...prev, submit: err.message || 'Upgrade failed' }));
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
            onClick={() => navigate(fromBillId ? `/bill/${fromBillId}` : '/')}
            className="px-8 py-3 border-2 border-white text-[#0E7490] text-base rounded-full font-semibold hover:bg-white hover:text-[#06B6D4] transition-all duration-300 transform hover:scale-105 focus:outline-none"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full md:w-1/2 relative flex items-center justify-center px-6 py-8 overflow-y-auto">
        <button
          onClick={() => navigate(fromBillId ? `/bill/${fromBillId}` : '/')}
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
            {errors.submit && (
              <div className="flex items-center gap-1 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle size={16} /> {errors.submit}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Choose a password"
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                  submitted && errors.password
                    ? 'border-red-500 focus:ring-red-300'
                    : submitted && !errors.password
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
              />

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-600'}>
                      Upper and lower case
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-600'}>
                      At least one number
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password) ? 'text-green-600' : 'text-gray-600'}>
                      Special character
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${formData.password.length >= 8 && formData.password.length <= 16 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={formData.password.length >= 8 && formData.password.length <= 16 ? 'text-green-600' : 'text-gray-600'}>
                      8-16 characters
                    </span>
                  </div>
                </div>
              )}

              {/* Password Strength */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">Strength:</span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength <= 1 ? 'text-red-500' :
                      passwordStrength === 2 ? 'text-yellow-500' :
                      passwordStrength === 3 ? 'text-blue-500' :
                      'text-green-500'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {submitted && errors.password && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.password}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                  submitted && errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-300'
                    : submitted && !errors.confirmPassword
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
              />
              {submitted && errors.confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.confirmPassword}
                </div>
              )}
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
              onClick={() => navigate(fromBillId ? `/bill/${fromBillId}` : '/')}
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
