import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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

  // Validation rules
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          newErrors.firstName = 'First name is required';
        } else if (value.length < 2) {
          newErrors.firstName = 'First name must be at least 2 characters';
        } else {
          delete newErrors.firstName;
        }
        break;

      case 'lastName':
        if (!value.trim()) {
          newErrors.lastName = 'Last name is required';
        } else if (value.length < 2) {
          newErrors.lastName = 'Last name must be at least 2 characters';
        } else {
          delete newErrors.lastName;
        }
        break;

      case 'nickname':
        if (!value.trim()) {
          newErrors.nickname = 'Nickname is required';
        } else if (value.length < 3) {
          newErrors.nickname = 'Nickname must be at least 3 characters';
        } else {
          delete newErrors.nickname;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;

      case 'username':
        if (!value.trim()) {
          newErrors.username = 'Username is required';
        } else if (value.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
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

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    validateField(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    Object.keys(formData).forEach((key) => {
      validateField(key, formData[key]);
      setTouched((prev) => ({
        ...prev,
        [key]: true,
      }));
    });

    // Check if form is valid
    const hasErrors = Object.keys(errors).length > 0;
    if (!hasErrors) {
      console.log('Form submitted:', formData);
      // TODO: Send to backend
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

  const isFormValid = Object.keys(errors).length === 0 && Object.values(formData).every((v) => v.trim());

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
            {/* First Name & Last Name (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* First Name */}
              <div>
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
                  placeholder="First Name"
                />
                {touched.firstName && errors.firstName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                    <AlertCircle size={12} /> {errors.firstName}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div>
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
                  placeholder="Last Name"
                />
                {touched.lastName && errors.lastName && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                    <AlertCircle size={12} /> {errors.lastName}
                  </div>
                )}
              </div>
            </div>

            {/* Nickname */}
            <div>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm ${
                  touched.nickname && errors.nickname
                    ? 'border-red-500 focus:ring-red-300'
                    : touched.nickname
                    ? 'border-green-500 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
                placeholder="Nickname (must be unique)"
              />
              {touched.nickname && errors.nickname && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.nickname}
                </div>
              )}
            </div>

            {/* Email */}
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
                placeholder="Email"
              />
              {touched.email && errors.email && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.email}
                </div>
              )}
            </div>

            {/* Username */}
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
                placeholder="Username (must be unique)"
              />
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

            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={!isFormValid}
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
                Sign Up
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
