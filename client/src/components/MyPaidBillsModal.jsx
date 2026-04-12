import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import { Receipt, Wallet, ChevronDown, ChevronUp } from 'lucide-react';

export default function MyPaidBillsModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedBill, setExpandedBill] = useState(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchBills = async () => {
      setLoading(true);
      setError('');
      try {
        const { bills: allBills } = await apiRequest('/api/bills');
        setBills(allBills || []);
      } catch (err) {
        setError(err.message || 'Failed to load bills');
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) setExpandedBill(null);
  }, [isOpen]);

  const userId = user?._id?.toString?.() || user?._id;

  // Group expenses paid by the current user, organized by bill
  const paidByMe = bills
    .map((bill) => {
      const myExpenses = (bill.expenses || []).filter((exp) => {
        const paidById = exp.paidBy?._id?.toString?.() || exp.paidBy?.toString?.() || exp.paidBy;
        return paidById === userId;
      });
      if (myExpenses.length === 0) return null;
      return {
        billId: bill._id,
        billTitle: bill.title,
        expenses: myExpenses,
        total: myExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
      };
    })
    .filter(Boolean);

  const grandTotal = paidByMe.reduce((sum, b) => sum + b.total, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Paid Expenses" size="lg">
      {loading && <LoadingSpinner />}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && (
        <div className="space-y-4">
          {paidByMe.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Receipt size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">No expenses paid yet</p>
              <p className="text-xs text-gray-400 mt-1">Expenses you pay will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paidByMe.map((billGroup) => {
                const isExpanded = expandedBill === billGroup.billId;
                return (
                  <div
                    key={billGroup.billId}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* Bill Header — title centered */}
                    <button
                      type="button"
                      onClick={() => setExpandedBill(isExpanded ? null : billGroup.billId)}
                      className="w-full flex items-center px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 transition-colors"
                    >
                      <div className="w-5 flex-shrink-0 text-gray-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      <h3 className="flex-1 text-sm font-bold text-gray-900 text-center">
                        {billGroup.billTitle}
                      </h3>
                      <span className="w-5 flex-shrink-0" />
                    </button>

                    {/* Expenses List — collapsible */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {billGroup.expenses.map((expense) => (
                          <div
                            key={expense._id}
                            className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-gray-100 rounded-lg">
                                <Receipt size={12} className="text-gray-500" />
                              </div>
                              <p className="text-sm text-gray-800">{expense.description}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              ₱{(expense.amount || 0).toFixed(2)}
                            </p>
                          </div>
                        ))}
                        {/* Sub-total row */}
                        <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtotal</p>
                          <p className="text-sm font-bold text-gray-900">₱{billGroup.total.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Grand Total — pinned at bottom */}
          {paidByMe.length > 0 && (
            <div className="bg-gradient-to-r from-[#06B6D4] to-[#0891b2] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Wallet size={18} className="text-white" />
                </div>
                <p className="text-sm font-semibold text-cyan-100">Total Paid by Me</p>
              </div>
              <p className="text-xl font-bold text-white">₱{grandTotal.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
