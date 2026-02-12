import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { FileText, Search, User, Briefcase, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const SkeletonLoader = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />;

const EmptyState = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
      <FileText className="h-6 w-6 text-slate-400" />
    </div>
    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

const Applications = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '/applications/';
      if (user?.role === 'candidate') {
        endpoint = '/applications/my-applications';
      }
      const response = await api.get(endpoint);
      setApplications(response.data);
    } catch (error) {
      addToast('Failed to fetch applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, user?.role]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/applications/${id}/status`, { status: newStatus });
      setApplications(applications.map(app => 
        app._id === id ? { ...app, status: newStatus } : app
      ));
      addToast(`Application marked as ${newStatus}.`, 'success');
    } catch (error) {
      addToast('Failed to update status.', 'error');
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const isHR = user?.role === 'hr' || user?.role === 'admin';

  return (
    <AppShell>
      <PageHeader
        title="Applications"
        description={isHR ? "Review and manage candidate applications for all roles." : "Track the status of your submitted applications."}
      />

      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-900/5 transition-all focus:border-slate-900 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-100 dark:focus:ring-slate-100/5"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Under Review">Under Review</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Applications Table/List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                    {isHR ? 'Candidate' : 'Job Title'}
                  </th>
                  {isHR && (
                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">Job Role</th>
                  )}
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">Applied Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 text-center">AI Score</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      <td colSpan={isHR ? 6 : 5} className="px-6 py-4">
                        <SkeletonLoader className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredApplications.length > 0 ? (
                  filteredApplications.map((app) => (
                    <motion.tr
                      key={app._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {isHR ? <User size={14} /> : <Briefcase size={14} />}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {isHR ? app.candidate_name : app.job_title}
                          </span>
                        </div>
                      </td>
                      {isHR && (
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{app.job_title}</td>
                      )}
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(app.applied_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          (app.score ?? app.final_score ?? 0) >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          (app.score ?? app.final_score ?? 0) >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {(app.score ?? app.final_score ?? 0).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isHR ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(app._id, 'Shortlisted')}
                                title="Shortlist"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-green-600 transition-colors hover:bg-green-50 dark:border-slate-800 dark:hover:bg-green-900/20"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(app._id, 'Rejected')}
                                title="Reject"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-red-600 transition-colors hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-900/20"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          ) : (
                            <button className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                              View Details
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isHR ? 6 : 5} className="px-6 py-12">
                      <EmptyState
                        title="No applications found"
                        description={searchQuery || filterStatus !== 'all' ? "No applications match your filters." : "No applications have been submitted yet."}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Applications;
