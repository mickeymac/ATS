import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BriefcaseBusiness, FileText, BarChart3, Users, Settings, UserCircle2, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const navItemBase =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100';

// eslint-disable-next-line no-unused-vars
const SidebarLink = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `${navItemBase} ${isActive ? 'bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900' : ''}`
    }
  >
    <Icon size={16} />
    <span>{label}</span>
  </NavLink>
);

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <aside className="hidden w-64 border-r border-slate-200 bg-white/80 px-4 py-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">Tecnoprism</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI Hiring Platform</p>
          </div>
        </div>
        <nav className="flex-1 space-y-6 text-sm">
          <div className="space-y-1">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Overview
            </p>
            <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />
            <SidebarLink to="/jobs" icon={BriefcaseBusiness} label="Jobs" />
            <SidebarLink to="/applications" icon={FileText} label="Applications" />
            {role !== 'candidate' && <SidebarLink to="/analytics" icon={BarChart3} label="Analytics" />}
          </div>
          {role === 'admin' && (
            <div className="space-y-1">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Admin
              </p>
              <SidebarLink to="/users" icon={Users} label="Users" />
            </div>
          )}
          <div className="space-y-1">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Account
            </p>
            <SidebarLink to="/profile" icon={UserCircle2} label="Profile" />
            <SidebarLink to="/settings" icon={Settings} label="Settings" />
          </div>
        </nav>
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>Theme</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white/70 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900 md:hidden">
              TP
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100 md:hidden">Tecnoprism</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 md:inline-flex"
            >
              {theme === 'dark' ? 'Dark' : 'Light'} mode
            </button>
            {user && (
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-xs md:block">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{user.email}</p>
                  <p className="capitalize text-slate-500 dark:text-slate-400">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 bg-slate-50/60 px-4 pb-6 pt-4 dark:bg-slate-950">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto flex max-w-6xl flex-col gap-6"
          >
            {children || <Outlet />}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export { AppShell };
export default AppShell;
