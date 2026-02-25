import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Spinner } from '@nextui-org/react';
import HRDashboard from './HRDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  // Only admin and hr roles are supported
  if (user.role === 'admin') {
    return <AdminDashboard />;
  } else if (user.role === 'hr') {
    return <HRDashboard />;
  } else {
    // Redirect any other role (like candidate) to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }
};

export default Dashboard;
