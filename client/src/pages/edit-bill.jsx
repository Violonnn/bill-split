import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MainLayout from '../components/MainLayout';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import UpgradePrompt from '../components/UpgradePrompt';
import { ArrowLeft, Plus, Trash2, Mail, UserPlus, Search } from 'lucide-react';

export default function EditBill() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingGuest, setInvitingGuest] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '' });
  const [guestFormErrors, setGuestFormErrors] = useState({});
  const [addingGuest, setAddingGuest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState(null);
  const [searchError, setSearchError] = useState('');

  const fetchBill = useCallback(async () => {
    try {
      setLoading(true);
      const { bill: billData } = await apiRequest(`/api/bills/${encodeURIComponent(id)}`);
      setBill(billData);
      setTitle(billData.title);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.userType === 'guest') {
      navigate('/');
      return;
    }
    fetchBill();
  }, [authLoading, user, navigate, fetchBill]);

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Bill title is required');
      return;
    }

    setSaving(true);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: title.trim() }),
      });
      setBill(updatedBill);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update bill');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setError('Email is required');
      return;
    }

    setAddingMember(true);
    try {
      const { bill: updatedBill } = await apiRequest(
        `/api/bills/${id}/members`,
        {
          method: 'POST',
          body: JSON.stringify({ email: memberEmail.trim() }),
        }
      );
      setBill(updatedBill);
      setMemberEmail('');
      setShowAddMember(false);
      setError('');
    } catch (err) {
      const msg = err.message || 'Failed to add member';
      setError(msg);
      if (err?.status === 403 && (String(msg).includes('Upgrade') || String(msg).includes('Standard accounts'))) {
        setUpgradeMessage(msg);
      }
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setRemovingMember(memberId);
    try {
      const { bill: updatedBill } = await apiRequest(
        `/api/bills/${id}/members/${memberId}`,
        { method: 'DELETE' }
      );
      setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const handleInviteGuest = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    setInvitingGuest(true);
    setError('');
    try {
      await apiRequest(`/api/bills/${id}/invite-guest`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      setInviteEmail('');
      setShowInviteForm(false);
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}. They can join using the link in the email.`);
      setTimeout(() => setInviteSuccess(''), 5000);
      fetchBill();
    } catch (err) {
      const msg = err.message || 'Failed to invite guest';
      setError(msg);
      if (err?.status === 403 && (String(msg).includes('Upgrade') || String(msg).includes('Standard accounts'))) {
        setUpgradeMessage(msg);
      }
    } finally {
      setInvitingGuest(false);
    }
  };

  const handleRegenerateCode = async () => {
    setRegeneratingCode(true);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ regenerateCode: true }),
      });
      setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to regenerate code');
    } finally {
      setRegeneratingCode(false);
    }
  };

  // Validation for Add Guest form (same rules as registration: required, no spaces, valid email).
  const validateGuestField = (name, value) => {
    if (name === 'firstName' || name === 'lastName') {
      if (!value?.trim()) return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
      if (/\s/.test(value.trim())) return 'Spaces are not valid input';
      if (value.trim().length < 2) return `${name === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters`;
      return null;
    }
    if (name === 'email') {
      if (!value?.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address';
      return null;
    }
    return null;
  };

  const handleAddGuestSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    const fnErr = validateGuestField('firstName', guestForm.firstName);
    if (fnErr) errors.firstName = fnErr;
    const lnErr = validateGuestField('lastName', guestForm.lastName);
    if (lnErr) errors.lastName = lnErr;
    const emailErr = validateGuestField('email', guestForm.email);
    if (emailErr) errors.email = emailErr;
    setGuestFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddingGuest(true);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${id}/add-guest`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: guestForm.firstName.trim(),
          lastName: guestForm.lastName.trim(),
          email: guestForm.email.trim().toLowerCase(),
        }),
      });
      setBill(updatedBill);
      setGuestForm({ firstName: '', lastName: '', email: '' });
      setGuestFormErrors({});
      setShowAddGuestForm(false);
    } catch (err) {
      const msg = err.message || 'Failed to add guest';
      setError(msg);
      if (err?.status === 403 && (String(msg).includes('Upgrade') || String(msg).includes('Standard accounts'))) {
        setUpgradeMessage(msg);
      }
    } finally {
      setAddingGuest(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!id) {
      setError('Bill not loaded.');
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setSearchError('Email/Username/Nickname required');
      setSearchResults([]);
      return;
    }
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setError('');
    setSearchError('');
    try {
      const { users } = await apiRequest(`/api/bills/${id}/search-users?q=${encodeURIComponent(q)}`);
      if (!users || users.length === 0) {
        setSearchError('User not found');
        setSearchResults([]);
      } else {
        setSearchError('');
        setSearchResults(users);
      }
    } catch (err) {
      setError(err.message || 'Failed to search');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddParticipant = async (userId) => {
    setAddingUserId(userId);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${id}/participants`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      setBill(updatedBill);
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      const msg = err.message || 'Failed to add user';
      setError(msg);
      if (err?.status === 403 && (String(msg).includes('Upgrade') || String(msg).includes('Standard accounts'))) {
        setUpgradeMessage(msg);
      }
    } finally {
      setAddingUserId(null);
    }
  };

  // Standard users: max 3 persons per bill. Show upgrade prompt and disable add actions when at limit.
  const isStandardAtMemberLimit = user?.userType === 'standard' && (bill?.members?.length || 0) >= 3;

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.userType === 'guest') return null;

  return (
    <MainLayout title={bill ? `Edit: ${bill.title}` : 'Edit Bill'}>
      <button
        onClick={() => navigate('/bills')}
        className="flex items-center gap-2 mb-6 text-[#06B6D4] hover:text-[#0891b2] font-semibold transition"
      >
        <ArrowLeft size={20} />
        Back
      </button>
      {error && <Alert type="error" message={error} />}
      {inviteSuccess && <Alert type="success" message={inviteSuccess} />}
      {(upgradeMessage || isStandardAtMemberLimit) && (
        <UpgradePrompt
          message={upgradeMessage || 'Standard accounts can add up to 3 people per bill. Upgrade to Premium for more.'}
          className="mb-6"
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : bill ? (
        <div className="space-y-6">
          {/* Bill Title Section */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-900">Bill Details</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSaveTitle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Bill Name
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Invitation Code
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="flex-1 min-w-[120px] px-4 py-2 bg-gray-100 rounded-lg font-mono text-gray-900">
                      {bill.invitationCode}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(bill.invitationCode);
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRegenerateCode}
                      disabled={regeneratingCode}
                    >
                      {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Members Section */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Involved Persons</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddGuestForm(true)}
                  disabled={isStandardAtMemberLimit}
                  className="flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Add Guest User
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  disabled={isStandardAtMemberLimit}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {/* Search users to add (Guest and Registered) */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Search users to add
                </label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchUsers())}
                    placeholder="Email, name, or nickname (min 2 characters)"
                    className={`flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                      searchError
                        ? 'border-red-500 focus:ring-red-300'
                        : 'border-gray-300 focus:ring-[#06B6D4]'
                    }`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSearchUsers}
                    disabled={searching}
                    className="flex items-center gap-2"
                  >
                    <Search size={16} />
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                {searchError && (
                  <div className="mt-2 text-red-600 text-sm">{searchError}</div>
                )}
                {searchResults.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {searchResults.map((u) => (
                      <li
                        key={u._id}
                        className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{u.name || u.email}</span>
                          <span className="text-sm text-gray-600 ml-2">({u.email})</span>
                          <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs capitalize">{u.userType}</span>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddParticipant(u._id)}
                          disabled={addingUserId === u._id || isStandardAtMemberLimit}
                        >
                          {addingUserId === u._id ? 'Adding...' : 'Add'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {bill.members && bill.members.length > 0 ? (
                <div className="space-y-2">
                  {bill.members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Mail size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                          {member.userType || 'User'}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          disabled={removingMember === member._id}
                          className="p-2 hover:bg-red-100 rounded transition-colors text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">
                  No members added yet
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        title="Add Member"
        onClose={() => setShowAddMember(false)}
        size="md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Member Email
            </label>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingMember}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={addingMember}>
              {addingMember ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Guest Modal (send email with link) */}
      <Modal
        isOpen={showInviteForm}
        title="Invite Guest (by email)"
        onClose={() => setShowInviteForm(false)}
        size="md"
      >
        <form onSubmit={handleInviteGuest} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Send an email with the bill join link. Guests get 6 hours of access per day.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Guest Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="guest@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={invitingGuest}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowInviteForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={invitingGuest}>
              {invitingGuest ? 'Inviting...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Guest User Modal (inline: first name, last name, email – no password/username) */}
      <Modal
        isOpen={showAddGuestForm}
        title="Add Guest User"
        onClose={() => {
          setShowAddGuestForm(false);
          setGuestForm({ firstName: '', lastName: '', email: '' });
          setGuestFormErrors({});
        }}
        size="md"
      >
        <form onSubmit={handleAddGuestSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Add a guest with their name and email. Same validation as registration (no spaces, valid email). No password or username required.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
            <input
              type="text"
              value={guestForm.firstName}
              onChange={(e) => {
                setGuestForm((p) => ({ ...p, firstName: e.target.value }));
                setGuestFormErrors((p) => ({ ...p, firstName: undefined }));
              }}
              placeholder="First name"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.firstName && (
              <p className="mt-1 text-sm text-red-600">{guestFormErrors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
            <input
              type="text"
              value={guestForm.lastName}
              onChange={(e) => {
                setGuestForm((p) => ({ ...p, lastName: e.target.value }));
                setGuestFormErrors((p) => ({ ...p, lastName: undefined }));
              }}
              placeholder="Last name"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.lastName && (
              <p className="mt-1 text-sm text-red-600">{guestFormErrors.lastName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
            <input
              type="email"
              value={guestForm.email}
              onChange={(e) => {
                setGuestForm((p) => ({ ...p, email: e.target.value }));
                setGuestFormErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="email@example.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.email && (
              <p className="mt-1 text-sm text-red-600">{guestFormErrors.email}</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddGuestForm(false);
                setGuestForm({ firstName: '', lastName: '', email: '' });
                setGuestFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={addingGuest}>
              {addingGuest ? 'Adding...' : 'Add Guest'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
