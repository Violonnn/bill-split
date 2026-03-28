import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import Modal from './Modal';
import { Button } from './Button';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import { DollarSign, Users, Copy, Check, Plus, Trash2 } from 'lucide-react';

export default function BillViewModal({ isOpen, onClose, billId }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitType: 'equally',
    splitAmong: [],
  });
  const [paymentErrors, setPaymentErrors] = useState({});

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

  // Calculate split summary for each member
  const calculateSplitSummary = () => {
    if (!bill.members || !bill.expenses) return {};

    const summary = {};

    // Initialize each member's payment and share
    bill.members.forEach((member) => {
      summary[member._id] = {
        member,
        paid: 0,
        share: 0,
      };
    });

    // Calculate how much each member paid
    bill.expenses.forEach((expense) => {
      const paidByMemberId = expense.paidBy?._id || expense.paidBy;
      if (summary[paidByMemberId]) {
        summary[paidByMemberId].paid += expense.amount || 0;
      }
    });

    // Calculate each member's share
    bill.expenses.forEach((expense) => {
      const splitCount = expense.splitAmong?.length || bill.members.length;
      const sharePerPerson = (expense.amount || 0) / splitCount;

      if (expense.splitAmong && expense.splitAmong.length > 0) {
        expense.splitAmong.forEach((memberId) => {
          if (summary[memberId]) {
            summary[memberId].share += sharePerPerson;
          }
        });
      } else {
        // Split equally among all members
        bill.members.forEach((member) => {
          if (summary[member._id]) {
            summary[member._id].share += sharePerPerson;
          }
        });
      }
    });

    // Calculate balance (positive = owed money, negative = owes money)
    Object.keys(summary).forEach((memberId) => {
      summary[memberId].balance = summary[memberId].paid - summary[memberId].share;
    });

    return summary;
  };

  // Get default paid by person (bill owner)
  const getDefaultPaidBy = () => {
    if (!bill?.members?.length) return '';
    const hostId = bill.createdBy?.toString?.() || bill.createdBy;
    const hostInMembers = hostId && bill.members.some((m) => m._id?.toString?.() === hostId || m._id === hostId);
    if (hostInMembers) return hostId;
    return bill.members[0]?._id?.toString?.() || bill.members[0]?._id || '';
  };

  // Custom split only works with 3+ members
  const canUseCustomSplit = (bill?.members?.length || 0) > 2;

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
      <Modal isOpen={isOpen} onClose={onClose} title="View Bill" size="lg">
        <LoadingSpinner />
      </Modal>
    );
  }

  if (!bill) {
    return null;
  }

  const totalAmount = (bill.expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={bill.title} size="lg">
      {error && <Alert type="error" message={error} />}

      <div className="space-y-6">
        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-blue-600" />
              <label className="text-sm font-semibold text-blue-600">Total Amount</label>
            </div>
            <p className="text-2xl font-bold text-blue-900">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-purple-600" />
              <label className="text-sm font-semibold text-purple-600">Members</label>
            </div>
            <p className="text-2xl font-bold text-purple-900">{bill.members?.length || 0}</p>
          </div>
        </div>

        {/* Split Summary */}
        {bill.members?.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-3">Split Summary</label>
            <div className="space-y-2">
              {Object.values(calculateSplitSummary())
                .sort((a, b) => b.balance - a.balance)
                .map((item) => {
                  const isOwed = item.balance > 0;
                  const displayBalance = Math.abs(item.balance);
                  return (
                    <div
                      key={item.member._id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isOwed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">
                          {item.member.firstName?.charAt(0)}{item.member.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.member.firstName && item.member.lastName
                              ? `${item.member.firstName} ${item.member.lastName}`
                              : item.member.email || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isOwed ? 'text-green-700' : 'text-red-700'}`}>
                          {isOwed ? 'is owed' : 'owes'}
                        </p>
                        <p className={`text-sm font-bold ${isOwed ? 'text-green-700' : 'text-red-700'}`}>
                          ${displayBalance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Invitation Code */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">Invitation Code</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded font-mono text-sm text-gray-900">
              {bill.invitationCode}
            </code>
            <button
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
          </div>
        </div>

        {/* Members List */}
        {bill.members?.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-3">Members</label>
            <div className="space-y-2">
              {bill.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  {bill.createdBy?.toString?.() === member._id?.toString?.() || bill.createdBy === member._id ? (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Owner
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-600">Expenses</label>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setExpenseForm((prev) => ({ ...prev, paidBy: getDefaultPaidBy() }));
                setShowAddExpense(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Expense
            </Button>
          </div>
          {bill.expenses?.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bill.expenses.map((expense) => (
                <div key={expense._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-600">
                      Paid by{' '}
                      {expense.paidBy?.firstName} {expense.paidBy?.lastName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-900">${(expense.amount || 0).toFixed(2)}</p>
                    <button
                      onClick={() => handleDeleteExpense(expense._id)}
                      className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
                      title="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">No expenses yet</p>
            </div>
          )}
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
            value={canUseCustomSplit ? expenseForm.splitType : 'equally'}
            onChange={(e) => {
              const v = e.target.value;
              setExpenseForm((prev) => ({
                ...prev,
                splitType: v,
                splitAmong: v === 'custom' && bill?.members?.length ? bill.members.map((m) => m._id?.toString?.() ?? m._id) : [],
              }));
            }}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
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
