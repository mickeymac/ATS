import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import HRDashboard from './HRDashboard';
import { AppShell } from '../components/AppShell';
import { useToast } from '../context/ToastContext';
import { 
  Card, 
  CardBody,
  Button,
  Spinner
} from '@nextui-org/react';
import { Briefcase, Users, TrendingUp, ShieldAlert } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, color = 'primary', loading = false }) => {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
  };
  
  return (
    <Card className="p-6 border border-divider">
      <CardBody className="p-0">
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp size={14} />
            +12%
          </span>
        </div>
        <div className="mt-4">
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <p className="text-2xl font-bold text-default-900">{value}</p>
          )}
          <p className="text-sm text-default-500">{title}</p>
        </div>
      </CardBody>
    </Card>
  );
};

const Analytics = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ users: 0, jobs: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, jobsRes] = await Promise.all([api.get('/users/'), api.get('/jobs/')]);
      setStats({ users: usersRes.data.length, jobs: jobsRes.data.length });
    } catch {
      addToast('Failed to load analytics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [fetchStats, user?.role]);

  if (user?.role === 'team_lead' || user?.role === 'recruiter') return <HRDashboard />;

  if (user?.role !== 'admin') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 mb-4">
            <ShieldAlert className="h-8 w-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-default-900">Analytics Unavailable</h2>
          <p className="text-sm text-default-500 mt-2 mb-6">Analytics are available to HR and Admin users only.</p>
          <Button as={Link} to="/dashboard" color="primary">
            Go to Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-default-900">Admin Analytics</h1>
          <p className="text-default-600">High-level usage stats across the platform.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <StatsCard 
            title="Total Users" 
            value={stats.users} 
            icon={Users} 
            color="primary" 
            loading={loading}
          />
          <StatsCard 
            title="Total Jobs" 
            value={stats.jobs} 
            icon={Briefcase} 
            color="success"
            loading={loading}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default Analytics;
