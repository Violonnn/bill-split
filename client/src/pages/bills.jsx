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
import BillViewModal from '../components/BillViewModal';
import BillEditModal from '../components/BillEditModal';
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
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [selectedBillForEdit, setSelectedBillForEdit] = useState(null);

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

      {/* Header Container */}
      <div className="bg-white rounded-t-lg shadow-sm p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1"></h1>
            <p className="text-sm text-gray-600"></p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeBills.map((bill) => {
            const totalAmount = (bill.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
            return (
              <div key={bill._id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">{bill.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{bill.members?.length || 0} members</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Total Amount */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
                  </div>

                  {/* Invite Code */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Invite Code</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded font-mono text-sm text-gray-900">
                        {bill.invitationCode}
                      </code>
                      <button
                        onClick={() => copyCode(bill.invitationCode)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Copy invitation code"
                      >
                        {copiedCode === bill.invitationCode ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} className="text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedBillId(bill._id)}
                    className="flex-1 flex items-center justify-center gap-1"
                  >
                    <Eye size={16} />
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedBillForEdit(bill._id)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setArchiveConfirm(bill._id)}
                      className="flex items-center gap-1 px-2"
                      title="Archive bill"
                    >
                      <Archive size={16} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteConfirm(bill._id)}
                      className="flex items-center gap-1 px-2"
                      title="Delete bill"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Bill View Modal */}
      <BillViewModal
        isOpen={!!selectedBillId}
        onClose={() => setSelectedBillId(null)}
        billId={selectedBillId}
      />

      {/* Bill Edit Modal */}
      <BillEditModal
        isOpen={!!selectedBillForEdit}
        onClose={() => setSelectedBillForEdit(null)}
        billId={selectedBillForEdit}
      />
    </MainLayout>
  );
}
