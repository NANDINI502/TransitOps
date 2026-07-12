import Sidebar from '@/components/sidebar/Sidebar';
import { AuthWrapper } from '@/components/auth/AuthWrapper';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  TransitOps Dashboard
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                  Welcome, Admin
                </span>
                {/* User avatar and dropdown would go here */}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <AuthWrapper>{children}</AuthWrapper>
        </main>
      </div>
    </div>
  );
}
