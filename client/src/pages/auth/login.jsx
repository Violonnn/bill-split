import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

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
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
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
      console.log('Login submitted:', formData);
      // TODO: Send to backend
    }
  };

  const isFormValid = Object.keys(errors).length === 0 && Object.values(formData).every((v) => v.trim());

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
              {touched.password && errors.password && (
                <div className="flex items-center mt-1 text-red-500 text-xs">
                  <AlertCircle size={12} /> {errors.password}
                </div>
              )}
            </div>

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
                disabled={!isFormValid}
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
                  isFormValid
                    ? 'bg-[#0E7490] hover:bg-[#06B6D4] shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 active:scale-95'
                    : 'bg-gray-400 cursor-not-allowed opacity-100'
                }`}
              >
                Sign In
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
