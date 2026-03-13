import Sidebar from './Sidebar';

export default function MainLayout({ children, title }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:ml-64 w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 md:px-8">
            {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
