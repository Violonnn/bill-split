import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import { Button } from './Button';
import { Plus, Trash2, UserPlus, Search, Check, Copy } from 'lucide-react';

export default function BillEditModal({ isOpen, onClose, billId }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [addingUserId, setAddingUserId] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '' });
  const [guestFormErrors, setGuestFormErrors] = useState({});
  const [addingGuest, setAddingGuest] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen || !billId) return;

    const fetchBill = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
        setBill(data.bill);
        setTitle(data.bill.title);
      } catch (err) {
        setError(err.message || 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [isOpen, billId]);

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Bill title is required');
      return;
    }

    setSaving(true);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}`, {
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

  const handleRegenerateCode = async () => {
    setRegeneratingCode(true);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}`, {
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

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setError('Email is required');
      return;
    }

    setAddingMember(true);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail.trim() }),
      });
      setBill(updatedBill);
      setMemberEmail('');
      setShowAddMember(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

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
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/add-guest`, {
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
      setError(err.message || 'Failed to add guest');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleSearchUsers = async () => {
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
      const { users } = await apiRequest(`/api/bills/${billId}/search-users?q=${encodeURIComponent(q)}`);
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
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      setBill(updatedBill);
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err.message || 'Failed to add user');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setRemovingMember(memberId);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/members/${memberId}`, {
        method: 'DELETE',
      });
      setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  if (!bill && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Bill" size="xl">
        <LoadingSpinner />
      </Modal>
    );
  }

  if (!bill) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${bill.title}`} size="xl">
      {error && <Alert type="error" title="Error" message={error} />}

      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
        {/* Bill Details */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bill Details</h3>
          <form onSubmit={handleSaveTitle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Bill Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Invitation Code</label>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 min-w-[120px] px-4 py-2 bg-gray-100 rounded-lg font-mono text-gray-900">
                  {bill.invitationCode}
                </code>
                <button
                  type="button"
                  onClick={() => copyCode(bill.invitationCode)}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Copy invitation code"
                >
                  {copiedCode ? (
                    <Check size={18} className="text-green-600" />
                  ) : (
                    <Copy size={18} className="text-gray-600" />
                  )}
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode}
                >
                  {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Members Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Add Involved Persons</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddGuestForm(true)}
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                Add Guest User
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Member
              </Button>
            </div>
          </div>

          {/* Search users to add */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search users to add
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
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
                      disabled={addingUserId === u._id}
                    >
                      {addingUserId === u._id ? 'Adding...' : 'Add'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Current Members List */}
          {bill.members && bill.members.length > 0 ? (
            <div className="space-y-2">
              {bill.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bill.createdBy?.toString?.() === member._id?.toString?.() || bill.createdBy === member._id ? (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Owner</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={removingMember === member._id}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No members yet</p>
          )}
        </div>
      </div>

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

      {/* Add Guest User Modal */}
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
            Add a guest with their name and email. Same validation as registration (no spaces, valid email).
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
              <p className="text-red-600 text-xs mt-1">{guestFormErrors.firstName}</p>
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
              <p className="text-red-600 text-xs mt-1">{guestFormErrors.lastName}</p>
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
              placeholder="guest@example.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.email && (
              <p className="text-red-600 text-xs mt-1">{guestFormErrors.email}</p>
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
    </Modal>
  );
}
