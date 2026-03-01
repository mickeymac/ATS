import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  FileText,
  Settings, 
  LogOut,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  Upload,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@nextui-org/react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Jobs', icon: Briefcase, href: '/jobs', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Applications', icon: FileText, href: '/applications', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'My Uploads', icon: Upload, href: '/my-uploads', roles: ['recruiter'] },
  { name: 'Review', icon: ClipboardCheck, href: '/review', roles: ['team_lead', 'admin'] },
  { name: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Users', icon: Users, href: '/users', roles: ['admin'] },
  { name: 'Profile', icon: UserCircle2, href: '/profile', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Settings', icon: Settings, href: '/settings', roles: ['admin', 'team_lead', 'recruiter'] },
];

export function Sidebar({ isCollapsed = false, toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRole = user?.role || 'team_lead';

  return (
    <aside 
      className={cn(
        "hidden h-screen flex-col border-r border-divider bg-background/60 py-6 backdrop-blur-md md:flex fixed left-0 top-0 z-50 transition-all duration-300",
        isCollapsed ? "w-20 px-3" : "w-64 px-4"
      )}
    >
      <div className={cn("flex items-center pb-8", isCollapsed ? "justify-center" : "px-2")}>
        <Logo size={32} showText={!isCollapsed} />
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {menuItems.filter(item => item.roles.includes(userRole)).map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all hover:bg-default-100",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-default-600 hover:text-default-900",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-default-600 group-hover:text-default-900")} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-divider pt-4 flex flex-col gap-2">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-default-600 transition-all hover:bg-default-100",
              isCollapsed && "justify-center"
            )}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!isCollapsed && "Collapse"}
          </button>
        )}
        
        <button 
          onClick={handleLogout}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-default-500 transition-all hover:bg-danger/10 hover:text-danger",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5 text-default-600 group-hover:text-danger shrink-0" />
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
