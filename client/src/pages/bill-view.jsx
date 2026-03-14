import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  Copy,
  LogOut,
  Scale,
  ArrowRight,
} from 'lucide-react';
import GuestAccessTimer from '../components/GuestAccessTimer.jsx';

/**
 * Bill view page - works for both registered users and guests.
 * Enforces guest 6hr access limit via API.
 */
export default function BillView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user, logout, loading: authLoading } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [showGuestLeaveModal, setShowGuestLeaveModal] = useState(false);
  const [showSplitSummaryModal, setShowSplitSummaryModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitType: 'equally',
    splitAmong: [],
  });
  // Default Paid by = host (bill owner). Only involved persons can be selected.
  const getDefaultPaidBy = () => {
    if (!bill?.members?.length) return '';
    const hostId = bill.createdBy?.toString?.() || bill.createdBy;
    const hostInMembers = hostId && bill.members.some((m) => m._id?.toString?.() === hostId || m._id === hostId);
    if (hostInMembers) return hostId;
    return bill.members[0]?._id?.toString?.() || bill.members[0]?._id || '';
  };
  // Custom split is only applicable when more than 2 persons are involved.
  const canUseCustomSplit = (bill?.members?.length || 0) > 2;

  useEffect(() => {
    if (authLoading) return;
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
  }, [authLoading, user, id, navigate]);

  // Refetch bill when opening split summary modal so summary is always live
  useEffect(() => {
    if (!showSplitSummaryModal || !id) return;
    let cancelled = false;
    apiRequest(`/api/bills/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!cancelled && data.bill) setBill(data.bill);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showSplitSummaryModal, id]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');
    if (!expenseForm.description.trim() || !expenseForm.paidBy) {
      setError('Please fill in description and who paid.');
      return;
    }
    const amountNum = parseFloat(expenseForm.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    const isCustom = expenseForm.splitType === 'custom' && canUseCustomSplit;
    if (isCustom && (!expenseForm.splitAmong || expenseForm.splitAmong.length === 0)) {
      setError('Select at least one person to split the expense among.');
      return;
    }

    setAddingExpense(true);
    setError('');
    try {
      const body = {
        description: expenseForm.description.trim(),
        amount: amountNum,
        paidBy: expenseForm.paidBy,
        splitType: expenseForm.splitType,
      };
      if (isCustom && expenseForm.splitAmong?.length) {
        body.splitAmong = expenseForm.splitAmong;
      }
      await apiRequest(`/api/bills/${id}/expenses`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const { bill: updatedBill } = await apiRequest(`/api/bills/${encodeURIComponent(id)}`);
      if (updatedBill) setBill(updatedBill);
      const defaultPaidBy = getDefaultPaidBy();
      setExpenseForm({
        description: '',
        amount: '',
        paidBy: defaultPaidBy,
        splitType: 'equally',
        splitAmong: [],
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
      const { bill: updatedBill } = await apiRequest(`/api/bills/${encodeURIComponent(id)}`);
      if (updatedBill) setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return null;

  const isGuestAccessExpired = error && error.includes('6-hour guest access');
  const showGuestRejoinPrompt =
    user.userType === 'guest' && (isGuestAccessExpired || !bill);

  // Invitation code for guest to copy before leaving (from bill or user)
  const guestInvitationCode = bill?.invitationCode || user?.invitationCode || '';

  const handleCopyInvitationCode = () => {
    if (!guestInvitationCode) return;
    navigator.clipboard.writeText(guestInvitationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGuestLeaveConfirm = () => {
    if (guestInvitationCode) {
      navigator.clipboard.writeText(guestInvitationCode);
    }
    setShowGuestLeaveModal(false);
    setCopiedCode(false);
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {user.userType === 'guest' ? (
            <button
              onClick={() => setShowGuestLeaveModal(true)}
              className="flex items-center gap-2 text-[#06B6D4] hover:text-[#0891b2] font-medium"
            >
              <LogOut size={20} />
              Leave
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-[#06B6D4] hover:text-[#0891b2] font-medium"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          )}
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
        {user.userType === 'guest' && !showGuestRejoinPrompt && (
          <div className="mb-6">
            <GuestAccessTimer user={user} />
          </div>
        )}
        {location.state?.guestWelcomeBack && (
          <Alert
            type="success"
            title="Welcome back"
            message={location.state.guestWelcomeBack}
          />
        )}
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

            {/* Button to open split summary in a modal (summary updates when expenses change) */}
            <div className="flex justify-center sm:justify-start">
              <Button
                variant="secondary"
                onClick={() => setShowSplitSummaryModal(true)}
                className="flex items-center gap-2"
              >
                <Scale size={20} />
                Split summary
              </Button>
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
                  onClick={() => {
                    setExpenseForm((prev) => ({ ...prev, paidBy: getDefaultPaidBy() }));
                    setShowAddExpense(true);
                  }}
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
                      const paidByName =
                        expense.paidByName ||
                        bill.members?.find((m) => m._id === expense.paidBy)?.name ||
                        'Unknown';
                      const idStr = (id) => (id && (id.toString?.() ?? String(id)));
                      const splitAmongIds = Array.isArray(expense.splitAmong) ? expense.splitAmong : [];
                      const splitAmongNames = splitAmongIds
                        .map((uid) => bill.members?.find((m) => idStr(m._id) === idStr(uid))?.name)
                        .filter(Boolean);
                      const isCustomSplit = expense.splitType === 'custom' && splitAmongNames.length > 0;
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
                              Paid by {paidByName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Split: {expense.splitType === 'custom' && isCustomSplit
                                ? `among ${splitAmongNames.join(', ')}`
                                : expense.splitType === 'custom'
                                  ? 'among selected members'
                                  : 'equally (all members)'}
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
                    title="No details"
                    message="Add your first expense to start tracking the split"
                  >
                    <Button
                      variant="primary"
                      onClick={() => {
                        setExpenseForm((prev) => ({ ...prev, paidBy: getDefaultPaidBy() }));
                        setShowAddExpense(true);
                      }}
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
              <option value="">Select who paid</option>
              {bill?.members?.map((member) => {
                const mid = member._id?.toString?.() ?? member._id;
                const hostId = bill?.createdBy?.toString?.() ?? bill?.createdBy;
                const isHost = hostId && mid === hostId;
                return (
                  <option key={mid} value={mid}>
                    {member.name} {isHost ? '(Host)' : ''} {member.email ? ` — ${member.email}` : ''}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-gray-500">Only involved persons are listed. Default is the host.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              With
            </label>
            <select
              value={canUseCustomSplit ? expenseForm.splitType : 'equally'}
              onChange={(e) => {
                const v = e.target.value;
                setExpenseForm((prev) => ({
                  ...prev,
                  splitType: v,
                  splitAmong: v === 'custom' && bill?.members?.length ? bill.members.map((m) => m._id?.toString?.() ?? m._id) : [],
                }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense || !canUseCustomSplit}
            >
              <option value="equally">Equally divided</option>
              <option value="custom" disabled={!canUseCustomSplit}>
                Custom {!canUseCustomSplit && '(need more than 2 persons)'}
              </option>
            </select>
            {expenseForm.splitType === 'custom' && canUseCustomSplit && bill?.members?.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Split among (divided equally by these persons only)
                </p>
                <div className="space-y-2">
                  {bill.members.map((member) => {
                    const mid = member._id?.toString?.() ?? member._id;
                    const checked = (expenseForm.splitAmong || []).includes(mid);
                    return (
                      <label key={mid} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setExpenseForm((prev) => {
                              const current = prev.splitAmong || [];
                              const next = checked
                                ? current.filter((id) => id !== mid)
                                : [...current, mid];
                              return { ...prev, splitAmong: next };
                            });
                          }}
                          className="rounded border-gray-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                          disabled={addingExpense}
                        />
                        <span className="text-sm text-gray-900">{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Guest Leave / Logout confirmation: save invitation code before leaving */}
      <Modal
        isOpen={showGuestLeaveModal}
        title="Leave this bill?"
        onClose={() => {
          setShowGuestLeaveModal(false);
          setCopiedCode(false);
        }}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            You will be logged out. Save your invitation code so you can re-enter this bill later.
          </p>
          {guestInvitationCode ? (
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg border border-gray-200">
              <code className="flex-1 font-mono font-semibold text-gray-900 text-lg tracking-wider">
                {guestInvitationCode}
              </code>
              <button
                type="button"
                onClick={handleCopyInvitationCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#06B6D4] text-white text-sm font-medium hover:bg-[#0891b2] transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Copy size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Your code could not be loaded. You can still leave; use the same invitation link or code you used to join.
            </p>
          )}
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowGuestLeaveModal(false);
                setCopiedCode(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGuestLeaveConfirm}>
              Leave &amp; Logout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Split summary modal: shows who owes whom (updates when expenses change) */}
      <Modal
        isOpen={showSplitSummaryModal}
        title="Split summary"
        onClose={() => setShowSplitSummaryModal(false)}
        size="md"
      >
        <div className="space-y-4">
          {(!bill?.split || (!bill.split.balances?.length && !bill.split.settlements?.length)) ? (
            <p className="text-gray-600">
              Add expenses to see who owes whom. The summary updates automatically when you add or remove expenses.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Based on who paid what and how each expense was split. This updates when you add or remove expenses.
              </p>
              {bill.split.balances && bill.split.balances.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Balances</h3>
                  <div className="space-y-2">
                    {bill.split.balances.map((b) => (
                      <div
                        key={b.userId}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{b.name}</span>
                        <span className={`font-semibold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {b.balance > 0 ? `+$${b.balance.toFixed(2)}` : b.balance < 0 ? `-$${Math.abs(b.balance).toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Positive = owed money (paid more than share). Negative = owes money.
                  </p>
                </div>
              )}
              {bill.split.settlements && bill.split.settlements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Settle up (suggested)</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Minimum number of payments so everyone is even:
                  </p>
                  <div className="space-y-3">
                    {bill.split.settlements.map((s, idx) => (
                      <div
                        key={`${s.from}-${s.to}-${idx}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white border border-cyan-100"
                      >
                        <span className="font-medium text-gray-900">{s.fromName}</span>
                        <ArrowRight size={18} className="text-cyan-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{s.toName}</span>
                        <span className="ml-auto font-bold text-cyan-700">${s.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bill.split.balances?.length > 0 && (!bill.split.settlements || bill.split.settlements.length === 0) && (
                <p className="text-sm text-gray-500">Balances are even — no one needs to pay anyone.</p>
              )}
            </>
          )}
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <Button variant="primary" onClick={() => setShowSplitSummaryModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
