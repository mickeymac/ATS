import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
  'dashboard': 'Dashboard',
  'jobs': 'Jobs',
  'applications': 'Applications',
  'my-uploads': 'My Uploads',
  'review': 'Review',
  'users': 'Users',
  'analytics': 'Analytics',
  'profile': 'Profile',
  'settings': 'Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-default-500 mb-4">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-1 hover:text-primary transition-colors"
      >
        <Home size={14} />
        <span>Home</span>
      </Link>
      
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <span key={segment} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-default-300" />
            {isLast ? (
              <span className="text-default-900 font-medium">{label}</span>
            ) : (
              <Link 
                to={routeTo} 
                className="hover:text-primary transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
