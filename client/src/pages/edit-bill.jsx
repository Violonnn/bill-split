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
import { ArrowLeft, Plus, Trash2, Mail } from 'lucide-react';

export default function EditBill() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
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
    if (!user || user.userType === 'guest') {
      navigate('/');
      return;
    }
    fetchBill();
  }, [user, navigate, fetchBill]);

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
      setError(err.message || 'Failed to add member');
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
    try {
      await apiRequest(`/api/bills/${id}/invite-guest`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      setInviteEmail('');
      setShowInviteForm(false);
      setError('');
      // You can fetch bill again to see the guest
      fetchBill();
    } catch (err) {
      setError(err.message || 'Failed to invite guest');
    } finally {
      setInvitingGuest(false);
    }
  };

  if (!user || user.userType === 'guest') return null;

  return (
    <MainLayout title={bill ? `Edit: ${bill.title}` : 'Edit Bill'}>
      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : bill ? (
        <div className="space-y-6 max-w-4xl">
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
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg font-mono text-gray-900">
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
              <h2 className="text-xl font-bold text-gray-900">Members</h2>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowInviteForm(true)}
                >
                  Invite Guest
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
            </CardHeader>
            <CardBody>
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

      {/* Invite Guest Modal */}
      <Modal
        isOpen={showInviteForm}
        title="Invite Guest"
        onClose={() => setShowInviteForm(false)}
        size="md"
      >
        <form onSubmit={handleInviteGuest} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Guests can view the bill and expenses without creating an account. They'll have access for 6 hours per day.
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
    </MainLayout>
  );
}
