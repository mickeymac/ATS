import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { useToast } from '../context/ToastContext';
import { Users, Briefcase, FileText, ShieldAlert, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const SkeletonLoader = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />;

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, jobs: 0, applications: 0, admins: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, jobsRes, appsRes] = await Promise.all([
        api.get('/users/'),
        api.get('/jobs/'),
        api.get('/applications/')
      ]);

      const users = usersRes.data;
      const jobs = jobsRes.data;
      const apps = appsRes.data;

      setStats({
        users: users.length,
        jobs: jobs.length,
        applications: apps.length,
        admins: users.filter(u => u.role === 'admin').length
      });

      setRecentUsers(users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5));

      // Mock growth data for the chart
      setChartData([
        { name: 'Jan', users: 12, apps: 45 },
        { name: 'Feb', users: 19, apps: 52 },
        { name: 'Mar', users: 15, apps: 48 },
        { name: 'Apr', users: 22, apps: 61 },
        { name: 'May', users: 30, apps: 55 },
        { name: 'Jun', users: 25, apps: 67 },
      ]);

    } catch (error) {
      addToast("Failed to load admin dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return (
    <AppShell>
      <PageHeader
        title="Admin Overview"
        description="Global system statistics and user management."
        actions={
          <Link
            to="/users"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <UserPlus size={16} />
            Manage Users
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={loading ? '...' : stats.users} icon={Users} />
          <StatCard title="Total Jobs" value={loading ? '...' : stats.jobs} icon={Briefcase} color="blue" />
          <StatCard title="Applications" value={loading ? '...' : stats.applications} icon={FileText} color="indigo" />
          <StatCard title="System Admins" value={loading ? '...' : stats.admins} icon={ShieldAlert} color="red" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <ChartCard title="System Growth (Users & Applications)">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="#0f172a" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                    <Area type="monotone" dataKey="apps" stroke="#6366f1" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Recent Users */}
          <div className="lg:col-span-1">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recently Joined</h3>
                <Link to="/users" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                  View All
                </Link>
              </div>
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => <div key={i} className="p-4"><SkeletonLoader className="h-10 w-full" /></div>)
                ) : recentUsers.length > 0 ? (
                  recentUsers.map((u) => (
                    <div key={u._id} className="flex items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.email}</p>
                        <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{u.role}</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                  ))
                ) : (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    No recent users found.
                  </div>
                )}
              </div>
              <div className="p-4">
                <Link
                  to="/users"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Manage All Users
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

export default AdminDashboard;
