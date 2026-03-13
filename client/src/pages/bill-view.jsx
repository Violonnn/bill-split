import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/Button';
import { Card, CardBody, CardHeader } from '../components/Card';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  AlertCircle,
  Plus,
  Users,
  Trash2,
  DollarSign,
} from 'lucide-react';

/**
 * Bill view page - works for both registered users and guests.
 * Enforces guest 6hr access limit via API.
 */
export default function BillView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitType: 'equally',
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!id) {
      navigate('/');
      return;
    }

    let cancelled = false;
    const fetchBill = async () => {
      try {
        const data = await apiRequest(`/api/bills/${encodeURIComponent(id)}`);
        if (!cancelled && data.bill) {
          setBill(data.bill);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.data?.code === 'GUEST_ACCESS_EXPIRED'
              ? 'Your 6-hour guest access has expired. Please enter the invitation code again to continue.'
              : err.message || 'Failed to load bill.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBill();
    return () => {
      cancelled = true;
    };
  }, [user, id, navigate]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.amount || !expenseForm.paidBy) {
      setError('Please fill in all fields');
      return;
    }

    setAddingExpense(true);
    try {
      const { expense } = await apiRequest(`/api/bills/${id}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          description: expenseForm.description.trim(),
          amount: parseFloat(expenseForm.amount),
          paidBy: expenseForm.paidBy,
          splitType: expenseForm.splitType,
        }),
      });

      setBill((prev) => ({
        ...prev,
        expenses: [...(prev.expenses || []), expense],
      }));
      setExpenseForm({
        description: '',
        amount: '',
        paidBy: '',
        splitType: 'equally',
      });
      setShowAddExpense(false);
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await apiRequest(`/api/bills/${id}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      setBill((prev) => ({
        ...prev,
        expenses: (prev.expenses || []).filter((e) => e._id !== expenseId),
      }));
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  if (!user) return null;

  const isGuestAccessExpired = error && error.includes('6-hour guest access');
  const showGuestRejoinPrompt =
    user.userType === 'guest' && (isGuestAccessExpired || !bill);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-[#06B6D4] hover:text-[#0891b2] font-medium"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          {user.userType === 'guest' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/guest/upgrade')}
            >
              Upgrade Account
            </Button>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <Alert type="error" title="Error" message={error} />}

        {loading ? (
          <LoadingSpinner />
        ) : showGuestRejoinPrompt ? (
          <Card>
            <CardBody className="py-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <AlertCircle size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Access Expired
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {isGuestAccessExpired
                      ? 'Your 6-hour guest access has expired. Enter the invitation code again to continue viewing this bill.'
                      : 'Enter the invitation code to view this bill.'}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate('/guest/join' + (id ? `?code=${id}` : ''))
                    }
                  >
                    Enter Invitation Code
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : bill ? (
          <div className="space-y-6">
            {/* Bill Header */}
            <Card>
              <CardHeader>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {bill.title}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Invitation Code:{' '}
                    <code className="px-2 py-1 bg-gray-100 rounded font-mono text-gray-900">
                      {bill.invitationCode}
                    </code>
                  </p>
                </div>
              </CardHeader>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      $
                      {(bill.expenses || [])
                        .reduce((sum, exp) => sum + (exp.amount || 0), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Members</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bill.members?.length || 0}
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Plus size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bill.expenses?.length || 0}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Members Section */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900">Members</h2>
              </CardHeader>
              <CardBody>
                {bill.members && bill.members.length > 0 ? (
                  <div className="space-y-3">
                    {bill.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                          {member.userType || 'User'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No members added yet</p>
                )}
              </CardBody>
            </Card>

            {/* Expenses Section */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Expense
                </Button>
              </CardHeader>
              <CardBody>
                {bill.expenses && bill.expenses.length > 0 ? (
                  <div className="space-y-3">
                    {bill.expenses.map((expense) => {
                      const paidByMember = bill.members?.find(
                        (m) => m._id === expense.paidBy
                      );
                      return (
                        <div
                          key={expense._id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {expense.description}
                            </p>
                            <p className="text-sm text-gray-600">
                              Paid by {paidByMember?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Split: {expense.splitType}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-bold text-gray-900">
                              ${expense.amount.toFixed(2)}
                            </p>
                            <button
                              onClick={() => handleDeleteExpense(expense._id)}
                              className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={AlertCircle}
                    title="No Expenses Yet"
                    message="Add your first expense to start tracking the split"
                  >
                    <Button
                      variant="primary"
                      onClick={() => setShowAddExpense(true)}
                    >
                      Add Expense
                    </Button>
                  </EmptyState>
                )}
              </CardBody>
            </Card>

            {user.userType === 'guest' && (
              <Alert
                type="warning"
                title="Guest Access"
                message="Guest access: 6 hours per day. You can re-enter the code to extend access."
              />
            )}
          </div>
        ) : null}
      </main>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        title="Add Expense"
        onClose={() => setShowAddExpense(false)}
        size="md"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Expense Name
            </label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="e.g., Dinner"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) =>
                setExpenseForm((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Paid By
            </label>
            <select
              value={expenseForm.paidBy}
              onChange={(e) =>
                setExpenseForm((prev) => ({
                  ...prev,
                  paidBy: e.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense}
            >
              <option value="">Select a member</option>
              {bill?.members?.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Split Type
            </label>
            <select
              value={expenseForm.splitType}
              onChange={(e) =>
                setExpenseForm((prev) => ({
                  ...prev,
                  splitType: e.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense}
            >
              <option value="equally">Equally Divided</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => setShowAddExpense(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={addingExpense}>
              {addingExpense ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
