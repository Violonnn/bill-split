import { useNavigate } from 'react-router-dom';
import { Crown, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

/**
 * Shown when a Standard user hits a limit (e.g. 5 bills/month, 3 persons per bill).
 * Displays the message and an "Upgrade to Premium" button.
 */
export default function UpgradePrompt({ message, className = '' }) {
  const navigate = useNavigate();

  return (
    <div
      className={`p-4 rounded-lg border-2 border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-center gap-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
          <AlertTriangle size={24} className="text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-amber-900">Standard account limit</p>
          <p className="text-sm text-amber-800 mt-1">{message}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        onClick={() => navigate('/upgrade')}
        className="flex items-center gap-2 flex-shrink-0"
      >
        <Crown size={18} />
        Upgrade to Premium
      </Button>
    </div>
  );
}
