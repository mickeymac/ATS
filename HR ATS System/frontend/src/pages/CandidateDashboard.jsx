import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut, Upload } from 'lucide-react';

const CandidateDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const { logout, user } = useAuth();
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/');
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs", error);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await api.get('/applications/my-applications');
      setMyApplications(response.data);
    } catch (error) {
      console.error("Error fetching applications", error);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!resumeFile || !selectedJob) return;

    const formData = new FormData();
    formData.append('job_id', selectedJob._id);
    formData.append('file', resumeFile);

    setUploading(true);
    try {
      await api.post('/applications/apply', formData);
      setSelectedJob(null);
      setResumeFile(null);
      fetchMyApplications();
      alert('Application submitted successfully!');
    } catch (error) {
      console.error("Error applying", error);
      const msg = error?.response?.data?.detail || 'Failed to apply. You might have already applied or the file format is unsupported.';
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  const hasApplied = (jobId) => {
    return myApplications.some(app => app.job_id === jobId);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Candidate Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            <button onClick={logout} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
            <LogOut size={18} /> Logout
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available Jobs */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Open Positions</h2>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job._id} className="p-4 border rounded hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{job.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">Exp: {job.experience_required}y</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">Skills: {job.required_skills.join(', ')}</span>
                    </div>
                  </div>
                  {hasApplied(job._id) ? (
                    <span className="text-green-600 font-bold text-sm px-3 py-1 bg-green-50 rounded">Applied</span>
                  ) : (
                    <button 
                      onClick={() => setSelectedJob(job)}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Applications */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">My Applications</h2>
          <div className="space-y-4">
            {myApplications.length === 0 ? (
                <p className="text-gray-500">No applications yet.</p>
            ) : (
                myApplications.map(app => (
                <div key={app._id} className="p-4 border rounded flex justify-between items-center">
                    <div>
                    <p className="font-bold">Job ID: {app.job_id}</p>
                    <p className="text-xs text-gray-500">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                    <span className={`px-3 py-1 rounded text-sm font-bold ${
                        app.status === 'Selected' ? 'bg-green-100 text-green-800' :
                        app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {app.status}
                    </span>
                    <p className="text-xs text-blue-600 mt-1">Match: {app.final_score}%</p>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h2 className="text-xl font-bold mb-4">Apply for {selectedJob.title}</h2>
            <form onSubmit={handleApply}>
              <div className="border-2 border-dashed border-gray-300 p-6 rounded text-center mb-4 cursor-pointer hover:bg-gray-50">
                <input 
                  type="file" 
                  accept=".pdf,.docx"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="w-full"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">Upload Resume (PDF/DOCX)</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => {setSelectedJob(null); setResumeFile(null);}} className="px-4 py-2 text-gray-600">Cancel</button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300 flex items-center gap-2"
                >
                  {uploading ? 'Analyzing...' : <><Upload size={16} /> Submit Application</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
