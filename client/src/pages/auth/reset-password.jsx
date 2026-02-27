import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setErrors({ password: err.message || 'Reset failed. The link may have expired.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="h-screen w-screen flex">
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA] relative items-center justify-center px-12 py-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#06B6D4] rounded-full opacity-20" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#164E63] rounded-full opacity-20" />
          <div className="relative z-10 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-[#164E63] mb-6">Reset Password</h2>
            <p className="text-lg text-[#0E7490] mb-12 leading-relaxed">
              Use the link from your email to set a new password.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 border-2 border-white text-[#0E7490] text-base rounded-full font-semibold hover:bg-white hover:text-[#06B6D4] transition-all duration-300 transform hover:scale-105 focus:outline-none"
            >
              Back to Home
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#164E63] mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">Please request a new password reset link.</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="px-6 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium hover:shadow-lg transition"
            >
              Request new link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA] relative items-center justify-center px-12 py-20">
        <div className="relative z-10 text-center">
          <h2 className="text-4xl font-bold text-[#164E63] mb-6">Set New Password</h2>
          <p className="text-lg text-[#0E7490]">Choose a strong password for your account.</p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#164E63] mb-8 text-center">Reset Password</h1>

          {success ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                Password reset successful. You can now log in.
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2.5 bg-[#06B6D4] text-white rounded-lg font-medium hover:bg-[#0891b2] transition"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="New Password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                    <AlertCircle size={12} /> {errors.password}
                  </div>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Confirm Password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                    <AlertCircle size={12} /> {errors.confirmPassword}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-[#164E63] to-[#0E7490] text-white rounded-lg font-medium disabled:opacity-70"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-[#06B6D4] hover:text-[#0891b2] text-sm font-semibold"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
