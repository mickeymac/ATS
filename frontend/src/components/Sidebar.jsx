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
  ClipboardCheck,
  Shield,
  MessageSquare
} from 'lucide-react';
import { cn } from '@nextui-org/react';
import { useAuth } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { Logo } from './Logo';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Chat', icon: MessageSquare, href: '/chat', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Jobs', icon: Briefcase, href: '/jobs', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Applications', icon: FileText, href: '/applications', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'My Uploads', icon: Upload, href: '/my-uploads', roles: ['recruiter'] },
  { name: 'Review', icon: ClipboardCheck, href: '/review', roles: ['team_lead', 'admin'] },
  { name: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['admin', 'team_lead', 'recruiter'], permission: 'can_export_data' },
  { name: 'Users', icon: Users, href: '/users', roles: ['admin'], permission: 'can_manage_users' },
  { name: 'Permissions', icon: Shield, href: '/permissions', roles: ['admin'], permission: 'can_manage_permissions' },
  { name: 'Profile', icon: UserCircle2, href: '/profile', roles: ['admin', 'team_lead', 'recruiter'] },
  { name: 'Settings', icon: Settings, href: '/settings', roles: ['admin', 'team_lead', 'recruiter'] },
];

export function Sidebar({ isCollapsed = false, toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const { unreadTotal } = useChatContext();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRole = user?.role || 'team_lead';

  // Filter menu items by role and permission
  const visibleMenuItems = menuItems.filter(item => {
    // First check role
    if (!item.roles.includes(userRole)) return false;
    // Then check permission if required
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <aside 
      className={cn(
        "hidden h-screen flex-col border-r border-divider/70 bg-content1/75 py-5 backdrop-blur-xl md:flex fixed left-0 top-0 z-50 transition-all duration-300",
        isCollapsed ? "w-20 px-3" : "w-64 px-4"
      )}
    >
      <div className={cn("flex items-center pb-6", isCollapsed ? "justify-center" : "px-2")}>
        <Logo size={32} showText={!isCollapsed} />
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-content2/80",
                isActive 
                  ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20" 
                  : "text-default-700 dark:text-default-500 hover:text-foreground dark:hover:text-foreground",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-default-600 dark:text-default-400 group-hover:text-foreground dark:group-hover:text-foreground")} />
                {item.name === 'Chat' && unreadTotal > 0 && isCollapsed && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white shadow-sm ring-2 ring-content1">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>{item.name}</span>
                  {item.name === 'Chat' && unreadTotal > 0 && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white shadow-sm">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-divider/70 pt-4 flex flex-col gap-2">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className={cn(
              "group ring-focus flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-default-700 dark:text-default-500 transition-all hover:bg-content2/80 hover:text-foreground",
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
            "group ring-focus flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-default-700 dark:text-default-500 transition-all hover:bg-danger/10 hover:text-danger",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5 text-default-600 dark:text-default-500 group-hover:text-danger shrink-0" />
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
