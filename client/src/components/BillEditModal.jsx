import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import { Button } from './Button';
import { Plus, Trash2, UserPlus, Search, Check, Copy, Receipt, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function BillEditModal({ isOpen, onClose, billId }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [addingUserId, setAddingUserId] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '' });
  const [guestFormErrors, setGuestFormErrors] = useState({});
  const [addingGuest, setAddingGuest] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ description: '', amount: '', paidBy: '', splitType: 'equally', splitAmong: [] });
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  useEffect(() => {
    if (!isOpen || !billId) return;

    const fetchBill = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
        setBill(data.bill);
        setTitle(data.bill.title);
      } catch (err) {
        setError(err.message || 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [isOpen, billId]);

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Bill title is required');
      return;
    }

    setSaving(true);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}`, {
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

  const handleRegenerateCode = async () => {
    setRegeneratingCode(true);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}`, {
        method: 'PATCH',
        body: JSON.stringify({ regenerateCode: true }),
      });
      setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to regenerate code');
    } finally {
      setRegeneratingCode(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setError('Email is required');
      return;
    }

    setAddingMember(true);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail.trim() }),
      });
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

  const validateGuestField = (name, value) => {
    if (name === 'firstName' || name === 'lastName') {
      if (!value?.trim()) return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
      if (/\s/.test(value.trim())) return 'Spaces are not valid input';
      if (value.trim().length < 2) return `${name === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters`;
      return null;
    }
    if (name === 'email') {
      if (!value?.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address';
      return null;
    }
    return null;
  };

  const handleAddGuestSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    const fnErr = validateGuestField('firstName', guestForm.firstName);
    if (fnErr) errors.firstName = fnErr;
    const lnErr = validateGuestField('lastName', guestForm.lastName);
    if (lnErr) errors.lastName = lnErr;
    const emailErr = validateGuestField('email', guestForm.email);
    if (emailErr) errors.email = emailErr;
    setGuestFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddingGuest(true);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/add-guest`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: guestForm.firstName.trim(),
          lastName: guestForm.lastName.trim(),
          email: guestForm.email.trim().toLowerCase(),
        }),
      });
      setBill(updatedBill);
      setGuestForm({ firstName: '', lastName: '', email: '' });
      setGuestFormErrors({});
      setShowAddGuestForm(false);
    } catch (err) {
      setError(err.message || 'Failed to add guest');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleSearchUsers = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchError('Email/Username/Nickname required');
      setSearchResults([]);
      return;
    }
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setError('');
    setSearchError('');
    try {
      const { users } = await apiRequest(`/api/bills/${billId}/search-users?q=${encodeURIComponent(q)}`);
      if (!users || users.length === 0) {
        setSearchError('User not found');
        setSearchResults([]);
      } else {
        setSearchError('');
        setSearchResults(users);
      }
    } catch (err) {
      setError(err.message || 'Failed to search');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddParticipant = async (userId) => {
    setAddingUserId(userId);
    setError('');
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/participants`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      setBill(updatedBill);
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err.message || 'Failed to add user');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setRemovingMember(memberId);
    try {
      const { bill: updatedBill } = await apiRequest(`/api/bills/${billId}/members/${memberId}`, {
        method: 'DELETE',
      });
      setBill(updatedBill);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const canUseCustomSplit = (bill?.members?.length || 0) >= 2;

  const startEditExpense = (expense) => {
    const paidById = expense.paidBy?._id?.toString?.() || expense.paidBy?.toString?.() || expense.paidBy;
    const splitAmongIds = Array.isArray(expense.splitAmong) ? expense.splitAmong.map((id) => id?.toString?.() || id) : [];
    const isPersonal = expense.splitType === 'custom' && splitAmongIds.length === 1 && splitAmongIds[0] === paidById;
    setEditingExpenseId(expense._id);
    setEditExpenseForm({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      paidBy: paidById,
      splitType: isPersonal ? 'personal' : (expense.splitType || 'equally'),
      splitAmong: splitAmongIds,
    });
  };

  const handleSaveExpense = async (expenseId) => {
    setError('');
    const amountNum = parseFloat(editExpenseForm.amount);
    if (!editExpenseForm.description.trim()) {
      setError('Expense name is required');
      return;
    }
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    const isPersonal = editExpenseForm.splitType === 'personal';
    const isCustom = editExpenseForm.splitType === 'custom' && canUseCustomSplit;
    if (isCustom && (!editExpenseForm.splitAmong || editExpenseForm.splitAmong.length === 0)) {
      setError('Select at least one person to split among.');
      return;
    }

    setSavingExpense(true);
    try {
      const body = {
        description: editExpenseForm.description.trim(),
        amount: amountNum,
        paidBy: editExpenseForm.paidBy,
        splitType: isPersonal ? 'custom' : editExpenseForm.splitType,
      };
      if (isPersonal) {
        body.splitAmong = [editExpenseForm.paidBy];
      } else if (isCustom && editExpenseForm.splitAmong?.length) {
        body.splitAmong = editExpenseForm.splitAmong;
      }
      await apiRequest(`/api/bills/${billId}/expenses/${expenseId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const { bill: updatedBill } = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
      if (updatedBill) setBill(updatedBill);
      setEditingExpenseId(null);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    setDeletingExpenseId(expenseId);
    try {
      await apiRequest(`/api/bills/${billId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      const { bill: updatedBill } = await apiRequest(`/api/bills/${encodeURIComponent(billId)}`);
      if (updatedBill) setBill(updatedBill);
      if (editingExpenseId === expenseId) setEditingExpenseId(null);
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  if (!bill && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Bill" size="xl">
        <LoadingSpinner />
      </Modal>
    );
  }

  if (!bill) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${bill.title}`} size="xl">
      {error && <Alert type="error" title="Error" message={error} />}

      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
        {/* Bill Details */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bill Details</h3>
          <form onSubmit={handleSaveTitle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Bill Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Invitation Code</label>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 min-w-[120px] px-4 py-2 bg-gray-100 rounded-lg font-mono text-gray-900">
                  {bill.invitationCode}
                </code>
                <button
                  type="button"
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode}
                >
                  {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Members Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Add Involved Persons</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddGuestForm(true)}
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                Add Guest User
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
          </div>

          {/* Search users to add */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search users to add
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchUsers())}
                placeholder="Email, name, or nickname (min 2 characters)"
                className={`flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                  searchError
                    ? 'border-red-500 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-[#06B6D4]'
                }`}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSearchUsers}
                disabled={searching}
                className="flex items-center gap-2"
              >
                <Search size={16} />
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {searchError && (
              <div className="mt-2 text-red-600 text-xs">{searchError}</div>
            )}
            {searchResults.length > 0 && (
              <ul className="mt-3 space-y-2">
                {searchResults.map((u) => (
                  <li
                    key={u._id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{u.name || u.email}</span>
                      <span className="text-sm text-gray-600 ml-2">({u.email})</span>
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs capitalize">{u.userType}</span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddParticipant(u._id)}
                      disabled={addingUserId === u._id}
                    >
                      {addingUserId === u._id ? 'Adding...' : 'Add'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Current Members List */}
          {bill.members && bill.members.length > 0 ? (
            <div className="space-y-2">
              {bill.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bill.createdBy?.toString?.() === member._id?.toString?.() || bill.createdBy === member._id ? (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Owner</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={removingMember === member._id}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No members yet</p>
          )}
        </div>

        {/* ─── Expenses Section ─── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={20} className="text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900">Expenses ({bill.expenses?.length || 0})</h3>
          </div>

          {bill.expenses?.length > 0 ? (
            <div className="space-y-2">
              {bill.expenses.map((expense) => {
                const isEditing = editingExpenseId === expense._id;
                const paidByName =
                  expense.paidByName ||
                  bill.members?.find((m) => (m._id?.toString?.() || m._id) === (expense.paidBy?.toString?.() || expense.paidBy))?.name ||
                  'Unknown';
                const paidById = expense.paidBy?.toString?.() || expense.paidBy;
                const splitAmongIds = Array.isArray(expense.splitAmong) ? expense.splitAmong.map((id) => id?.toString?.() || id) : [];
                const isCustomSplit = expense.splitType === 'custom';
                const isPersonalExpense = isCustomSplit && splitAmongIds.length === 1 && splitAmongIds[0] === paidById;

                return (
                  <div key={expense._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {isEditing ? (
                      /* ── Inline Edit Form ── */
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Expense Name</label>
                          <input
                            type="text"
                            value={editExpenseForm.description}
                            onChange={(e) => setEditExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                            disabled={savingExpense}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editExpenseForm.amount}
                              onChange={(e) => setEditExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                              disabled={savingExpense}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Paid By</label>
                            <select
                              value={editExpenseForm.paidBy}
                              onChange={(e) => setEditExpenseForm((prev) => ({ ...prev, paidBy: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                              disabled={savingExpense}
                            >
                              <option value="">Select who paid</option>
                              {bill.members?.map((member) => {
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
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">With</label>
                          <select
                            value={editExpenseForm.splitType}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEditExpenseForm((prev) => ({
                                ...prev,
                                splitType: v,
                                splitAmong: v === 'custom' && bill?.members?.length ? bill.members.map((m) => m._id?.toString?.() ?? m._id) : [],
                              }));
                            }}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                            disabled={savingExpense}
                          >
                            <option value="equally">Equally divided</option>
                            <option value="personal">Only me (Personal)</option>
                            <option value="custom" disabled={!canUseCustomSplit}>
                              Custom {!canUseCustomSplit && '(need at least 2 persons)'}
                            </option>
                          </select>
                          {editExpenseForm.splitType === 'personal' && (
                            <p className="mt-1 text-xs text-gray-500">This expense won't affect settlements — only the payer is responsible.</p>
                          )}
                          {editExpenseForm.splitType === 'custom' && canUseCustomSplit && bill?.members?.length > 0 && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-600 mb-1.5">Split among:</p>
                              <div className="space-y-1.5">
                                {bill.members.map((member) => {
                                  const mid = member._id?.toString?.() ?? member._id;
                                  const checked = (editExpenseForm.splitAmong || []).includes(mid);
                                  return (
                                    <label key={mid} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setEditExpenseForm((prev) => {
                                            const current = prev.splitAmong || [];
                                            const next = checked ? current.filter((id) => id !== mid) : [...current, mid];
                                            return { ...prev, splitAmong: next };
                                          });
                                        }}
                                        className="rounded border-gray-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                                        disabled={savingExpense}
                                      />
                                      <span className="text-xs text-gray-900">{member.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setEditingExpenseId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={savingExpense}
                          >
                            Cancel
                          </button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSaveExpense(expense._id)}
                            disabled={savingExpense}
                          >
                            {savingExpense ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Read-only Row ── */
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gray-200 rounded-lg flex-shrink-0">
                          <Receipt size={14} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <p className="text-[10px] text-gray-500">Paid by {paidByName}</p>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${isPersonalExpense ? 'bg-gray-200 text-gray-600' : isCustomSplit ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {isPersonalExpense ? 'Personal' : isCustomSplit ? 'Custom' : 'Equal'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900 flex-shrink-0">₱{(expense.amount || 0).toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => startEditExpense(expense)}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                          title="Edit expense"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(expense._id)}
                          disabled={deletingExpenseId === expense._id}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                          title="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No expenses yet</p>
          )}
        </div>
      </div>

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

      {/* Add Guest User Modal */}
      <Modal
        isOpen={showAddGuestForm}
        title="Add Guest User"
        onClose={() => {
          setShowAddGuestForm(false);
          setGuestForm({ firstName: '', lastName: '', email: '' });
          setGuestFormErrors({});
        }}
        size="md"
      >
        <form onSubmit={handleAddGuestSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Add a guest with their name and email. Same validation as registration (no spaces, valid email).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
            <input
              type="text"
              value={guestForm.firstName}
              onChange={(e) => {
                setGuestForm((p) => ({ ...p, firstName: e.target.value }));
                setGuestFormErrors((p) => ({ ...p, firstName: undefined }));
              }}
              placeholder="First name"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.firstName && (
              <p className="text-red-600 text-xs mt-1">{guestFormErrors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
            <input
              type="text"
              value={guestForm.lastName}
              onChange={(e) => {
                setGuestForm((p) => ({ ...p, lastName: e.target.value }));
                setGuestFormErrors((p) => ({ ...p, lastName: undefined }));
              }}
              placeholder="Last name"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.lastName && (
              <p className="text-red-600 text-xs mt-1">{guestFormErrors.lastName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
            <input
              type="email"
              value={guestForm.email}
              onChange={(e) => {
                setGuestForm((p) => ({ ...p, email: e.target.value }));
                setGuestFormErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="guest@example.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                guestFormErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={addingGuest}
            />
            {guestFormErrors.email && (
              <p className="text-red-600 text-xs mt-1">{guestFormErrors.email}</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddGuestForm(false);
                setGuestForm({ firstName: '', lastName: '', email: '' });
                setGuestFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={addingGuest}>
              {addingGuest ? 'Adding...' : 'Add Guest'}
            </Button>
          </div>
        </form>
      </Modal>
    </Modal>
  );
}
