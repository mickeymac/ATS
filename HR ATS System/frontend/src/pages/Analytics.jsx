import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import HRDashboard from './HRDashboard';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { useToast } from '../context/ToastContext';
import { BriefcaseBusiness, Users } from 'lucide-react';

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

  if (user?.role === 'hr') return <HRDashboard />;

  if (user?.role !== 'admin') {
    return (
      <AppShell>
        <PageHeader
          title="Analytics"
          description="Analytics are available to HR and Admin users."
          actions={
            <Link
              to="/dashboard"
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Go to dashboard
            </Link>
          }
        />
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-text-secondary shadow-sm">
          Sign in as HR or Admin to view analytics.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Admin Analytics" description="High-level usage stats across the platform." />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatCard title="Total Users" value={loading ? '—' : stats.users} icon={Users} />
        <StatCard title="Total Jobs" value={loading ? '—' : stats.jobs} icon={BriefcaseBusiness} />
      </div>
    </AppShell>
  );
};

export default Analytics;
