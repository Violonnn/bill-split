import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Receipt, AlertCircle, ArrowLeft } from 'lucide-react';

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
          setError(err.data?.code === 'GUEST_ACCESS_EXPIRED'
            ? 'Your 6-hour guest access has expired. Please enter the invitation code again to continue.'
            : err.message || 'Failed to load bill.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBill();
    return () => { cancelled = true; };
  }, [user, id, navigate]);

  if (!user) return null;

  const isGuestAccessExpired = error && error.includes('6-hour guest access');
  const showGuestRejoinPrompt = user.userType === 'guest' && (isGuestAccessExpired || !bill);

  return (
    <div className="min-h-screen bg-[#F0F9FA]">
      <nav className="bg-white border-b-2 border-[#06B6D4] px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#06B6D4] flex items-center gap-2">
          <Receipt size={24} /> BillSplit
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-[#06B6D4] hover:text-[#0891b2] font-medium text-sm"
          >
            <ArrowLeft size={18} /> Back
          </button>
          {user.userType === 'guest' && (
            <button
              onClick={() => navigate('/guest/upgrade')}
              className="px-3 py-1.5 bg-[#06B6D4] text-white rounded-lg font-medium hover:bg-[#0891b2] text-sm"
            >
              Upgrade Account
            </button>
          )}
        </div>
      </nav>

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="p-8 bg-white rounded-xl shadow-md border-2 border-[#06B6D4] text-center text-gray-600">
            Loading...
          </div>
        ) : showGuestRejoinPrompt ? (
          <div className="p-6 bg-white rounded-xl shadow-md border-2 border-amber-400">
            <div className="flex items-start gap-3 text-amber-800">
              <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Access Expired</h3>
                <p className="text-sm text-gray-700 mb-4">
                  {isGuestAccessExpired
                    ? 'Your 6-hour guest access has expired. Enter the invitation code again to continue viewing this bill.'
                    : 'Enter the invitation code to view this bill.'}
                </p>
                <button
                  onClick={() => navigate('/guest/join' + (id ? `?code=${id}` : ''))}
                  className="px-4 py-2 bg-[#06B6D4] text-white rounded-lg font-medium hover:bg-[#0891b2]"
                >
                  Enter Invitation Code
                </button>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200 flex items-start gap-3">
            <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Unable to load bill</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-3 text-[#06B6D4] font-semibold hover:underline"
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : bill ? (
          <div className="p-6 bg-white rounded-xl shadow-md border-2 border-[#06B6D4]">
            <h2 className="text-2xl font-bold text-[#164E63] mb-4">{bill.title}</h2>
            {bill.invitationCode && (
              <p className="text-sm text-gray-600 mb-4">
                Invitation code: <code className="px-2 py-0.5 bg-gray-100 rounded font-mono">{bill.invitationCode}</code>
              </p>
            )}
            <p className="text-gray-600 text-sm">
              Bill details and splits will be added in a future update. You have access to this bill.
            </p>
            {user.userType === 'guest' && (
              <p className="mt-4 text-amber-700 text-xs">
                Guest access: 6 hours per day. You can re-enter the code to extend access.
              </p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
