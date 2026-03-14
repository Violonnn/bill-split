import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MainLayout from '../components/MainLayout';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import UpgradePrompt from '../components/UpgradePrompt';
import { Trash2, Edit, Archive, Eye, Plus, AlertCircle, Copy, Check } from 'lucide-react';

export default function Bills() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const { bills: list } = await apiRequest('/api/bills');
      setBills(list?.filter(b => !b.archived) || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load bills');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.userType === 'guest') {
      navigate('/');
      return;
    }
    fetchBills();
  }, [authLoading, user, navigate, fetchBills]);

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!newTitle?.trim()) {
      setCreateError('Bill name is required');
      return;
    }

    setCreating(true);
    setCreateError('');
    setUpgradeMessage('');

    try {
      const { bill } = await apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setBills((prev) => [bill, ...prev]);
      setNewTitle('');
      setShowCreateModal(false);
    } catch (err) {
      const msg = err.message || 'Failed to create bill';
      setCreateError(msg);
      const isLimitError = err?.status === 403 && (String(msg).includes('Upgrade') || String(msg).includes('Standard accounts'));
      if (isLimitError) setUpgradeMessage(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    setDeleting(true);
    try {
      await apiRequest(`/api/bills/${billId}`, { method: 'DELETE' });
      setBills((prev) => prev.filter(b => b._id !== billId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message || 'Failed to delete bill');
    } finally {
      setDeleting(false);
    }
  };

  const handleArchiveBill = async (billId) => {
    setArchiveConfirm(null);
    try {
      await apiRequest(`/api/bills/${billId}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: true }),
      });
      setBills((prev) => prev.filter(b => b._id !== billId));
    } catch (err) {
      setError(err.message || 'Failed to archive bill');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.userType === 'guest') return null;

  const activeBills = bills.filter(b => !b.archived);

  return (
    <MainLayout title="Bills">
      {error && (
        <Alert type="error" title="Error" message={error} />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-600">Manage your expense splits</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          New Bill
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : activeBills.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No Bills Yet"
          message="Create your first bill to start splitting expenses with friends!"
        >
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create Your First Bill
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Bill Name</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Members</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Total Amount</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Invite Code</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeBills.map((bill) => (
                <tr key={bill._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{bill.title}</td>
                  <td className="px-6 py-4 text-gray-600">{bill.members?.length || 0}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    ${(bill.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-gray-100 text-gray-900 rounded font-mono text-sm">
                        {bill.invitationCode}
                      </code>
                      <button
                        onClick={() => copyCode(bill.invitationCode)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copiedCode === bill.invitationCode ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <Copy size={16} className="text-gray-600" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/bill/${bill._id}`)}
                        className="flex items-center gap-1"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/edit-bill/${bill._id}`)}
                        className="flex items-center gap-1"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setArchiveConfirm(bill._id)}
                        className="flex items-center gap-1"
                        title="Archive bill"
                      >
                        <Archive size={16} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteConfirm(bill._id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Bill Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Bill"
        onClose={() => {
          setShowCreateModal(false);
          setNewTitle('');
          setCreateError('');
          setUpgradeMessage('');
        }}
        size="md"
      >
        <form onSubmit={handleCreateBill} className="space-y-4">
          {upgradeMessage && (
            <UpgradePrompt message={upgradeMessage} className="mb-4" />
          )}
          {createError && (
            <Alert type="error" message={createError} dismissible={false} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Bill Name
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Weekend Trip"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={creating}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setNewTitle('');
                setCreateError('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Bill'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        title="Delete Bill"
        onClose={() => setDeleteConfirm(null)}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this bill? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteBill(deleteConfirm)}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveConfirm}
        title="Archive Bill"
        onClose={() => setArchiveConfirm(null)}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Archive this bill? You can restore it anytime from Archived Bills.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setArchiveConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleArchiveBill(archiveConfirm)}
            >
              Archive
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
