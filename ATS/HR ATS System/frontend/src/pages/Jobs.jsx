import { useState, useEffect, useCallback } from 'react';
import api, { getTeamLeads, getRecruiters, toggleJobActive, assignTeamLeadToJob, assignRecruitersToJob } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CardSkeleton } from '../components/SkeletonLoaders';
import { exportToCSV, formatLastUpdated } from '../utils/export';
import { 
  Card, 
  CardBody, 
  CardFooter, 
  CardHeader, 
  Chip, 
  Input, 
  Button,
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Textarea,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Tabs,
  Tab,
  Switch,
  Divider,
  User,
  CheckboxGroup,
  Checkbox,
  Skeleton
} from '@nextui-org/react';
import { 
  Briefcase, 
  MapPin, 
  Plus, 
  Search,
  Pencil,
  MoreVertical,
  Trash2,
  Users,
  Download,
  RefreshCw,
  LayoutGrid,
  UserCog,
  ShieldCheck,
  ShieldAlert,
  Check,
  Clock,
  List
} from 'lucide-react';

export default function Jobs() {
  const { user, hasPermission } = useAuth();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isRecruiterOpen, onOpen: onRecruiterOpen, onClose: onRecruiterClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [selectedTab, setSelectedTab] = useState('list');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedRecruiters, setSelectedRecruiters] = useState([]);
  
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
      const data = response.data;
      setJobs(data.items || data);
      setLastUpdated(new Date());
    } catch {
      addToast('Failed to fetch jobs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchBoardData = useCallback(async () => {
    try {
      const [teamLeadsRes, recruitersRes, usersRes] = await Promise.all([
        getTeamLeads(),
        getRecruiters(),
        api.get('/users/')
      ]);
      setTeamLeads(teamLeadsRes.data);
      setRecruiters(recruitersRes.data);
      setUsersData(usersRes.data);
    } catch (error) {
      console.error('Error fetching board data:', error);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    // Fetch board data if user can access board
    if (user?.role === 'admin' || user?.role === 'team_lead') {
      fetchBoardData();
    }
  }, [fetchJobs, fetchBoardData, user?.role]);

  const handleCreateJob = async () => {
    try {
      const skillsArray = newJob.required_skills.split(',').map(s => s.trim()).filter(s => s !== '');
      const payload = { ...newJob, required_skills: skillsArray };
      
      if (editingJob) {
        await api.put(`/jobs/${editingJob._id}`, payload);
        addToast('Job updated successfully!', 'success');
      } else {
        await api.post('/jobs/', payload);
        addToast('Job created successfully!', 'success');
      }
      
      onClose();
      resetForm();
      fetchJobs();
    } catch {
      addToast('Failed to save job.', 'error');
    }
  };

  const handleDeleteJob = async (id) => {
    try {
      await api.delete(`/jobs/${id}`);
      addToast('Job deleted successfully!', 'success');
      fetchJobs();
    } catch {
      addToast('Failed to delete job.', 'error');
    }
  };

  const openDeleteDialog = (job) => {
    setJobToDelete(job);
    onDeleteOpen();
  };

  const confirmDeleteJob = () => {
    if (jobToDelete) {
      handleDeleteJob(jobToDelete._id);
      setJobToDelete(null);
    }
  };

  const handleToggleActive = async (jobId, currentStatus) => {
    try {
      await toggleJobActive(jobId);
      setJobs(prev => prev.map(j => 
        j._id === jobId ? { ...j, is_active: !currentStatus } : j
      ));
      addToast(`Job ${currentStatus ? 'deactivated' : 'activated'}.`, 'success');
    } catch (error) {
      console.error('Error toggling job status:', error);
      addToast('Failed to update job status.', 'error');
    }
  };

  const handleAssignTeamLead = async (jobId, teamLeadId) => {
    try {
      await assignTeamLeadToJob(jobId, teamLeadId);
      setJobs(prev => prev.map(j => 
        j._id === jobId ? { ...j, assigned_team_lead_id: teamLeadId } : j
      ));
      addToast('Team lead assigned.', 'success');
    } catch (error) {
      console.error('Error assigning team lead:', error);
      addToast('Failed to assign team lead.', 'error');
    }
  };

  const openRecruiterModal = (job) => {
    setSelectedJob(job);
    setSelectedRecruiters(job.assigned_recruiter_ids || []);
    onRecruiterOpen();
  };

  const handleAssignRecruiters = async () => {
    if (!selectedJob) return;
    
    try {
      await assignRecruitersToJob(selectedJob._id, selectedRecruiters);
      setJobs(prev => prev.map(j => 
        j._id === selectedJob._id ? { ...j, assigned_recruiter_ids: selectedRecruiters } : j
      ));
      addToast('Recruiters assigned.', 'success');
      onRecruiterClose();
    } catch (error) {
      console.error('Error assigning recruiters:', error);
      addToast('Failed to assign recruiters.', 'error');
    }
  };

  const getUserById = (userId) => {
    return usersData.find(u => u._id === userId);
  };

  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase();
    return job.title?.toLowerCase().includes(query) ||
           job.location?.toLowerCase().includes(query) ||
           job.description?.toLowerCase().includes(query);
  });

  // Split jobs by creator type for board view
  const adminJobs = filteredJobs.filter(j => {
    const creator = getUserById(j.created_by);
    return !creator || creator.role === 'admin' || j.created_by === 'admin-static';
  });

  const teamLeadJobs = filteredJobs.filter(j => {
    const creator = getUserById(j.created_by);
    return creator && creator.role === 'team_lead';
  });

  const handleExportJobs = () => {
    const exportData = filteredJobs.map(job => ({
      title: job.title,
      location: job.location || 'N/A',
      type: job.type || 'N/A',
      salary: job.salary || 'N/A',
      experience_required: job.experience_required || 0,
      required_skills: job.required_skills?.join(', ') || 'N/A',
      created_at: new Date(job.created_at).toLocaleDateString()
    }));
    
    exportToCSV(exportData, 'jobs', [
      { key: 'title', label: 'Job Title' },
      { key: 'location', label: 'Location' },
      { key: 'type', label: 'Type' },
      { key: 'salary', label: 'Salary' },
      { key: 'experience_required', label: 'Experience (Years)' },
      { key: 'required_skills', label: 'Required Skills' },
      { key: 'created_at', label: 'Created Date' }
    ]);
    addToast('Jobs exported successfully!', 'success');
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setNewJob({
      title: job.title,
      description: job.description || '',
      location: job.location || '',
      type: job.type || 'Full-time',
      salary: job.salary || '',
      required_skills: job.required_skills?.join(', ') || '',
      experience_required: job.experience_required || 0
    });
    onOpen();
  };

  const resetForm = () => {
    setEditingJob(null);
    setNewJob({
      title: '',
      description: '',
      location: '',
      type: 'Full-time',
      salary: '',
      required_skills: '',
      experience_required: 0
    });
  };

  const isHR = user?.role === 'team_lead' || user?.role === 'recruiter' || user?.role === 'admin';
  const canCreateJobs = hasPermission('can_create_jobs');
  const canDeleteJobs = hasPermission('can_delete_jobs');
  const canAccessBoard = user?.role === 'admin' || user?.role === 'team_lead';

  // Board Job Card Component
  const BoardJobCard = ({ job }) => {
    const creator = getUserById(job.created_by);
    const assignedTeamLead = teamLeads.find(tl => tl.id === job.assigned_team_lead_id);
    const assignedRecruiterCount = job.assigned_recruiter_ids?.length || 0;
    const isActive = job.is_active !== false;
    
    const statusTooltip = job.status_changed_by_name 
      ? `${isActive ? 'Activated' : 'Deactivated'} by ${job.status_changed_by_name} on ${job.status_changed_at ? new Date(job.status_changed_at).toLocaleDateString() : 'N/A'}`
      : 'Status never changed';

    return (
      <Card className={`mb-3 ${!isActive ? 'opacity-60' : ''}`}>
        <CardBody className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm">{job.title}</h4>
            {hasPermission('can_activate_jobs') && (
              <Tooltip content={statusTooltip}>
                <div>
                  <Switch 
                    size="sm" 
                    isSelected={isActive}
                    onValueChange={() => handleToggleActive(job._id, isActive)}
                  />
                </div>
              </Tooltip>
            )}
          </div>
          
          {job.location && (
            <div className="flex items-center gap-1 text-xs text-default-500 mb-2">
              <MapPin size={12} />
              {job.location}
            </div>
          )}
          
          {job.type && (
            <Chip size="sm" variant="flat" className="mb-2">{job.type}</Chip>
          )}
          
          <Divider className="my-2" />
          
          {/* Team Lead Assignment */}
          <div className="mb-2">
            <label className="text-xs text-default-500 mb-1 block">Team Lead</label>
            {hasPermission('can_assign_jobs') ? (
              <Select
                placeholder="Assign TL"
                size="sm"
                selectedKeys={job.assigned_team_lead_id ? [job.assigned_team_lead_id] : []}
                onChange={(e) => handleAssignTeamLead(job._id, e.target.value)}
              >
                {teamLeads.map(tl => (
                  <SelectItem key={tl.id} value={tl.id}>
                    {tl.name || tl.email}
                  </SelectItem>
                ))}
              </Select>
            ) : (
              <span className="text-sm">
                {assignedTeamLead ? assignedTeamLead.name || assignedTeamLead.email : 'Not assigned'}
              </span>
            )}
          </div>
          
          {/* Recruiters Assignment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-default-500">
              <Users size={12} />
              {assignedRecruiterCount} recruiter(s)
            </div>
            {(hasPermission('can_assign_jobs') || hasPermission('can_self_assign_recruiters')) && (
              <Button 
                size="sm" 
                variant="flat"
                onPress={() => openRecruiterModal(job)}
              >
                Assign
              </Button>
            )}
          </div>
          
          {/* Creator info */}
          <div className="mt-2 pt-2 border-t border-divider">
            <div className="flex items-center gap-1 text-xs text-default-400">
              <Clock size={10} />
              Created by: {job.created_by_name || creator?.name || creator?.email || 'Admin'} on {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-default-900">Job Postings</h1>
        </div>
        <CardSkeleton count={6} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Job Openings</h1>
            <p className="text-default-600">Manage your open positions and job postings.</p>
            {lastUpdated && (
              <p className="text-xs text-default-400">Last updated: {formatLastUpdated(lastUpdated)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Refresh">
              <Button isIconOnly variant="flat" onPress={() => { fetchJobs(); if (canAccessBoard) fetchBoardData(); }}>
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
            {filteredJobs.length > 0 && (
              <Tooltip content="Export to CSV">
                <Button isIconOnly variant="flat" onPress={handleExportJobs}>
                  <Download size={18} />
                </Button>
              </Tooltip>
            )}
            {canCreateJobs && (
              <Button 
                color="primary" 
                startContent={<Plus size={18} />}
                onPress={() => { resetForm(); onOpen(); }}
              >
                Post New Job
              </Button>
            )}
          </div>
        </div>

        {/* Tabs for List and Board view */}
        {canAccessBoard ? (
          <Tabs 
            selectedKey={selectedTab} 
            onSelectionChange={setSelectedTab}
            variant="underlined"
            aria-label="Job views"
          >
            <Tab 
              key="list" 
              title={
                <div className="flex items-center gap-2">
                  <List size={16} />
                  <span>Jobs List</span>
                </div>
              }
            >
              {/* Search */}
              <div className="flex gap-4 mt-4">
                <Input
                  classNames={{
                    base: "max-w-md",
                    inputWrapper: "bg-default-100",
                  }}
                  placeholder="Search jobs..."
                  startContent={<Search size={18} className="text-default-400" />}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
              </div>

              {/* Jobs Grid */}
              {filteredJobs.length === 0 ? (
                <Card className="p-12 text-center mt-4">
                  <CardBody className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100">
                      <Briefcase className="h-8 w-8 text-default-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-default-900">No jobs found</h3>
                    <p className="text-sm text-default-500">Get started by creating your first job posting.</p>
                    {canCreateJobs && (
                      <Button color="primary" startContent={<Plus size={16} />} onPress={() => { resetForm(); onOpen(); }}>
                        Create Job
                      </Button>
                    )}
                  </CardBody>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                  {filteredJobs.map((job) => (
                    <Card key={job._id} className="border border-divider shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="flex justify-between items-start pb-0">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-semibold text-default-900">{job.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-default-500">
                            <MapPin size={14} />
                            <span>{job.location || 'Remote'}</span>
                          </div>
                        </div>
                        {isHR && (
                          <Dropdown>
                            <DropdownTrigger>
                              <Button isIconOnly size="sm" variant="light">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Job actions">
                              <DropdownItem 
                                key="edit" 
                                startContent={<Pencil size={16} />}
                                onPress={() => handleEditJob(job)}
                              >
                                Edit
                              </DropdownItem>
                              {canDeleteJobs && (
                                <DropdownItem 
                                  key="delete" 
                                  className="text-danger" 
                                  color="danger"
                                  startContent={<Trash2 size={16} />}
                                  onPress={() => openDeleteDialog(job)}
                                >
                                  Delete
                                </DropdownItem>
                              )}
                            </DropdownMenu>
                          </Dropdown>
                        )}
                      </CardHeader>
                      <CardBody className="py-3">
                        <p className="text-sm text-default-600 line-clamp-2">{job.description || 'No description available'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Chip size="sm" variant="flat" color="primary">{job.type || 'Full-time'}</Chip>
                          {job.salary && <Chip size="sm" variant="flat">{job.salary}</Chip>}
                          <Tooltip 
                            content={
                              job.status_changed_by_name 
                                ? `${job.is_active !== false ? 'Activated' : 'Deactivated'} by ${job.status_changed_by_name} on ${job.status_changed_at ? new Date(job.status_changed_at).toLocaleDateString() : 'N/A'}`
                                : 'Status never changed'
                            }
                          >
                            <Chip 
                              size="sm" 
                              variant="flat" 
                              color={job.is_active !== false ? 'success' : 'warning'}
                              className="cursor-help"
                            >
                              {job.is_active !== false ? 'Active' : 'Inactive'}
                            </Chip>
                          </Tooltip>
                        </div>
                      </CardBody>
                      <CardFooter className="border-t border-divider pt-3 flex-col items-start gap-1">
                        <div className="flex items-center gap-2 text-sm text-default-500 w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Users size={14} />
                            <span>{job.applicants_count || 0} applicants</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-default-400">
                          <Clock size={12} />
                          <span>
                            Created by {job.created_by_name || 'Admin'} on {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </Tab>

            <Tab 
              key="board" 
              title={
                <div className="flex items-center gap-2">
                  <LayoutGrid size={16} />
                  <span>Jobs Board</span>
                </div>
              }
            >
              {/* Board View */}
              <div className="space-y-4 mt-4">
                {/* Search */}
                <Input
                  placeholder="Search jobs by title or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search size={18} className="text-default-400" />}
                  className="max-w-md"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Admin Created Jobs */}
                  <Card>
                    <CardHeader className="flex items-center gap-2 pb-2">
                      <ShieldAlert size={18} className="text-danger" />
                      <span className="font-semibold">Admin Created Jobs</span>
                      <Chip size="sm" variant="flat" color="danger">{adminJobs.length}</Chip>
                    </CardHeader>
                    <CardBody className="max-h-[600px] overflow-y-auto">
                      {adminJobs.length === 0 ? (
                        <div className="text-center py-8 text-default-400">
                          <Briefcase className="mx-auto mb-2" size={32} />
                          <p>No admin-created jobs</p>
                        </div>
                      ) : (
                        adminJobs.map(job => <BoardJobCard key={job._id} job={job} />)
                      )}
                    </CardBody>
                  </Card>

                  {/* Team Lead Created Jobs */}
                  <Card>
                    <CardHeader className="flex items-center gap-2 pb-2">
                      <ShieldCheck size={18} className="text-primary" />
                      <span className="font-semibold">Team Lead Created Jobs</span>
                      <Chip size="sm" variant="flat" color="primary">{teamLeadJobs.length}</Chip>
                    </CardHeader>
                    <CardBody className="max-h-[600px] overflow-y-auto">
                      {teamLeadJobs.length === 0 ? (
                        <div className="text-center py-8 text-default-400">
                          <Briefcase className="mx-auto mb-2" size={32} />
                          <p>No team lead-created jobs</p>
                        </div>
                      ) : (
                        teamLeadJobs.map(job => <BoardJobCard key={job._id} job={job} />)
                      )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            </Tab>
          </Tabs>
        ) : (
          <>
            {/* Search (non-board view) */}
            <div className="flex gap-4">
              <Input
                classNames={{
                  base: "max-w-md",
                  inputWrapper: "bg-default-100",
                }}
                placeholder="Search jobs..."
                startContent={<Search size={18} className="text-default-400" />}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>

            {/* Jobs Grid (non-board view) */}
            {filteredJobs.length === 0 ? (
              <Card className="p-12 text-center">
                <CardBody className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100">
                    <Briefcase className="h-8 w-8 text-default-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-default-900">No jobs found</h3>
                  <p className="text-sm text-default-500">Get started by creating your first job posting.</p>
                  {canCreateJobs && (
                    <Button color="primary" startContent={<Plus size={16} />} onPress={() => { resetForm(); onOpen(); }}>
                      Create Job
                    </Button>
                  )}
                </CardBody>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <Card key={job._id} className="border border-divider shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex justify-between items-start pb-0">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-default-900">{job.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-default-500">
                          <MapPin size={14} />
                          <span>{job.location || 'Remote'}</span>
                        </div>
                      </div>
                      {isHR && (
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Job actions">
                            <DropdownItem 
                              key="edit" 
                              startContent={<Pencil size={16} />}
                              onPress={() => handleEditJob(job)}
                            >
                              Edit
                            </DropdownItem>
                            {canDeleteJobs && (
                              <DropdownItem 
                                key="delete" 
                                className="text-danger" 
                                color="danger"
                                startContent={<Trash2 size={16} />}
                                onPress={() => openDeleteDialog(job)}
                              >
                                Delete
                              </DropdownItem>
                            )}
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    </CardHeader>
                    <CardBody className="py-3">
                      <p className="text-sm text-default-600 line-clamp-2">{job.description || 'No description available'}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Chip size="sm" variant="flat" color="primary">{job.type || 'Full-time'}</Chip>
                        {job.salary && <Chip size="sm" variant="flat">{job.salary}</Chip>}
                        <Tooltip 
                          content={
                            job.status_changed_by_name 
                              ? `${job.is_active !== false ? 'Activated' : 'Deactivated'} by ${job.status_changed_by_name} on ${job.status_changed_at ? new Date(job.status_changed_at).toLocaleDateString() : 'N/A'}`
                              : 'Status never changed'
                          }
                        >
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            color={job.is_active !== false ? 'success' : 'warning'}
                            className="cursor-help"
                          >
                            {job.is_active !== false ? 'Active' : 'Inactive'}
                          </Chip>
                        </Tooltip>
                      </div>
                    </CardBody>
                    <CardFooter className="border-t border-divider pt-3 flex-col items-start gap-1">
                      <div className="flex items-center gap-2 text-sm text-default-500 w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>{job.applicants_count || 0} applicants</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-default-400">
                        <Clock size={12} />
                        <span>
                          Created by {job.created_by_name || 'Admin'} on {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Job Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{editingJob ? 'Edit Job' : 'Create New Job'}</h2>
                <p className="text-sm text-default-500 font-normal">Fill in the details for this position</p>
              </ModalHeader>
              <ModalBody>
                <div className="grid gap-4">
                  <Input
                    label="Job Title"
                    placeholder="e.g. Senior Frontend Developer"
                    value={newJob.title}
                    onValueChange={(v) => setNewJob({...newJob, title: v})}
                    isRequired
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Location"
                      placeholder="e.g. San Francisco, CA"
                      value={newJob.location}
                      onValueChange={(v) => setNewJob({...newJob, location: v})}
                    />
                    <Select
                      label="Employment Type"
                      selectedKeys={[newJob.type]}
                      onSelectionChange={(keys) => setNewJob({...newJob, type: Array.from(keys)[0]})}
                    >
                      <SelectItem key="Full-time">Full-time</SelectItem>
                      <SelectItem key="Part-time">Part-time</SelectItem>
                      <SelectItem key="Contract">Contract</SelectItem>
                      <SelectItem key="Internship">Internship</SelectItem>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Salary Range"
                      placeholder="e.g. $80,000 - $120,000"
                      value={newJob.salary}
                      onValueChange={(v) => setNewJob({...newJob, salary: v})}
                    />
                    <Input
                      label="Experience Required (years)"
                      type="number"
                      value={newJob.experience_required.toString()}
                      onValueChange={(v) => setNewJob({...newJob, experience_required: parseInt(v) || 0})}
                    />
                  </div>
                  <Textarea
                    label="Description"
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={newJob.description}
                    onValueChange={(v) => setNewJob({...newJob, description: v})}
                    minRows={4}
                  />
                  <Input
                    label="Required Skills"
                    placeholder="e.g. React, TypeScript, Node.js (comma separated)"
                    value={newJob.required_skills}
                    onValueChange={(v) => setNewJob({...newJob, required_skills: v})}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleCreateJob}>
                  {editingJob ? 'Save Changes' : 'Create Job'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={confirmDeleteJob}
        title="Delete Job"
        message={`Are you sure you want to delete "${jobToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="danger"
      />

      {/* Recruiter Assignment Modal */}
      <Modal isOpen={isRecruiterOpen} onOpenChange={onRecruiterClose} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <UserCog size={20} />
                Assign Recruiters
              </ModalHeader>
              <ModalBody>
                {selectedJob && (
                  <div>
                    <p className="text-sm text-default-500 mb-4">
                      Assigning recruiters to: <strong>{selectedJob.title}</strong>
                    </p>
                    <CheckboxGroup
                      label="Select recruiters"
                      value={selectedRecruiters}
                      onChange={setSelectedRecruiters}
                    >
                      {recruiters.map(r => (
                        <Checkbox key={r.id} value={r.id}>
                          <div className="flex items-center gap-2">
                            <User
                              name={r.name || 'Unknown'}
                              description={r.email}
                              avatarProps={{ name: r.name?.charAt(0) || 'R', size: 'sm' }}
                            />
                          </div>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                    {recruiters.length === 0 && (
                      <p className="text-default-400 text-sm text-center py-4">
                        No recruiters available
                      </p>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleAssignRecruiters}>
                  <Check size={16} />
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
