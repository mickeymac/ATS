import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { Briefcase, Send, CheckCircle, Clock, ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const SkeletonLoader = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />;

const CandidateDashboard = () => {
  const [stats, setStats] = useState({ totalApplied: 0, shortlisted: 0, pending: 0, activeJobs: 0 });
  const [recentApps, setRecentApps] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const fetchCandidateData = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, jobsRes] = await Promise.all([
        api.get('/applications/my-applications'),
        api.get('/jobs/')
      ]);

      const apps = appsRes.data;
      const jobs = jobsRes.data;

      const pendingStatuses = new Set(['Applied', 'Under Review']);

      setStats({
        totalApplied: apps.length,
        shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
        pending: apps.filter(a => pendingStatuses.has(a.status)).length,
        activeJobs: jobs.length
      });

      setRecentApps(apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).slice(0, 3));
      setRecommendedJobs(jobs.slice(0, 3)); // Simple recommendation for now

    } catch (error) {
      addToast("Failed to load dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCandidateData();
  }, [fetchCandidateData]);

  return (
    <AppShell>
      <PageHeader
        title="Candidate Dashboard"
        description="Track your applications and discover new opportunities."
        actions={
          <Link
            to="/jobs"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Search size={16} />
            Browse Jobs
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Applications Sent" value={loading ? '...' : stats.totalApplied} icon={Send} />
          <StatCard title="Shortlisted" value={loading ? '...' : stats.shortlisted} icon={CheckCircle} color="green" />
          <StatCard title="Pending Review" value={loading ? '...' : stats.pending} icon={Clock} color="amber" />
          <StatCard title="Available Jobs" value={loading ? '...' : stats.activeJobs} icon={Briefcase} color="blue" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Applications */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Your Applications</h3>
              <Link to="/applications" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                View All
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="p-4"><SkeletonLoader className="h-12 w-full" /></div>)
              ) : recentApps.length > 0 ? (
                recentApps.map((app) => (
                  <div key={app._id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{app.job_title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Applied on {new Date(app.applied_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))
              ) : (
                <div className="flex h-40 flex-col items-center justify-center space-y-2 text-slate-400">
                  <p>You haven't applied to any jobs yet.</p>
                  <Link to="/jobs" className="text-sm font-medium text-slate-900 underline dark:text-slate-100">Find your first job</Link>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Jobs */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recommended for You</h3>
              <Link to="/jobs" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                Browse All
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="p-4"><SkeletonLoader className="h-12 w-full" /></div>)
              ) : recommendedJobs.length > 0 ? (
                recommendedJobs.map((job) => (
                  <div key={job._id} className="group flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{job.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{job.location} • {job.type}</p>
                    </div>
                    <Link
                      to="/jobs"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 opacity-0 transition-all group-hover:opacity-100 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="flex h-40 items-center justify-center text-slate-400">
                  No job recommendations yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default CandidateDashboard;
