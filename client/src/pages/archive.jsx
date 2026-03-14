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
import { RotateCcw, Trash2, AlertCircle } from 'lucide-react';

export default function Archive() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [archivedBills, setArchivedBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchArchivedBills = useCallback(async () => {
    try {
      setLoading(true);
      const { bills } = await apiRequest('/api/bills?archived=true');
      setArchivedBills(bills || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load archived bills');
      setArchivedBills([]);
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
    fetchArchivedBills();
  }, [authLoading, user, navigate, fetchArchivedBills]);

  const handleRestoreBill = async (billId) => {
    setRestoring(billId);
    try {
      await apiRequest(`/api/bills/${billId}`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: false }),
      });
      setArchivedBills((prev) => prev.filter(b => b._id !== billId));
    } catch (err) {
      setError(err.message || 'Failed to restore bill');
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteBill = async (billId) => {
    try {
      await apiRequest(`/api/bills/${billId}`, { method: 'DELETE' });
      setArchivedBills((prev) => prev.filter(b => b._id !== billId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message || 'Failed to delete bill');
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.userType === 'guest') return null;

  return (
    <MainLayout title="Archived Bills">
      {error && (
        <Alert type="error" title="Error" message={error} />
      )}

      <p className="text-gray-600 mb-8">
        View and manage your archived bills
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : archivedBills.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No Archived Bills"
          message="Bills you archive will appear here"
        >
          <Button variant="primary" onClick={() => navigate('/bills')}>
            View Active Bills
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {archivedBills.map((bill) => (
            <Card key={bill._id}>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">{bill.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {bill.members?.length || 0} members • Archived
                </p>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(bill.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expenses</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {bill.expenses?.length || 0}
                  </p>
                </div>
              </CardBody>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRestoreBill(bill._id)}
                  disabled={restoring === bill._id}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  {restoring === bill._id ? 'Restoring...' : 'Restore'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteConfirm(bill._id)}
                  className="flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        title="Delete Bill Permanently"
        onClose={() => setDeleteConfirm(null)}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to permanently delete this archived bill? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteBill(deleteConfirm)}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
