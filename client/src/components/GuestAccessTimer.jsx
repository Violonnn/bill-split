import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const WARN_THRESHOLD_MS = 30 * 60 * 1000;   // 30 minutes – show warning
const URGENT_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes – show urgent notification

/**
 * Formats remaining milliseconds as "Xh Ym" or "Xm Ys" for display.
 */
function formatRemaining(ms) {
  if (ms <= 0) return '0m 0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Guest access timer: shows remaining 6hr duration and a notification when time is nearing end.
 * Uses guestAccessExpiresAt from user (from /me or join response), or computes from dailyAccessStart.
 */
export default function GuestAccessTimer({ user, className = '' }) {
  const [remainingMs, setRemainingMs] = useState(null);
  const [showUrgent, setShowUrgent] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const expiresAt = user?.guestAccessExpiresAt ?? (user?.dailyAccessStart
    ? new Date(user.dailyAccessStart).getTime() + SIX_HOURS_MS
    : null);

  useEffect(() => {
    if (!user || user.userType !== 'guest' || !expiresAt) {
      setRemainingMs(null);
      setShowWarning(false);
      setShowUrgent(false);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setRemainingMs(remaining);
      setShowUrgent(remaining > 0 && remaining <= URGENT_THRESHOLD_MS);
      setShowWarning(remaining > URGENT_THRESHOLD_MS && remaining <= WARN_THRESHOLD_MS);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [user, expiresAt]);

  if (remainingMs === null || remainingMs === undefined) return null;

  const isExpired = remainingMs <= 0;

  return (
    <div className={className}>
      {/* Live duration display */}
      <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg">
        <Clock size={18} className="text-cyan-600 flex-shrink-0" />
        <span className="text-sm font-medium text-cyan-900">
          {isExpired ? 'Guest access expired' : `Guest access: ${formatRemaining(remainingMs)} remaining`}
        </span>
      </div>

      {/* Notification when time is nearing end */}
      {showUrgent && (
        <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">Access ending soon</p>
            <p>Your guest access ends in about {formatRemaining(remainingMs)}. Re-enter the invitation code to get another 6 hours, or upgrade to a full account.</p>
          </div>
        </div>
      )}
      {showWarning && !showUrgent && (
        <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Less than 30 minutes left</p>
            <p>Your guest access has about {formatRemaining(remainingMs)} remaining. Re-enter the code later to continue, or upgrade your account.</p>
          </div>
        </div>
      )}
    </div>
  );
}
