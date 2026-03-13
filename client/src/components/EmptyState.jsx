import { AlertCircle } from 'lucide-react';

export default function EmptyState({ icon: Icon = AlertCircle, title, message, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 p-3 bg-blue-100 rounded-full">
        <Icon size={32} className="text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center mb-6 max-w-md">{message}</p>
      {children}
    </div>
  );
}
