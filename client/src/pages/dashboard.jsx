import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Receipt, Copy, Check, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      const { bills: list } = await apiRequest('/api/bills');
      setBills(list || []);
    } catch (err) {
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
      setCreateError('Bill title is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const { bill, invitationCode } = await apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setBills((prev) => [{ ...bill, invitationCode }, ...prev]);
      setNewTitle('');
    } catch (err) {
      setCreateError(err.message || 'Failed to create bill');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinBill = async (e) => {
    e.preventDefault();
    if (!joinCode?.trim()) {
      setJoinError('Invitation code is required');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const { bill } = await apiRequest(`/api/bills/${encodeURIComponent(joinCode.trim().toUpperCase())}/join`, {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      setBills((prev) => [bill, ...prev].filter((b, i, arr) => arr.findIndex((x) => x._id === b._id) === i));
      setJoinCode('');
    } catch (err) {
      setJoinError(err.message || 'Failed to join bill');
    } finally {
      setJoining(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  if (!user || user.userType === 'guest') return null;

  return (
    <div className="min-h-screen w-full bg-[#F0F9FA]">
      <nav className="w-full bg-white border-b-2 border-[#06B6D4] px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#06B6D4]">BillSplit</h1>
        <button onClick={() => { logout(); navigate('/'); }} className="text-[#06B6D4] hover:text-[#0891b2] font-medium">
          Sign Out
        </button>
      </nav>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#164E63] mb-6">My Bills</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <form onSubmit={handleCreateBill} className="p-4 bg-white rounded-xl shadow-md border-2 border-[#06B6D4]">
            <h3 className="font-semibold text-[#164E63] mb-2">Create New Bill</h3>
            {createError && (
              <div className="flex items-center gap-1 mb-2 text-red-600 text-sm">
                <AlertCircle size={14} /> {createError}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Bill title"
                className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-[#06B6D4] text-white rounded-lg font-medium hover:bg-[#0891b2] disabled:opacity-70 shrink-0"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Share the invitation code with others to add them (max 3 per bill for Standard).</p>
          </form>

          <form onSubmit={handleJoinBill} className="p-4 bg-white rounded-xl shadow-md border-2 border-[#67E8F9]">
            <h3 className="font-semibold text-[#164E63] mb-2">Join Bill with Invitation Code</h3>
            {joinError && (
              <div className="flex items-center gap-1 mb-2 text-red-600 text-sm">
                <AlertCircle size={14} /> {joinError}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="INVITATION CODE"
                className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] uppercase font-mono"
              />
              <button
                type="submit"
                disabled={joining}
                className="px-4 py-2 bg-[#0891b2] text-white rounded-lg font-medium hover:bg-[#06B6D4] disabled:opacity-70 shrink-0"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : bills.length === 0 ? (
          <div className="p-6 bg-white rounded-xl shadow border border-gray-200 text-center text-gray-600">
            No bills yet. Create one above.
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => (
              <div
                key={bill._id}
                onClick={() => navigate(`/bill/${bill._id}`)}
                className="p-4 bg-white rounded-xl shadow-md border-2 border-[#06B6D4] flex items-center justify-between flex-wrap gap-2 cursor-pointer hover:border-[#0891b2] transition"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="text-[#06B6D4]" size={24} />
                  <span className="font-medium text-[#164E63]">{bill.title}</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {bill.invitationCode && (
                    <>
                      <code className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm font-mono">{bill.invitationCode}</code>
                      <button
                        type="button"
                        onClick={() => copyCode(bill.invitationCode)}
                        className="p-2 rounded hover:bg-gray-100 text-[#06B6D4]"
                        title="Copy code"
                      >
                        {copiedCode === bill.invitationCode ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
