import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from './Modal';
import { Button } from './Button';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Receipt,
  Wallet,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserCheck,
  CircleDollarSign,
  Handshake,
  Users,
  Shield,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

export default function BillViewModal({ isOpen, onClose, billId }) {
  const { user } = useAuth();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitType: 'equally',
    splitAmong: [],
  });

  useEffect(() => {
    if (!isOpen || !billId) return;

    const fetchBill = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
        setBill(data.bill);
      } catch (err) {
        setError(err.message || 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [isOpen, billId]);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getDefaultPaidBy = () => {
    if (!bill?.members?.length) return '';
    const hostId = bill.createdBy?.toString?.() || bill.createdBy;
    const hostInMembers = hostId && bill.members.some((m) => m._id?.toString?.() === hostId || m._id === hostId);
    if (hostInMembers) return hostId;
    return bill.members[0]?._id?.toString?.() || bill.members[0]?._id || '';
  };

  const canUseCustomSplit = (bill?.members?.length || 0) >= 2;

  const getUserSummary = () => {
    if (!bill?.split?.balances || !user) return null;
    const userId = user._id?.toString?.() || user._id;
    const entry = bill.split.balances.find(
      (b) => b.userId?.toString?.() === userId || b.userId === userId
    );
    if (!entry) return null;
    return { totalPaid: entry.totalPaid, share: entry.totalOwed, balance: entry.balance };
  };

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
      await apiRequest(`/api/bills/${billId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const { bill: updatedBill } = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
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
      await apiRequest(`/api/bills/${billId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      const { bill: updatedBill } = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
      if (updatedBill) setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  if (!bill && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="View Bill" size="xl">
        <LoadingSpinner />
      </Modal>
    );
  }

  if (!bill) {
    return null;
  }

  const totalAmount = (bill.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const userSummary = getUserSummary();
  const allSettled = bill.split?.settlements?.length === 0 && (bill.expenses?.length || 0) > 0;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={bill.title} size="xl">
      {error && <Alert type="error" message={error} />}

      <div className="space-y-5">

        {/* ─── Header Info ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <UserCheck size={14} />
              {bill.members?.find(m => {
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
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${allSettled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${allSettled ? 'bg-green-500' : 'bg-amber-500'}`} />
            {allSettled ? 'Settled' : 'Ongoing'}
          </span>
        </div>

        {/* ─── Financial Summary ─── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CircleDollarSign size={14} className="text-blue-600" />
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Total</p>
            </div>
            <p className="text-lg font-bold text-blue-900">₱{totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Receipt size={14} className="text-purple-600" />
              <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Your Share</p>
            </div>
            <p className="text-lg font-bold text-purple-900">₱{(userSummary?.share ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-cyan-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={14} className="text-cyan-600" />
              <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide">You Paid</p>
            </div>
            <p className="text-lg font-bold text-cyan-900">₱{(userSummary?.totalPaid ?? 0).toFixed(2)}</p>
          </div>
          <div className={`rounded-xl p-3 ${
            (userSummary?.balance ?? 0) > 0 ? 'bg-green-50' : (userSummary?.balance ?? 0) < 0 ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Handshake size={14} className={(userSummary?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Balance</p>
            </div>
            <p className={`text-lg font-bold ${
              (userSummary?.balance ?? 0) > 0 ? 'text-green-700' : (userSummary?.balance ?? 0) < 0 ? 'text-red-700' : 'text-gray-900'
            }`}>
              {(userSummary?.balance ?? 0) > 0
                ? `+₱${userSummary.balance.toFixed(2)}`
                : (userSummary?.balance ?? 0) < 0
                  ? `-₱${Math.abs(userSummary.balance).toFixed(2)}`
                  : '₱0.00'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {(userSummary?.balance ?? 0) > 0 ? 'You are owed' : (userSummary?.balance ?? 0) < 0 ? 'You owe' : 'All settled'}
            </p>
          </div>
        </div>

        {/* ─── Members Table ─── */}
        {bill.members?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Members ({bill.members.length})</p>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-4 px-4 py-2 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
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
                    <div key={mid} className="grid grid-cols-1 sm:grid-cols-4 gap-0.5 sm:gap-0 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#06B6D4] to-[#0891b2] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.name}
                            {isOwner && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-50 text-cyan-700 text-[9px] font-semibold rounded-full">
                                <Shield size={8} />
                                Owner
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{member.email}</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-900 sm:text-right">
                        <span className="sm:hidden text-[10px] text-gray-400 mr-1">Paid:</span>
                        ₱{paid.toFixed(2)}
                      </p>
                      <p className="text-xs font-medium text-gray-900 sm:text-right">
                        <span className="sm:hidden text-[10px] text-gray-400 mr-1">Share:</span>
                        ₱{owed.toFixed(2)}
                      </p>
                      <p className={`text-xs font-semibold sm:text-right ${
                        balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        <span className="sm:hidden text-[10px] text-gray-400 mr-1">Balance:</span>
                        {balance > 0 ? `+₱${balance.toFixed(2)}` : balance < 0 ? `-₱${Math.abs(balance).toFixed(2)}` : '₱0.00'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Expenses ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Expenses ({bill.expenses?.length || 0})</p>
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
              <Plus size={14} />
              Add Expense
            </Button>
          </div>
          {bill.expenses?.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {bill.expenses.map((expense) => {
                const paidByName =
                  expense.paidByName ||
                  bill.members?.find((m) => m._id === expense.paidBy)?.name ||
                  'Unknown';
                const isExpanded = expandedExpense === expense._id;
                const splitDetails = getExpenseSplitDetails(expense);
                const isCustomSplit = expense.splitType === 'custom';
                const expPaidById = expense.paidBy?.toString?.() || expense.paidBy;
                const isPersonalExpense = isCustomSplit && Array.isArray(expense.splitAmong) && expense.splitAmong.length === 1 && (expense.splitAmong[0]?.toString?.() || expense.splitAmong[0]) === expPaidById;
                return (
                  <div key={expense._id} className="group">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedExpense(isExpanded ? null : expense._id)}
                    >
                      <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors flex-shrink-0">
                        <Receipt size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <p className="text-[10px] text-gray-500">Paid by {paidByName}</p>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isPersonalExpense ? 'bg-gray-100 text-gray-600' : isCustomSplit ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isPersonalExpense ? 'Personal' : isCustomSplit ? 'Custom' : 'Equal'}
                          </span>
                          {expense.createdAt && (
                            <span className="text-[10px] text-gray-400">
                              {new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">₱{(expense.amount || 0).toFixed(2)}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense._id); }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                        title="Delete expense"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="text-gray-400 flex-shrink-0">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3">
                        <div className="ml-8 bg-gray-50 rounded-lg border border-gray-100 divide-y divide-gray-100">
                          <div className="grid grid-cols-2 px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
                            <span>Member</span>
                            <span className="text-right">Share</span>
                          </div>
                          {splitDetails.map((s) => (
                            <div key={s._id} className="grid grid-cols-2 px-3 py-2">
                              <p className="text-xs text-gray-700">{s.name}</p>
                              <p className="text-xs font-medium text-gray-900 text-right">₱{s.share.toFixed(2)}</p>
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
            <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500">No expenses yet</p>
            </div>
          )}
        </div>

        {/* ─── Settlement ─── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Handshake size={16} className="text-gray-500" />
            <p className="text-sm font-semibold text-gray-700">Settlement</p>
          </div>
          {bill.split?.settlements && bill.split.settlements.length > 0 ? (
            <div className="space-y-2">
              {bill.split.settlements.map((s, idx) => (
                <div
                  key={`${s.from}-${s.to}-${idx}`}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100"
                >
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold flex-shrink-0">
                    {s.fromName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs font-medium text-gray-900 truncate">{s.fromName}</span>
                  <ArrowRight size={14} className="text-cyan-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-900 truncate">{s.toName}</span>
                  <span className="ml-auto text-sm font-bold text-cyan-700 flex-shrink-0">₱{s.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (bill.expenses?.length || 0) > 0 ? (
            <div className="text-center py-4 bg-green-50 rounded-xl border border-green-200">
              <Check size={20} className="mx-auto text-green-600 mb-1" />
              <p className="text-sm font-medium text-green-700">All settled up!</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">Add expenses to see settlements.</p>
          )}
        </div>

        {/* ─── Invite Code ─── */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Invite Code</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm font-semibold text-gray-900 tracking-widest">
              {bill.invitationCode}
            </code>
            <button
              onClick={() => copyCode(bill.invitationCode)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#06B6D4] text-white text-xs font-medium hover:bg-[#0891b2] transition-colors"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Add Expense Modal */}
    <Modal isOpen={showAddExpense && isOpen} onClose={() => !addingExpense && setShowAddExpense(false)} title="Add Expense" size="md">
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleAddExpense} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Expense Name
          </label>
          <input
            type="text"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
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
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
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
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, paidBy: e.target.value }))}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
            disabled={addingExpense}
          >
            <option value="">Select who paid</option>
            {bill.members?.map((member) => {
              const mid = member._id?.toString?.() ?? member._id;
              const hostId = bill?.createdBy?.toString?.() ?? bill?.createdBy;
              const isHost = hostId && mid === hostId;
              const name = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
              return (
                <option key={mid} value={mid}>
                  {name} {isHost ? '(Host)' : ''}
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
                  const name = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
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
                      <span className="text-sm text-gray-900">{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={() => setShowAddExpense(false)} disabled={addingExpense}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={addingExpense}>
            {addingExpense ? 'Adding...' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
    </>
  );
}
