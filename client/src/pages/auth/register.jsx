import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Reusable check: spaces-only or containing spaces is invalid
const hasInvalidSpaces = (value) => {
  if (value == null || typeof value !== 'string') return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || /\s/.test(trimmed);
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    nickname: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // Validation rules - spaces are not valid input per requirements
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'firstName':
        if (!value?.trim()) {
          newErrors.firstName = 'First name is required';
        } else if (hasInvalidSpaces(value)) {
          newErrors.firstName = 'Spaces are not valid input';
        } else if (value.trim().length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters';
        } else {
          delete newErrors.firstName;
        }
        break;

      case 'lastName':
        if (!value?.trim()) {
          newErrors.lastName = 'Last name is required';
        } else if (hasInvalidSpaces(value)) {
          newErrors.lastName = 'Spaces are not valid input';
        } else if (value.trim().length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters';
        } else {
          delete newErrors.lastName;
        }
        break;

      case 'nickname':
        if (!value?.trim()) {
          newErrors.nickname = 'Nickname is required';
        } else if (hasInvalidSpaces(value)) {
          newErrors.nickname = 'Spaces are not valid input';
        } else if (value.trim().length < 3) {
          newErrors.nickname = 'Nickname must be at least 3 characters';
        } else {
          delete newErrors.nickname;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value?.trim()) {
          newErrors.email = 'Email is required';
        } else if (!emailRegex.test(value.trim())) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;

      case 'username':
        if (!value?.trim()) {
          newErrors.username = 'Username is required';
        } else if (hasInvalidSpaces(value)) {
          newErrors.username = 'Spaces are not valid input';
        } else if (value.trim().length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) {
          newErrors.username = 'Username can only contain letters, numbers, and underscores';
        } else {
          delete newErrors.username;
        }
        break;

      case 'password':
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /[0-9]/.test(value);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
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

        // Calculate strength
        let strength = 0;
        if (isLengthValid) strength++;
        if (hasUpperCase && hasLowerCase) strength++;
        if (hasNumbers) strength++;
        if (hasSpecialChar) strength++;
        setPasswordStrength(strength);
        break;

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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name]) {
      validateField(name, value);
    }
  };

  // Check username uniqueness on blur - clears "already taken" when available
  const checkUsernameUnique = useCallback(async (username) => {
    if (!username?.trim() || username.trim().length < 3) return;
    setCheckingUsername(true);
    try {
      const res = await apiRequest(`/api/auth/check-username?username=${encodeURIComponent(username.trim())}`);
      setErrors((prev) => {
        const next = { ...prev };
        if (!res.available) {
          next.username = 'Username is already taken';
        } else if (next.username === 'Username is already taken') {
          delete next.username;
        }
        return next;
      });
    } catch {
      // Network error - keep previous error state
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  // Check nickname uniqueness on blur - clears "already taken" when available
  const checkNicknameUnique = useCallback(async (nickname) => {
    if (!nickname?.trim() || nickname.trim().length < 3) return;
    setCheckingNickname(true);
    try {
      const res = await apiRequest(`/api/auth/check-nickname?nickname=${encodeURIComponent(nickname.trim())}`);
      setErrors((prev) => {
        const next = { ...prev };
        if (!res.available) {
          next.nickname = 'Nickname is already taken';
        } else if (next.nickname === 'Nickname is already taken') {
          delete next.nickname;
        }
        return next;
      });
    } catch {
      // Network error - keep previous error state
    } finally {
      setCheckingNickname(false);
    }
  }, []);

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
    if (name === 'username') checkUsernameUnique(value);
    if (name === 'nickname') checkNicknameUnique(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields touched and validate
    const allTouched = Object.fromEntries(Object.keys(formData).map((k) => [k, true]));
    setTouched(allTouched);
    Object.keys(formData).forEach((key) => validateField(key, formData[key]));

    // Build fresh errors to avoid stale state
    const freshErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = runValidation(key, formData[key]);
      if (err) freshErrors[key] = err;
    });

    if (Object.keys(freshErrors).length > 0) {
      setErrors(freshErrors);
      return;
    }

    setSubmitError('');
    setSubmitting(true);

    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          nickname: formData.nickname.trim(),
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      if (data.requireEmailConfirmation) {
        navigate('/login', { state: { checkEmail: true, email: data.email } });
        return;
      }

      login(data.user, data.token);
      navigate('/dashboard', { state: { fromRegistration: true } });
    } catch (err) {
      setSubmitError(err.data?.errors ? Object.values(err.data.errors).join('. ') : err.message || 'Registration failed.');
      if (err.data?.errors) setErrors(err.data.errors);
    } finally {
      setSubmitting(false);
    }
  };

  // Reusable validation - returns error string or null. Spaces are not valid input.
  const runValidation = (name, value) => {
    switch (name) {
      case 'firstName':
        if (!value?.trim()) return 'First name is required';
        if (hasInvalidSpaces(value)) return 'Spaces are not valid input';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return null;
      case 'lastName':
        if (!value?.trim()) return 'Last name is required';
        if (hasInvalidSpaces(value)) return 'Spaces are not valid input';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return null;
      case 'nickname':
        if (!value?.trim()) return 'Nickname is required';
        if (hasInvalidSpaces(value)) return 'Spaces are not valid input';
        if (value.trim().length < 3) return 'Nickname must be at least 3 characters';
        return null;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value?.trim()) return 'Email is required';
        if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
        return null;
      case 'username':
        if (!value?.trim()) return 'Username is required';
        if (hasInvalidSpaces(value)) return 'Spaces are not valid input';
        if (value.trim().length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) return 'Username can only contain letters, numbers, and underscores';
        return null;
      case 'password':
        const hasUC = /[A-Z]/.test(value);
        const hasLC = /[a-z]/.test(value);
        if (!value) return 'Password is required';
        if (value.length < 8 || value.length > 16) return 'Password must be 8-16 characters long';
        if (!hasUC || !hasLC) return 'Password must contain upper and lower case letters';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) return 'Password must contain at least one special character';
        return null;
      case 'confirmPassword':
        if (!value) return 'Confirm password is required';
        if (value !== formData.password) return 'Passwords do not match';
        return null;
      default:
        return null;
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

  // Form is valid when no errors and all required fields have non-empty, non-space-only values
  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.lastName.trim() &&
    formData.firstName.trim() &&
    formData.nickname.trim() &&
    formData.email.trim() &&
    formData.username.trim() &&
    formData.password &&
    formData.confirmPassword &&
    !checkingUsername &&
    !checkingNickname;

  return (
   <div className="h-screen w-screen flex">
      {/* LEFT PANEL - 50% */}
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#F0F9FA] via-[#67E8F9] to-[#F0F9FA] relative items-center justify-center px-12 py-20">        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#06B6D4] rounded-full opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#164E63] rounded-full opacity-20"></div>
        
        <div className="relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#164E63] mb-6">
            Join Us!
          </h2>
          <p className="text-lg text-[#0E7490] mb-12 leading-relaxed">
            Start splitting bills with friends and never worry about who owes what. Simple, fair, and transparent.
          </p>
          
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 border-2 border-white text-[#0E7490] text-base rounded-full font-semibold hover:bg-white hover:text-[#06B6D4] transition-all duration-300 transform hover:scale-105"
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - 50% */}
    <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-8 align-middle">
        {/* Mobile Back Button */}
        <button
          onClick={() => navigate('/')}
          className="md:hidden self-start mb-6 text-[#06B6D4] hover:text-[#0891b2] font-semibold transition"
        >
          ← Back
        </button>

        <div className="w-full max-w-md">
            
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#164E63] mb-6">Create Account</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Last Name & First Name (per spec order) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="sr-only">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                    touched.lastName && errors.lastName
                      ? 'border-red-500 focus:ring-red-300'
                      : touched.lastName
                      ? 'border-green-500 focus:ring-green-300'
                      : 'border-gray-300 focus:ring-[#06B6D4]'
                  }`}
                  placeholder="Last Name *"
                />
                {touched.lastName && errors.lastName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                    <AlertCircle size={12} /> {errors.lastName}
                  </div>
                )}
              </div>
              <div>
                <label className="sr-only">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                    touched.firstName && errors.firstName
                      ? 'border-red-500 focus:ring-red-300'
                      : touched.firstName
                      ? 'border-green-500 focus:ring-green-300'
                      : 'border-gray-300 focus:ring-[#06B6D4]'
                  }`}
                  placeholder="First Name *"
                />
                {touched.firstName && errors.firstName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                    <AlertCircle size={12} /> {errors.firstName}
                  </div>
                )}
              </div>
            </div>

            {/* Nickname - required, must be unique */}
            <div className="relative">
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm pr-10 ${
                  touched.nickname && errors.nickname
                    ? 'border-red-500 focus:ring-red-300'
                    : touched.nickname
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
                placeholder="Nickname * (must be unique)"
              />
              {checkingNickname && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
              {touched.nickname && errors.nickname && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.nickname}
                </div>
              )}
            </div>

            {/* Email - required, valid format */}
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                  touched.email && errors.email
                    ? 'border-red-500 focus:ring-red-300'
                    : touched.email
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
                placeholder="Email *"
              />
              {touched.email && errors.email && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.email}
                </div>
              )}
            </div>

            {/* Username - required, must be unique */}
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm pr-10 ${
                  touched.username && errors.username
                    ? 'border-red-500 focus:ring-red-300'
                    : touched.username
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
                placeholder="Username * (must be unique)"
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
              {touched.username && errors.username && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.username}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 pr-10 text-sm ${
                    touched.password && errors.password
                      ? 'border-red-500 focus:ring-red-300'
                      : touched.password
                      ? 'border-green-500 focus:ring-green-300'
                      : 'border-gray-300 focus:ring-[#06B6D4]'
                  }`}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 bg-transparent border-none outline-none cursor-pointer p-0 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

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
                    <div className={`w-2 h-2 rounded-full ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600' : 'text-gray-600'}>
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

              {touched.password && errors.password && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.password}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 pr-10 text-sm ${
                    touched.confirmPassword && errors.confirmPassword
                      ? 'border-red-500 focus:ring-red-300'
                      : touched.confirmPassword
                      ? 'border-green-500 focus:ring-green-300'
                      : 'border-gray-300 focus:ring-[#06B6D4]'
                  }`}
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 bg-transparent border-none outline-none cursor-pointer p-0 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.confirmPassword}
                </div>
              )}
            </div>

            {submitError && (
              <div className="flex items-center gap-1 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertCircle size={16} /> {submitError}
              </div>
            )}

            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className={`  px-4 py-2
                  bg-gradient-to-r from-[#164E63] to-[#0E7490]
                  text-white text-sm lg:text-base
                  rounded-lg font-medium
                  shadow-md
                  transition-all duration-300 ease-in-out
                  active:scale-95
                  focus:outline-none
                  focus:ring-2 focus:ring-[#06B6D4] focus:ring-offset-2
                  hover:shadow-lg transform hover:scale-105
                   ${
                  isFormValid
                    ? 'bg-[#0E7490] hover:bg-[#06B6D4] shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 active:scale-95'
                    : 'bg-gray-400 cursor-not-allowed opacity-100'
                }`}
              >
                {submitting ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center mt-4">
              <span className="text-gray-600 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-[#06B6D4] hover:text-[#0891b2] font-semibold transition focus:outline-none"
                >
                  Sign In
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
