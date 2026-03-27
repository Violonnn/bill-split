import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import { DollarSign, Users, Copy, Check } from 'lucide-react';

export default function BillViewModal({ isOpen, onClose, billId }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

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
        {bill.expenses?.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-3">Expenses</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bill.expenses.map((expense, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-600">
                      Paid by{' '}
                      {expense.paidBy?.firstName} {expense.paidBy?.lastName}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">${(expense.amount || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {bill.expenses?.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No expenses yet</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
