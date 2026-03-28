import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      setSuccessMessage('Email verified! You can now sign in.');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('error')) {
      setErrors({ username: searchParams.get('error') });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Show check-email message when redirected from registration with email confirmation
  useEffect(() => {
    if (location.state?.checkEmail) {
      setSuccessMessage(`A confirmation email has been sent. Please check your inbox and click the link to activate your account, then sign in below.`);
    }
  }, [location.state?.checkEmail]);

  // Validation rules
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'username':
        if (!value.trim()) {
          newErrors.username = 'Username or email is required';
        } else {
          delete newErrors.username;
        }
        break;

      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else {
          delete newErrors.password;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run validation so empty/invalid fields show visual feedback (red border + message)
    const freshErrors = {};
    if (!formData.username?.trim()) freshErrors.username = 'Username or email is required';
    if (!formData.password) freshErrors.password = 'Password is required';

    setTouched({ username: true, password: true });
    setErrors(freshErrors);

    if (Object.keys(freshErrors).length > 0) return;

    setSubmitError('');
    setSubmitting(true);
    setSuccessMessage('');

    try {
      const { user: userData, token } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
      });

      login(userData, token);
      navigate('/dashboard');
    } catch (err) {
      if (err.isNetworkError) {
        setSubmitError(err.message);
        setErrors({});
      } else if (err.data?.code === 'GUEST_CANNOT_LOGIN') {
        setSubmitError('');
        setErrors({});
        navigate('/guest/join', { replace: true, state: { fromLogin: true, message: err.data?.error || 'Guest accounts cannot log in with password. Enter your invitation code below to access a bill, then use "Upgrade Account" to set a password and log in next time.' } });
        return;
      } else {
        setSubmitError('');
        if (err.data?.code === 'EMAIL_NOT_VERIFIED') {
          setErrors({ username: err.data.error });
        } else if (err.data?.code === 'USERNAME_NOT_FOUND') {
          setErrors({ username: err.data.error });
        } else if (err.data?.code === 'PASSWORD_INCORRECT') {
          setErrors({ password: err.data.error });
        } else {
          setErrors({ username: err.message || 'Username or Email not found or password incorrect' });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex">
      {/* LEFT PANEL - 50% */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA] relative items-center justify-center px-12 py-20">
        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#06B6D4] rounded-full opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#164E63] rounded-full opacity-20"></div>
        
        <div className="relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#164E63] mb-6">
            Welcome Back!
          </h2>
          <p className="text-lg text-[#0E7490] mb-12 leading-relaxed">
            Sign in to manage your shared bills and split expenses with friends effortlessly.
          </p>
          
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 border-2 border-white text-[#0E7490] text-base rounded-full font-semibold hover:bg-white hover:text-[#06B6D4] transition-all duration-300 transform hover:scale-105 focus:outline-none"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - 50% */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-8">
        {/* Mobile Back Button */}
        <button
          onClick={() => navigate('/')}
          className="md:hidden self-start mb-6 text-[#06B6D4] hover:text-[#0891b2] font-semibold transition focus:outline-none"
        >
          ← Back
        </button>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#164E63] mb-6">Sign In</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username/Email */}
            <div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                  touched.username && errors.username
                    ? 'border-red-500 focus:ring-red-300'
                    : touched.username
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
                placeholder="Username or Email"
              />
              {touched.username && errors.username && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.username}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                  touched.password && errors.password
                    ? 'border-red-500 focus:ring-red-300'
                    : touched.password
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
                placeholder="Password"
              />
              {touched.password && errors.password && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.password}
                </div>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {submitError}
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <span className="flex-shrink-0">✓</span>
                {successMessage}
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[#06B6D4] hover:text-[#0891b2] text-xs sm:text-sm font-semibold transition focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={submitting}
                className={`  px-4 py-2
                  bg-gradient-to-r from-[#164E63] to-[#0E7490]
                  text-white text-sm lg:text-base
                  rounded-lg font-medium
                  shadow-md
                  transition-all duration-300 ease-in-out
                  active:scale-95
                  focus:outline-none
                  hover:shadow-lg transform hover:scale-105
                   ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#0E7490] hover:bg-[#06B6D4] shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 active:scale-95'
                }`}
              >
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center mt-4">
              <span className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-[#06B6D4] hover:text-[#0891b2] font-semibold transition focus:outline-none"
                >
                  Sign Up
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
