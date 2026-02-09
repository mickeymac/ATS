import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { LogOut } from 'lucide-react';

const HRDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const { logout, user } = useAuth();
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '', required_skills: '', experience_required: 0 });

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/');
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs", error);
    }
  };

  const fetchApplications = async (jobId) => {
    try {
      const response = await api.get(`/applications/job/${jobId}`);
      setApplications(response.data);
    } catch (error) {
      console.error("Error fetching applications", error);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchApplications(selectedJob._id);
    }
  }, [selectedJob]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = newJob.required_skills.split(',').map(s => s.trim());
      await api.post('/jobs/', { ...newJob, required_skills: skillsArray });
      setShowCreateJob(false);
      fetchJobs();
    } catch (error) {
      console.error("Error creating job", error);
    }
  };
  
  const updateStatus = async (appId, newStatus) => {
    try {
        await api.put(`/applications/${appId}/status`, { status: newStatus });
        fetchApplications(selectedJob._id);
    } catch (error) {
        console.error("Error updating status", error);
    }
  }

  // Analytics data
  const getAnalyticsData = () => {
    if (!applications.length) return [];
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(statusCounts).map(status => ({
      name: status,
      count: statusCounts[status]
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            <button onClick={logout} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
            <LogOut size={18} /> Logout
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Jobs</h2>
            <button 
              onClick={() => setShowCreateJob(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + New Job
            </button>
          </div>
          <div className="space-y-2">
            {jobs.map(job => (
              <div 
                key={job._id} 
                onClick={() => setSelectedJob(job)}
                className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${selectedJob?._id === job._id ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <h3 className="font-bold">{job.title}</h3>
                <p className="text-sm text-gray-500">{job.experience_required} years exp</p>
              </div>
            ))}
          </div>
        </div>

        {/* Applications & Analytics */}
        <div className="md:col-span-2 space-y-6">
          {selectedJob ? (
            <>
              {/* Analytics Chart */}
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-4">Hiring Analytics: {selectedJob.title}</h2>
                <BarChart width={500} height={250} data={getAnalyticsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </div>

              {/* Applications List */}
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-4">Applicants ({applications.length})</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="p-2">Score</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Match Details</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.sort((a,b) => b.final_score - a.final_score).map(app => (
                        <tr key={app._id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <span className="font-bold text-blue-600">{app.final_score}%</span>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              app.status === 'Selected' ? 'bg-green-100 text-green-800' :
                              app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="text-xs text-gray-500">
                              Rule: {app.rule_score} | Semantic: {app.semantic_score}
                            </div>
                          </td>
                          <td className="p-2">
                            <select 
                                value={app.status} 
                                onChange={(e) => updateStatus(app._id, e.target.value)}
                                className="border rounded p-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Applied">Applied</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Interview Scheduled">Interview</option>
                                <option value="Selected">Selected</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
              Select a job to view applications and analytics
            </div>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h2 className="text-xl font-bold mb-4">Create New Job</h2>
            <form onSubmit={handleCreateJob}>
              <input 
                placeholder="Job Title" 
                className="w-full border p-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newJob.title}
                onChange={e => setNewJob({...newJob, title: e.target.value})}
                required
              />
              <textarea 
                placeholder="Description" 
                className="w-full border p-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newJob.description}
                onChange={e => setNewJob({...newJob, description: e.target.value})}
                required
              />
              <input 
                placeholder="Required Skills (comma separated)" 
                className="w-full border p-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newJob.required_skills}
                onChange={e => setNewJob({...newJob, required_skills: e.target.value})}
                required
              />
              <input 
                type="number"
                placeholder="Years of Experience" 
                className="w-full border p-2 mb-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newJob.experience_required}
                onChange={e => setNewJob({...newJob, experience_required: parseInt(e.target.value)})}
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateJob(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
