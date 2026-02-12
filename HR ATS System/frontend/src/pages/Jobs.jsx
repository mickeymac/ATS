import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Briefcase, Plus, Search, MapPin, Clock, DollarSign, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SkeletonLoader = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />;

const EmptyState = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
      <Briefcase className="h-6 w-6 text-slate-400" />
    </div>
    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

const Jobs = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    location: '',
    type: 'Full-time',
    salary: '',
    required_skills: '',
    experience_required: 0
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/jobs/');
      setJobs(response.data);
    } catch (error) {
      addToast('Failed to fetch jobs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = newJob.required_skills.split(',').map(s => s.trim()).filter(s => s !== '');
      await api.post('/jobs/', { ...newJob, required_skills: skillsArray });
      setShowCreateModal(false);
      setNewJob({
        title: '',
        description: '',
        location: '',
        type: 'Full-time',
        salary: '',
        required_skills: '',
        experience_required: 0
      });
      fetchJobs();
      addToast('Job posted successfully!', 'success');
    } catch (error) {
      addToast('Failed to post job.', 'error');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      setJobs(jobs.filter(job => job._id !== id));
      addToast('Job deleted successfully.', 'success');
    } catch (error) {
      addToast('Failed to delete job.', 'error');
    }
  };

  const openEditModal = (job) => {
    setEditingJob({
      ...job,
      required_skills: Array.isArray(job.required_skills)
        ? job.required_skills.join(', ')
        : job.required_skills || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    if (!editingJob?._id) return;

    try {
      const skillsArray = editingJob.required_skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '');

      const payload = {
        ...editingJob,
        required_skills: skillsArray
      };
      delete payload._id;

      await api.put(`/jobs/${editingJob._id}`, payload);
      addToast('Job updated successfully!', 'success');
      setShowEditModal(false);
      setEditingJob(null);
      fetchJobs();
    } catch (error) {
      addToast('Failed to update job.', 'error');
    }
  };

  const openApplyModal = (job) => {
    setSelectedJob(job);
    setResumeFile(null);
    setShowApplyModal(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedJob || !resumeFile) {
      addToast('Please select a resume file.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('job_id', selectedJob._id);
      formData.append('file', resumeFile);

      await api.post('/applications/apply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast('Application submitted successfully!', 'success');
      setShowApplyModal(false);
      setSelectedJob(null);
      setResumeFile(null);
    } catch (error) {
      addToast('Failed to submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isHR = user?.role === 'hr' || user?.role === 'admin';

  return (
    <AppShell>
      <PageHeader
        title="Job Openings"
        description={isHR ? "Manage your company's job postings and candidates." : "Browse and apply for the latest opportunities."}
        actions={
          isHR && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Plus size={16} />
              Post a Job
            </button>
          )
        }
      />

      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-900/5 transition-all focus:border-slate-900 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-100 dark:focus:ring-slate-100/5"
          />
        </div>

        {/* Jobs List */}
        <div className="grid gap-4">
          {loading ? (
            [1, 2, 3].map(i => <SkeletonLoader key={i} className="h-32 w-full" />)
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{job.title}</h3>
                      <StatusBadge status="active" />
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.location || 'Remote'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {job.type || 'Full-time'}
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} />
                          {job.salary}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isHR ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteJob(job._id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-900/50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(job)}
                          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openApplyModal(job)}
                        className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <EmptyState
              title="No jobs found"
              description={searchQuery ? "No jobs match your search criteria." : "There are currently no job openings available."}
            />
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Post a New Job</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Fill in the details to create a new job opening.</p>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Title</label>
                    <input
                      required
                      value={newJob.title}
                      onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                      placeholder="e.g. Senior Frontend Engineer"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                    <textarea
                      required
                      value={newJob.description}
                      onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                      className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                      placeholder="Describe the role and responsibilities..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
                    <input
                      value={newJob.location}
                      onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                      placeholder="e.g. Remote, NY"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                    <select
                      value={newJob.type}
                      onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Required Skills (comma separated)</label>
                    <input
                      required
                      value={newJob.required_skills}
                      onChange={(e) => setNewJob({ ...newJob, required_skills: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                      placeholder="e.g. React, Node.js, TypeScript"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Post Job
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Apply for Job</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedJob?.title || 'Selected role'}
                </p>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload Resume (PDF/DOCX)</label>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Job Modal */}
      <AnimatePresence>
        {showEditModal && editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Job</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update the job details and save.</p>
              </div>

              <form onSubmit={handleUpdateJob} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Title</label>
                    <input
                      required
                      value={editingJob.title}
                      onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                    <textarea
                      required
                      value={editingJob.description}
                      onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                      className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
                    <input
                      value={editingJob.location || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                    <select
                      value={editingJob.type || 'Full-time'}
                      onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Salary</label>
                    <input
                      value={editingJob.salary || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Required Skills (comma separated)</label>
                    <input
                      required
                      value={editingJob.required_skills}
                      onChange={(e) => setEditingJob({ ...editingJob, required_skills: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience Required (years)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingJob.experience_required ?? 0}
                      onChange={(e) => setEditingJob({ ...editingJob, experience_required: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default Jobs;
