import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';

export default function Alert({
  type = 'info',
  title,
  message,
  dismissible = true,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const types = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      iconColor: 'text-green-600',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      iconColor: 'text-red-600',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      iconColor: 'text-yellow-600',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      iconColor: 'text-blue-600',
    },
  };

  const config = types[type];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border ${config.border} ${config.text} rounded-lg p-4 flex items-start gap-3 ${className}`}
    >
      <Icon className={`${config.iconColor} flex-shrink-0 mt-0.5`} size={20} />
      <div className="flex-1">
        {title && <h3 className="font-semibold mb-1">{title}</h3>}
        {message && <p className="text-sm">{message}</p>}
      </div>
      {dismissible && (
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0"
        >
          <X size={20} className="opacity-50 hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}
