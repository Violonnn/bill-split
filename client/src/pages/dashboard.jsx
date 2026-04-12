import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MainLayout from '../components/MainLayout';
import { Button } from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import UpgradePrompt from '../components/UpgradePrompt';
import {
  Plus, Receipt, Wallet, Users, ArrowRight,
  TrendingUp, TrendingDown, Scale, ClipboardList,
  Copy, Check, ChevronRight, CircleDollarSign,
  Handshake, Clock, PieChart, BarChart3, AlertCircle,
} from 'lucide-react';

/* ── client-side split computation (mirrors server logic) ── */
function computeSplit(members, expenses) {
  if (!members?.length || !expenses?.length) return { balances: [], settlements: [] };
  const ids = members.map(m => String(m._id));
  const nameMap = {};
  members.forEach(m => { nameMap[String(m._id)] = m.name || m.email || String(m._id); });
  const paid = {};
  const owed = {};
  ids.forEach(id => { paid[id] = 0; owed[id] = 0; });

  expenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    if (amt <= 0) return;
    const payer = String(exp.paidBy?._id || exp.paidBy || '');
    if (!ids.includes(payer)) return;
    const among = Array.isArray(exp.splitAmong) && exp.splitAmong.length
      ? exp.splitAmong.map(String).filter(id => ids.includes(id))
      : [...ids];
    if (!among.length) return;
    paid[payer] += amt;
    const share = Math.round((amt * 100) / among.length) / 100;
    let rem = Math.round(amt * 100) - Math.round(share * 100 * among.length);
    rem /= 100;
    among.forEach((id, i) => { owed[id] += share + (i === 0 ? rem : 0); });
  });

  const balances = ids.map(id => ({
    userId: id,
    name: nameMap[id],
    totalPaid: Math.round((paid[id] || 0) * 100) / 100,
    totalOwed: Math.round((owed[id] || 0) * 100) / 100,
    balance: Math.round(((paid[id] || 0) - (owed[id] || 0)) * 100) / 100,
  }));

  const debtors = balances.filter(b => b.balance < -0.005).map(b => ({ ...b })).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0.005).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance);
  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i], c = creditors[j];
    const a = Math.min(Math.abs(d.balance), c.balance);
    if (a < 0.01) { if (Math.abs(d.balance) < 0.01) i++; if (c.balance < 0.01) j++; continue; }
    settlements.push({ from: d.userId, fromName: d.name, to: c.userId, toName: c.name, amount: Math.round(a * 100) / 100 });
    d.balance += a; c.balance -= a;
    if (Math.abs(d.balance) < 0.01) i++;
    if (c.balance < 0.01) j++;
  }
  return { balances, settlements };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
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
    if (authLoading) return;
    if (!user || user.userType === 'guest') { navigate('/'); return; }
    fetchBills();
  }, [authLoading, user, navigate, fetchBills]);

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!newTitle?.trim()) { setCreateError('Bill name is required'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const { bill } = await apiRequest('/api/bills', { method: 'POST', body: JSON.stringify({ title: newTitle.trim() }) });
      setBills(prev => [bill, ...prev]);
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

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.userType === 'guest') return null;

  /* ── Derived data ── */
  const userId = user._id?.toString?.() || user._id;
  const activeBills = bills.filter(b => !b.archived);

  // Compute splits for every bill
  const billSplits = activeBills.map(bill => {
    const split = computeSplit(bill.members || [], bill.expenses || []);
    const myBalance = split.balances.find(b => b.userId === userId);
    return { bill, split, myBalance };
  });

  const totalExpenses = activeBills.reduce((s, b) => s + (b.expenses || []).reduce((s2, e) => s2 + (e.amount || 0), 0), 0);
  const totalExpenseCount = activeBills.reduce((s, b) => s + (b.expenses?.length || 0), 0);

  const youOwe = billSplits.reduce((s, { myBalance }) => s + (myBalance && myBalance.balance < 0 ? Math.abs(myBalance.balance) : 0), 0);
  const youAreOwed = billSplits.reduce((s, { myBalance }) => s + (myBalance && myBalance.balance > 0 ? myBalance.balance : 0), 0);
  const netBalance = youAreOwed - youOwe;

  // All pending settlements involving the current user
  const pendingSettlements = billSplits.flatMap(({ bill, split }) =>
    split.settlements
      .filter(s => s.from === userId || s.to === userId)
      .map(s => ({ ...s, billTitle: bill.title, billId: bill._id }))
  );

  // Recent activity: latest expenses across all bills, sorted newest first
  const recentActivity = activeBills
    .flatMap(bill => (bill.expenses || []).map(e => ({ ...e, billTitle: bill.title, billId: bill._id })))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 8);

  // Insights
  const topBill = [...billSplits].sort((a, b) => {
    const aTotal = (a.bill.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    const bTotal = (b.bill.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    return bTotal - aTotal;
  })[0];
  const topBillTotal = topBill ? (topBill.bill.expenses || []).reduce((s, e) => s + (e.amount || 0), 0) : 0;

  const avgPerBill = activeBills.length ? totalExpenses / activeBills.length : 0;
  const uniqueMembers = new Set(activeBills.flatMap(b => (b.members || []).map(m => String(m._id)))).size;

  return (
    <MainLayout title="Dashboard">
      {error && <Alert type="error" title="Error" message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-8">

          {/* ═══ Summary Cards ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* You Owe */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-100 rounded-xl">
                  <TrendingDown size={16} className="text-red-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">You Owe</p>
              </div>
              <p className="text-2xl font-bold text-red-600">₱{youOwe.toFixed(2)}</p>
            </div>

            {/* You're Owed */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 rounded-xl">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">You're Owed</p>
              </div>
              <p className="text-2xl font-bold text-green-600">₱{youAreOwed.toFixed(2)}</p>
            </div>

            {/* Net Balance */}
            <div className={`rounded-2xl border p-4 hover:shadow-lg transition-shadow ${
              netBalance > 0 ? 'bg-green-50 border-green-200' : netBalance < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-xl ${netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Scale size={16} className={netBalance >= 0 ? 'text-green-600' : 'text-red-600'} />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Net Balance</p>
              </div>
              <p className={`text-2xl font-bold ${netBalance > 0 ? 'text-green-700' : netBalance < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {netBalance > 0 ? '+' : ''}{netBalance < 0 ? '-' : ''}₱{Math.abs(netBalance).toFixed(2)}
              </p>
            </div>

            {/* Total Bills */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <ClipboardList size={16} className="text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bills</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{activeBills.length}</p>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <CircleDollarSign size={16} className="text-purple-600" />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Spent</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">₱{totalExpenses.toFixed(2)}</p>
            </div>
          </div>

          {/* ═══ Quick Actions ═══ */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#06B6D4] text-white rounded-xl font-medium text-sm hover:bg-[#0891b2] transition-colors shadow-sm"
            >
              <Plus size={16} />
              New Bill
            </button>
            <button
              onClick={() => navigate('/bills')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Receipt size={16} />
              View All Bills
            </button>
            <button
              onClick={() => navigate('/archive')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ClipboardList size={16} />
              Archive
            </button>
          </div>

          {activeBills.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4">
                <Receipt size={28} className="text-cyan-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Bills Yet</h3>
              <p className="text-sm text-gray-500 mb-5">Create your first bill to start splitting expenses with friends!</p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 mx-auto">
                <Plus size={16} /> Create Your First Bill
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ═══ Left Column (2/3) ═══ */}
              <div className="lg:col-span-2 space-y-6">

                {/* ── Active Bills ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-gray-900">Active Bills</h2>
                    <button
                      onClick={() => navigate('/bills')}
                      className="text-xs font-medium text-[#06B6D4] hover:text-[#0891b2] flex items-center gap-0.5"
                    >
                      View all <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {billSplits.slice(0, 4).map(({ bill, split, myBalance }) => {
                      const billTotal = (bill.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
                      const bal = myBalance?.balance ?? 0;
                      return (
                        <div
                          key={bill._id}
                          onClick={() => navigate(`/bills/${bill._id}`)}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-cyan-200 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-[#06B6D4] transition-colors">
                                {bill.title}
                              </h3>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {bill.members?.length || 0} members · {bill.expenses?.length || 0} expenses
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-[#06B6D4] transition-colors flex-shrink-0 mt-0.5" />
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                              <p className="text-lg font-bold text-gray-900">₱{billTotal.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Your Balance</p>
                              <p className={`text-sm font-bold ${
                                bal > 0 ? 'text-green-600' : bal < 0 ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                {bal > 0 ? `+₱${bal.toFixed(2)}` : bal < 0 ? `-₱${Math.abs(bal).toFixed(2)}` : '₱0.00'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Pending Settlements ── */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3">Pending Settlements</h2>
                  {pendingSettlements.length === 0 ? (
                    <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
                      <Check size={22} className="mx-auto text-green-600 mb-1" />
                      <p className="text-sm font-medium text-green-700">All settled up!</p>
                      <p className="text-xs text-green-500 mt-0.5">No pending payments across your bills.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      {pendingSettlements.map((s, idx) => {
                        const isDebtor = s.from === userId;
                        return (
                          <div
                            key={`${s.from}-${s.to}-${idx}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/bills/${s.billId}`)}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isDebtor ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {isDebtor ? s.toName?.charAt(0)?.toUpperCase() : s.fromName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {isDebtor ? (
                                  <>You pay <span className="font-semibold">{s.toName}</span></>
                                ) : (
                                  <><span className="font-semibold">{s.fromName}</span> pays you</>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">{s.billTitle}</p>
                            </div>
                            <p className={`text-sm font-bold flex-shrink-0 ${isDebtor ? 'text-red-600' : 'text-green-600'}`}>
                              {isDebtor ? '-' : '+'}₱{s.amount.toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Recent Activity ── */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3">Recent Activity</h2>
                  {recentActivity.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <Clock size={22} className="mx-auto text-gray-300 mb-1" />
                      <p className="text-sm text-gray-500">No recent activity</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      {recentActivity.map((exp, idx) => {
                        const payer = exp.paidByName || 'Someone';
                        const date = exp.createdAt
                          ? new Date(exp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '';
                        return (
                          <div
                            key={exp._id || idx}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                              <Receipt size={14} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{exp.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-gray-400 truncate">{exp.billTitle}</p>
                                {date && <span className="text-[10px] text-gray-300">·</span>}
                                {date && <span className="text-[10px] text-gray-400">{date}</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">₱{(exp.amount || 0).toFixed(2)}</p>
                              <p className="text-[10px] text-gray-400">{payer}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ Right Column (1/3) — Insights ═══ */}
              <div className="space-y-5">

                {/* Spending Overview */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart size={16} className="text-cyan-600" />
                    <h3 className="text-sm font-bold text-gray-900">Spending Breakdown</h3>
                  </div>
                  {(() => {
                    const colors = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
                    const data = activeBills.map((b, i) => ({
                      title: b.title,
                      total: (b.expenses || []).reduce((s, e) => s + (e.amount || 0), 0),
                      color: colors[i % colors.length],
                    })).filter(d => d.total > 0);
                    const gt = data.reduce((s, d) => s + d.total, 0) || 1;

                    let cum = 0;
                    const segs = data.map(d => {
                      const pct = (d.total / gt) * 100;
                      const offset = 25 - cum;
                      cum += pct;
                      return { ...d, pct, dashArray: `${pct} ${100 - pct}`, offset };
                    });

                    return (
                      <div className="space-y-4">
                        {data.length > 0 && (
                          <div className="flex justify-center">
                            <svg viewBox="0 0 42 42" className="w-32 h-32">
                              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e5e7eb" strokeWidth="3.5" />
                              {segs.map((seg, i) => (
                                <circle key={i} cx="21" cy="21" r="15.915" fill="transparent" stroke={seg.color} strokeWidth="3.5"
                                  strokeDasharray={seg.dashArray} strokeDashoffset={seg.offset} strokeLinecap="round" />
                              ))}
                              <text x="21" y="20" textAnchor="middle" dominantBaseline="central" className="text-[4px] font-bold fill-gray-900">
                                ₱{gt.toFixed(0)}
                              </text>
                              <text x="21" y="24.5" textAnchor="middle" dominantBaseline="central" className="text-[2.5px] fill-gray-400">
                                total
                              </text>
                            </svg>
                          </div>
                        )}
                        <div className="space-y-2">
                          {data.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                              <p className="text-xs text-gray-600 truncate flex-1">{d.title}</p>
                              <p className="text-xs font-semibold text-gray-900">₱{d.total.toFixed(0)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-purple-600" />
                    <h3 className="text-sm font-bold text-gray-900">Quick Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Total Expenses</p>
                      <p className="text-sm font-bold text-gray-900">{totalExpenseCount}</p>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Avg per Bill</p>
                      <p className="text-sm font-bold text-gray-900">₱{avgPerBill.toFixed(2)}</p>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">People Involved</p>
                      <p className="text-sm font-bold text-gray-900">{uniqueMembers}</p>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Pending Payments</p>
                      <p className="text-sm font-bold text-gray-900">{pendingSettlements.length}</p>
                    </div>
                    {topBill && (
                      <>
                        <div className="h-px bg-gray-100" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Biggest Bill</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{topBill.bill.title}</p>
                          <p className="text-xs text-cyan-600 font-semibold">₱{topBillTotal.toFixed(2)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Invite shortcut */}
                {activeBills.length > 0 && activeBills[0].invitationCode && (
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200 p-5">
                    <p className="text-xs font-semibold text-cyan-700 mb-2">Latest Bill Invite Code</p>
                    <p className="text-[10px] text-gray-500 mb-2 truncate">{activeBills[0].title}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm font-bold text-gray-900 tracking-widest truncate">
                        {activeBills[0].invitationCode}
                      </code>
                      <button
                        onClick={() => copyCode(activeBills[0].invitationCode)}
                        className="p-2 rounded-lg bg-[#06B6D4] text-white hover:bg-[#0891b2] transition-colors flex-shrink-0"
                      >
                        {copiedCode === activeBills[0].invitationCode ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Create Bill Modal ═══ */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Bill"
        onClose={() => { setShowCreateModal(false); setNewTitle(''); setCreateError(''); setUpgradeMessage(''); }}
        size="md"
      >
        <form onSubmit={handleCreateBill} className="space-y-4">
          {upgradeMessage && <UpgradePrompt message={upgradeMessage} className="mb-4" />}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Bill Name</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => { setNewTitle(e.target.value); setCreateError(''); }}
              placeholder="e.g., Weekend Trip"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06B6D4] ${
                createError ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={creating}
            />
            {createError && (
              <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                <AlertCircle size={12} /> {createError}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setNewTitle(''); setCreateError(''); }}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Bill'}</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
