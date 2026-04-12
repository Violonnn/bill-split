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
  Copy,
  LogOut,
  ArrowRight,
  Check,
  Receipt,
  Wallet,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserCheck,
  CircleDollarSign,
  Handshake,
  ClipboardList,
  Shield,
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
  const [expandedExpense, setExpandedExpense] = useState(null);
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
  // Custom split is applicable when at least 2 persons are involved.
  const canUseCustomSplit = (bill?.members?.length || 0) >= 2;

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
    const isPersonal = expenseForm.splitType === 'personal';
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
        splitType: isPersonal ? 'custom' : expenseForm.splitType,
      };
      if (isPersonal) {
        body.splitAmong = [expenseForm.paidBy];
      } else if (isCustom && expenseForm.splitAmong?.length) {
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

  // Helper: compute current user's financial summary
  const getUserSummary = () => {
    if (!bill?.split?.balances || !user) return null;
    const userId = user._id?.toString?.() || user._id;
    const entry = bill.split.balances.find(
      (b) => b.userId?.toString?.() === userId || b.userId === userId
    );
    if (!entry) return null;
    return { totalPaid: entry.totalPaid, share: entry.totalOwed, balance: entry.balance };
  };

  // Helper: get expense split details for expandable row
  const getExpenseSplitDetails = (expense) => {
    if (!bill?.members) return [];
    const splitAmongIds = Array.isArray(expense.splitAmong) ? expense.splitAmong : [];
    const isCustom = expense.splitType === 'custom' && splitAmongIds.length > 0;
    const targetMembers = isCustom
      ? bill.members.filter((m) => {
          const mid = m._id?.toString?.() || m._id;
          return splitAmongIds.some((sid) => (sid?.toString?.() || sid) === mid);
        })
      : bill.members;
    const perPerson = targetMembers.length > 0 ? (expense.amount || 0) / targetMembers.length : 0;
    return targetMembers.map((m) => ({
      name: m.name,
      _id: m._id,
      share: perPerson,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {user.userType === 'guest' ? (
            <button
              onClick={() => setShowGuestLeaveModal(true)}
              className="flex items-center gap-2 text-[#06B6D4] hover:text-[#0891b2] font-medium transition-colors"
            >
              <LogOut size={20} />
              Leave
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-[#06B6D4] hover:text-[#0891b2] font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Bills
            </button>
          )}
          {user.userType === 'guest' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/guest/upgrade', { state: { fromBillId: id } })}
            >
              Upgrade Account
            </Button>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            {/* ─── Header Section ─── */}
            <Card>
              <CardBody className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{bill.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <UserCheck size={14} />
                        Created by {bill.members?.find(m => {
                          const mid = m._id?.toString?.() || m._id;
                          const ownerId = bill.createdBy?.toString?.() || bill.createdBy;
                          return mid === ownerId;
                        })?.name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const allSettled = bill.split?.settlements?.length === 0 && (bill.expenses?.length || 0) > 0;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${allSettled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          <span className={`w-2 h-2 rounded-full ${allSettled ? 'bg-green-500' : 'bg-amber-500'}`} />
                          {allSettled ? 'Settled' : 'Ongoing'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* ─── Financial Summary ─── */}
            {(() => {
              const totalAmount = (bill.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
              const userSummary = getUserSummary();
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <CircleDollarSign size={18} className="text-blue-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">₱{totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Receipt size={18} className="text-purple-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Share</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">₱{(userSummary?.share ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-cyan-50 rounded-lg">
                        <Wallet size={18} className="text-cyan-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">You Paid</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">₱{(userSummary?.totalPaid ?? 0).toFixed(2)}</p>
                  </div>
                  <div className={`rounded-xl shadow-sm border p-4 ${
                    (userSummary?.balance ?? 0) > 0
                      ? 'bg-green-50 border-green-200'
                      : (userSummary?.balance ?? 0) < 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${
                        (userSummary?.balance ?? 0) >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Handshake size={18} className={
                          (userSummary?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        } />
                      </div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance</p>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${
                      (userSummary?.balance ?? 0) > 0
                        ? 'text-green-700'
                        : (userSummary?.balance ?? 0) < 0
                          ? 'text-red-700'
                          : 'text-gray-900'
                    }`}>
                      {(userSummary?.balance ?? 0) > 0
                        ? `+₱${(userSummary.balance).toFixed(2)}`
                        : (userSummary?.balance ?? 0) < 0
                          ? `-₱${Math.abs(userSummary.balance).toFixed(2)}`
                          : '₱0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(userSummary?.balance ?? 0) > 0
                        ? 'You are owed money'
                        : (userSummary?.balance ?? 0) < 0
                          ? 'You owe money'
                          : 'All settled'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* ─── Members Section ─── */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Members ({bill.members?.length || 0})</h2>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {bill.members && bill.members.length > 0 ? (
                  <>
                    {/* Table header */}
                    <div className="hidden sm:grid grid-cols-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span>Name</span>
                      <span className="text-right">Paid</span>
                      <span className="text-right">Share</span>
                      <span className="text-right">Balance</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {bill.members.map((member) => {
                        const mid = member._id?.toString?.() || member._id;
                        const ownerId = bill.createdBy?.toString?.() || bill.createdBy;
                        const isOwner = mid === ownerId;
                        const balanceEntry = bill.split?.balances?.find(
                          (b) => b.userId?.toString?.() === mid || b.userId === mid
                        );
                        const paid = balanceEntry?.totalPaid ?? 0;
                        const owed = balanceEntry?.totalOwed ?? 0;
                        const balance = balanceEntry?.balance ?? 0;
                        return (
                          <div key={mid} className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-0 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#0891b2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {member.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.name}
                                  {isOwner && (
                                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] font-semibold rounded-full">
                                      <Shield size={10} />
                                      Owner
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">{member.email}</p>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-gray-900 sm:text-right">
                              <span className="sm:hidden text-xs text-gray-400 mr-1">Paid:</span>
                              ₱{paid.toFixed(2)}
                            </p>
                            <p className="text-sm font-medium text-gray-900 sm:text-right">
                              <span className="sm:hidden text-xs text-gray-400 mr-1">Share:</span>
                              ₱{owed.toFixed(2)}
                            </p>
                            <p className={`text-sm font-semibold sm:text-right ${
                              balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              <span className="sm:hidden text-xs text-gray-400 mr-1">Balance:</span>
                              {balance > 0 ? `+₱${balance.toFixed(2)}` : balance < 0 ? `-₱${Math.abs(balance).toFixed(2)}` : '₱0.00'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="p-6">
                    <p className="text-gray-500 text-sm">No members added yet</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* ─── Expense Breakdown Section ─── */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} className="text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Expenses ({bill.expenses?.length || 0})</h2>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setExpenseForm((prev) => ({ ...prev, paidBy: getDefaultPaidBy() }));
                    setShowAddExpense(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  Add Expense
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                {bill.expenses && bill.expenses.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {bill.expenses.map((expense) => {
                      const paidByName =
                        expense.paidByName ||
                        bill.members?.find((m) => m._id === expense.paidBy)?.name ||
                        'Unknown';
                      const isExpanded = expandedExpense === expense._id;
                      const splitDetails = getExpenseSplitDetails(expense);
                      const isCustomSplit = expense.splitType === 'custom';
                      const paidById = expense.paidBy?.toString?.() || expense.paidBy;
                      const isPersonalExpense = isCustomSplit && Array.isArray(expense.splitAmong) && expense.splitAmong.length === 1 && (expense.splitAmong[0]?.toString?.() || expense.splitAmong[0]) === paidById;
                      return (
                        <div key={expense._id} className="group">
                          <div
                            className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedExpense(isExpanded ? null : expense._id)}
                          >
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                              <Receipt size={18} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{expense.description}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                <p className="text-xs text-gray-500">Paid by {paidByName}</p>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isPersonalExpense ? 'bg-gray-100 text-gray-600' : isCustomSplit ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {isPersonalExpense ? 'Personal' : isCustomSplit ? 'Custom' : 'Equal'}
                                </span>
                                {expense.createdAt && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-base font-bold text-gray-900 flex-shrink-0">₱{(expense.amount || 0).toFixed(2)}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense._id); }}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                              title="Delete expense"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="text-gray-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                          {/* Expandable split details */}
                          {isExpanded && (
                            <div className="px-6 pb-4">
                              <div className="ml-10 bg-gray-50 rounded-lg border border-gray-100 divide-y divide-gray-100">
                                <div className="grid grid-cols-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                  <span>Member</span>
                                  <span className="text-right">Share</span>
                                </div>
                                {splitDetails.map((s) => (
                                  <div key={s._id} className="grid grid-cols-2 px-4 py-2.5">
                                    <p className="text-sm text-gray-700">{s.name}</p>
                                    <p className="text-sm font-medium text-gray-900 text-right">₱{s.share.toFixed(2)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6">
                    <EmptyState
                      icon={AlertCircle}
                      title="No expenses yet"
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
                  </div>
                )}
              </CardBody>
            </Card>

            {/* ─── Settlement Section ─── */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Handshake size={20} className="text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Settlement</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSplitSummaryModal(true)}
                  className="flex items-center gap-1.5"
                >
                  View Full Summary
                </Button>
              </CardHeader>
              <CardBody>
                {bill.split?.settlements && bill.split.settlements.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 mb-2">Minimum payments so everyone is even:</p>
                    {bill.split.settlements.map((s, idx) => (
                      <div
                        key={`${s.from}-${s.to}-${idx}`}
                        className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100"
                      >
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                          {s.fromName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{s.fromName}</p>
                          <p className="text-[10px] text-gray-400">pays</p>
                        </div>
                        <ArrowRight size={18} className="text-cyan-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{s.toName}</p>
                          <p className="text-[10px] text-gray-400">receives</p>
                        </div>
                        <span className="text-base font-bold text-cyan-700 flex-shrink-0">₱{s.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (bill.expenses?.length || 0) > 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                      <Check size={24} className="text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">All settled up!</p>
                    <p className="text-xs text-gray-400 mt-1">No payments needed — everyone is even.</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Add expenses to see settlement suggestions.</p>
                )}
              </CardBody>
            </Card>

            {/* ─── Invite Section ─── */}
            <Card>
              <CardBody className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Invite Code</h3>
                    <p className="text-xs text-gray-400">Share this code so others can join this bill</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <code className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg font-mono text-sm font-semibold text-gray-900 tracking-widest">
                      {bill.invitationCode}
                    </code>
                    <button
                      onClick={handleCopyInvitationCode}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#06B6D4] text-white text-sm font-medium hover:bg-[#0891b2] transition-colors"
                    >
                      {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
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
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense}
            >
              <option value="">Select who paid</option>
              {bill?.members?.map((member) => {
                const mid = member._id?.toString?.() ?? member._id;
                const hostId = bill?.createdBy?.toString?.() ?? bill?.createdBy;
                const isHost = hostId && mid === hostId;
                return (
                  <option key={mid} value={mid}>
                    {member.name} {isHost ? '(Host)' : ''}
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
              value={expenseForm.splitType}
              onChange={(e) => {
                const v = e.target.value;
                setExpenseForm((prev) => ({
                  ...prev,
                  splitType: v,
                  splitAmong: v === 'custom' && bill?.members?.length ? bill.members.map((m) => m._id?.toString?.() ?? m._id) : [],
                }));
              }}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              disabled={addingExpense}
            >
              <option value="equally">Equally divided</option>
              <option value="personal">Only me (Personal)</option>
              <option value="custom" disabled={!canUseCustomSplit}>
                Custom {!canUseCustomSplit && '(need at least 2 persons)'}
              </option>
            </select>
            {expenseForm.splitType === 'personal' && (
              <p className="mt-1 text-xs text-gray-500">This expense won't affect settlements — only the payer is responsible.</p>
            )}
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
                          {b.balance > 0 ? `+₱${b.balance.toFixed(2)}` : b.balance < 0 ? `-₱${Math.abs(b.balance).toFixed(2)}` : '₱0.00'}
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
                        <span className="ml-auto font-bold text-cyan-700">₱{s.amount.toFixed(2)}</span>
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
