import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Permission Management APIs
export const getUsersWithPermissions = () => api.get('/users/with-permissions');
export const getDefaultPermissions = () => api.get('/users/permissions/defaults');
export const updateUserPermissions = (userId, permissions) => 
  api.put(`/users/${userId}/permissions`, permissions);
export const assignRecruiterToTeamLead = (recruiterId, teamLeadId) =>
  api.put(`/users/${recruiterId}/assign-team-lead`, { team_lead_id: teamLeadId });

// Team Lead and Recruiter APIs
export const getTeamLeads = () => api.get('/users/roles/team-leads');
export const getRecruiters = (teamLeadId = null) => 
  api.get('/users/roles/recruiters', { params: teamLeadId ? { team_lead_id: teamLeadId } : {} });

// Job Management APIs
export const toggleJobActive = (jobId) => api.put(`/jobs/${jobId}/toggle-active`);
export const assignTeamLeadToJob = (jobId, teamLeadId) => 
  api.put(`/jobs/${jobId}/assign-team-lead`, { team_lead_id: teamLeadId });
export const assignRecruitersToJob = (jobId, recruiterIds) =>
  api.put(`/jobs/${jobId}/assign-recruiters`, { recruiter_ids: recruiterIds });

export default api;
