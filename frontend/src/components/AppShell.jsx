import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '@nextui-org/react';

const AppShell = ({ children }) => {
  const { user, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? "md:pl-20" : "md:pl-64"}`}>
        <Navbar />
        <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export { AppShell };
export default AppShell;
