import { useAuth } from '../context/AuthContext';
import HRDashboard from './HRDashboard';
import CandidateDashboard from './CandidateDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  } else if (user.role === 'hr') {
    return <HRDashboard />;
  } else {
    return <CandidateDashboard />;
  }
};

export default Dashboard;
