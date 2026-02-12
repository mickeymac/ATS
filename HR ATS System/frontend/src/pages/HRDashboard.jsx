import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Briefcase, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SkeletonLoader = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />;

const HRDashboard = () => {
  const [stats, setStats] = useState({ totalJobs: 0, totalApps: 0, shortlisted: 0, pending: 0 });
  const [recentApps, setRecentApps] = useState([]);
  const [chartData, setChartData] = useState([]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get('/jobs/'),
        api.get('/applications/')
      ]);

      const jobs = jobsRes.data;
      const apps = appsRes.data;

      const pendingStatuses = new Set(['Applied', 'Under Review']);

      setStats({
        totalJobs: jobs.length,
        totalApps: apps.length,
        shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
        pending: apps.filter(a => pendingStatuses.has(a.status)).length
      });

      setRecentApps(apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).slice(0, 5));

      // Simple chart data: Apps per job
      const jobMap = {};
      apps.forEach(app => {
        jobMap[app.job_title] = (jobMap[app.job_title] || 0) + 1;
      });
      setChartData(Object.entries(jobMap).map(([name, value]) => ({ name, value })).slice(0, 5));

    } catch (error) {
      addToast("Failed to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <AppShell>
      <PageHeader
        title="HR Overview"
        description="Monitor your hiring pipeline and recruitment activity."
        actions={
          <Link
            to="/jobs"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Manage Jobs
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active Jobs" value={loading ? '...' : stats.totalJobs} icon={Briefcase} />
          <StatCard title="Total Applications" value={loading ? '...' : stats.totalApps} icon={Users} />
          <StatCard title="Shortlisted" value={loading ? '...' : stats.shortlisted} icon={CheckCircle} />
          <StatCard title="Pending Review" value={loading ? '...' : stats.pending} icon={Clock} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <ChartCard title="Applications by Job Role">
              {loading ? (
                <SkeletonLoader className="h-[300px] w-full" />
              ) : chartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-slate-400">
                  No application data available yet.
                </div>
              )}
            </ChartCard>
          </div>

          {/* Recent Applications */}
          <div className="lg:col-span-1">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Applications</h3>
                <Link to="/applications" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                  View All
                </Link>
              </div>
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="p-4"><SkeletonLoader className="h-10 w-full" /></div>)
                ) : recentApps.length > 0 ? (
                  recentApps.map((app) => (
                    <div key={app._id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{app.candidate_name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{app.job_title}</p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                  ))
                ) : (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    No recent applications.
                  </div>
                )}
              </div>
              <div className="p-4">
                <Link
                  to="/applications"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Go to Applications
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default HRDashboard;
