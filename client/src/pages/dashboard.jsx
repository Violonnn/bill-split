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
import { Plus, TrendingUp, Archive, AlertCircle, Copy, Check } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState('');
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
    if (!user || user.userType === 'guest') {
      navigate('/');
      return;
    }
    fetchBills();
  }, [user, navigate, fetchBills]);

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!newTitle?.trim()) {
      setCreateError('Bill name is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const { bill } = await apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setBills((prev) => [bill, ...prev]);
      setNewTitle('');
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err.message || 'Failed to create bill');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  if (!user || user.userType === 'guest') return null;

  const activeBills = bills.filter(b => !b.archived);
  const totalAmount = activeBills.reduce((sum, bill) => {
    const expenses = bill.expenses || [];
    return sum + expenses.reduce((billSum, exp) => billSum + (exp.amount || 0), 0);
  }, 0);

  return (
    <MainLayout title="Dashboard">
      {error && (
        <Alert type="error" title="Error" message={error} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Active Bills</p>
              <p className="text-4xl font-bold text-blue-900 mt-2">{activeBills.length}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <TrendingUp size={32} className="text-blue-600" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Amount</p>
              <p className="text-4xl font-bold text-green-900 mt-2">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.16 2.75a.75.75 0 00-.75.75v4a.75.75 0 001.5 0V3.5a.75.75 0 00-.75-.75zM13.75 3.5a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0V3.5zM10 8a.75.75 0 00-.75.75v10a.75.75 0 001.5 0v-10A.75.75 0 0010 8z" />
              </svg>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Members</p>
              <p className="text-4xl font-bold text-purple-900 mt-2">
                {new Set(activeBills.flatMap(b => (b.members || []).map(m => m._id))).size}
              </p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 00-.569 1.175 6.002 6.002 0 0011.908 0 1.224 1.224 0 00-.569-1.175 9.953 9.953 0 00-5.885-1.303 9.953 9.953 0 00-5.885 1.303z" />
              </svg>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Bills */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Bills</h2>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Create New Bill
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeBills.map((bill) => (
              <Card key={bill._id} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">{bill.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {bill.members?.length || 0} members
                  </p>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(bill.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <p className="text-xs text-gray-500">Invite Code</p>
                    <div className="flex items-center justify-between mt-1">
                      <code className="font-mono font-semibold text-gray-900">
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
                  </div>
                </CardBody>
                <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/bill/${bill._id}`)}
                    className="flex-1"
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/edit-bill/${bill._id}`)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Bill Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Bill"
        onClose={() => {
          setShowCreateModal(false);
          setNewTitle('');
          setCreateError('');
        }}
        size="md"
      >
        <form onSubmit={handleCreateBill} className="space-y-4">
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
    </MainLayout>
  );
}
