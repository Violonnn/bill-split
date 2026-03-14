import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MainLayout from '../components/MainLayout';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { Mail, User, Crown } from 'lucide-react';

/**
 * Profile page: account type and editable fields (firstName, lastName, email).
 * Uses PATCH /api/auth/me for updates; no privilege escalation.
 */
export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
    });
  }, [authLoading, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.firstName?.trim()) {
      setError('First name is required.');
      return;
    }
    if (!formData.lastName?.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!formData.email?.trim()) {
      setError('Email is required.');
      return;
    }
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { user: updatedUser } = await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
        }),
      });
      updateUser(updatedUser);
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <MainLayout title="Profile">
      <div className="max-w-2xl">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <Card>
          <CardBody className="p-8">
            {/* Account Type Badge */}
            <div className="mb-8 flex items-center gap-3 pb-6 border-b border-gray-200">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Account Type</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {user.userType} Account
                </p>
              </div>
            </div>

            {/* Upgrade to Premium (Standard users only) */}
            {user.userType === 'standard' && (
              <Card className="mb-8 border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
                <CardBody className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-cyan-100 rounded-lg flex-shrink-0">
                      <Crown size={28} className="text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Upgrade to Premium</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Get unlimited bills per month and unlimited people per bill. Pay once to upgrade.
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/upgrade')}
                        className="mt-4 flex items-center gap-2"
                      >
                        <Crown size={18} />
                        Upgrade to Premium
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  First Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                    disabled={loading}
                  />
                ) : (
                  <p className="px-4 py-2 text-gray-900">{user.firstName || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Last Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                    disabled={loading}
                  />
                ) : (
                  <p className="px-4 py-2 text-gray-900">{user.lastName || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Mail size={16} />
                  Email Address
                </label>
                {editing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                    disabled={loading}
                  />
                ) : (
                  <p className="px-4 py-2 text-gray-900">{user.email}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-6 border-t border-gray-200">
                {editing ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          firstName: user.firstName || '',
                          lastName: user.lastName || '',
                          email: user.email || '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </MainLayout>
  );
}
