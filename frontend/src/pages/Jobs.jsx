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
  Avatar,
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
      <Card className={`group border border-divider hover:border-primary/50 hover:shadow-md transition-all duration-300 ${!isActive ? 'opacity-70 bg-default-50' : ''}`}>
        <CardBody className="p-4 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-sm text-default-900 group-hover:text-primary transition-colors leading-tight">{job.title}</h4>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-default-500 uppercase tracking-wider">
                <MapPin size={10} className="text-primary" />
                {job.location || 'Remote'}
              </div>
            </div>
            {hasPermission('can_activate_jobs') && (
              <Tooltip content={statusTooltip}>
                <div className="flex items-center">
                  <Switch 
                    size="sm" 
                    isSelected={isActive}
                    onValueChange={() => handleToggleActive(job._id, isActive)}
                    classNames={{
                      wrapper: "group-data-[selected=true]:bg-success"
                    }}
                  />
                </div>
              </Tooltip>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px] font-bold bg-primary-50 text-primary-600 border border-primary-100">{job.type || 'Full-time'}</Chip>
            {job.salary && <Chip size="sm" variant="flat" className="h-5 text-[10px] font-bold bg-default-100 text-default-600">{job.salary}</Chip>}
          </div>
          
          <Divider className="opacity-50" />
          
          {/* Assignment Section */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-default-400 uppercase tracking-widest mb-2">
                <UserCog size={12} />
                <span>Team Lead</span>
              </div>
              {hasPermission('can_assign_jobs') ? (
                <Select
                  placeholder="Select Lead"
                  size="sm"
                  variant="flat"
                  selectedKeys={job.assigned_team_lead_id ? [job.assigned_team_lead_id] : []}
                  onChange={(e) => handleAssignTeamLead(job._id, e.target.value)}
                  className="max-w-full"
                  classNames={{
                    trigger: "h-8 min-h-8 bg-default-100 hover:bg-default-200 transition-colors"
                  }}
                >
                  {teamLeads.map(tl => (
                    <SelectItem key={tl.id} value={tl.id} textValue={tl.name || tl.email}>
                      <div className="flex items-center gap-2">
                        <Avatar name={tl.name?.charAt(0)} size="tiny" className="w-5 h-5 text-[10px]" />
                        <span className="text-xs">{tl.name || tl.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              ) : (
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-default-50 border border-default-100">
                  <Avatar name={assignedTeamLead?.name?.charAt(0) || '?'} size="tiny" className="w-5 h-5 text-[10px]" />
                  <span className="text-xs font-medium text-default-700">
                    {assignedTeamLead ? assignedTeamLead.name || assignedTeamLead.email : 'Not assigned'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-default-100 text-default-500">
                  <Users size={12} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-default-900 leading-none">{assignedRecruiterCount}</span>
                  <span className="text-[9px] font-medium text-default-400 uppercase">Recruiters</span>
                </div>
              </div>
              {(hasPermission('can_assign_jobs') || hasPermission('can_self_assign_recruiters')) && (
                <Button 
                  size="sm" 
                  variant="flat"
                  onPress={() => openRecruiterModal(job)}
                  className="h-7 text-[10px] font-bold px-3 bg-default-100 hover:bg-primary hover:text-white transition-all"
                >
                  Manage
                </Button>
              )}
            </div>
          </div>
          
          {/* Creator info */}
          <div className="mt-1 pt-3 border-t border-divider">
            <div className="flex items-center gap-1.5 text-[9px] font-medium text-default-400 italic">
              <Clock size={10} />
              <span>Created {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'} by {job.created_by_name || creator?.name || 'Admin'}</span>
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
      <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Job Openings</h1>
            <p className="text-default-500 text-lg">Manage and evaluate your open positions and job postings.</p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-default-400 mt-1">
                <Clock size={12} />
                <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="Refresh queue">
              <Button 
                variant="flat" 
                onPress={() => { fetchJobs(); if (canAccessBoard) fetchBoardData(); }}
                className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
              >
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
            {filteredJobs.length > 0 && (
              <Tooltip content="Export to CSV">
                <Button 
                  variant="flat" 
                  onPress={handleExportJobs}
                  className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
                >
                  <Download size={18} />
                </Button>
              </Tooltip>
            )}
            {canCreateJobs && (
              <Button 
                color="primary" 
                startContent={<Plus size={20} />}
                onPress={() => { resetForm(); onOpen(); }}
                className="h-10 font-bold px-6 shadow-md"
              >
                Post New Job
              </Button>
            )}
          </div>
        </div>

        {/* Tabs for List and Board view */}
        {canAccessBoard ? (
          <div className="flex flex-col gap-6">
            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/30 p-1">
              <CardBody className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
                <Tabs 
                  selectedKey={selectedTab} 
                  onSelectionChange={setSelectedTab}
                  color="primary"
                  variant="light"
                  classNames={{
                    tabList: "gap-2 p-1 bg-transparent",
                    cursor: "w-full bg-primary shadow-sm",
                    tab: "max-w-fit px-4 h-10 font-semibold",
                    tabContent: "group-data-[selected=true]:text-white"
                  }}
                >
                  <Tab 
                    key="list" 
                    title={
                      <div className="flex items-center gap-2.5">
                        <List size={18} />
                        <span>Jobs List</span>
                      </div>
                    }
                  />
                  <Tab 
                    key="board" 
                    title={
                      <div className="flex items-center gap-2.5">
                        <LayoutGrid size={18} />
                        <span>Jobs Board</span>
                      </div>
                    }
                  />
                </Tabs>

                <div className="flex items-center gap-3 pr-2">
                  <Input
                    classNames={{
                      base: "w-64",
                      inputWrapper: "bg-default-100 dark:bg-default-100 h-10",
                    }}
                    placeholder="Search jobs..."
                    startContent={<Search size={18} className="text-default-400" />}
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                </div>
              </CardBody>
            </Card>

            {selectedTab === 'list' ? (
              /* Jobs Grid */
              filteredJobs.length === 0 ? (
                <Card className="p-16 border-dashed border-2 border-divider bg-transparent">
                  <CardBody className="flex flex-col items-center gap-6">
                    <div className="p-6 rounded-full bg-default-100">
                      <Briefcase size={40} className="text-default-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-default-900">No jobs found</h3>
                      <p className="text-default-500 mt-2">Get started by creating your first job posting.</p>
                    </div>
                    {canCreateJobs && (
                      <Button color="primary" startContent={<Plus size={18} />} onPress={() => { resetForm(); onOpen(); }} className="font-bold">
                        Create Job
                      </Button>
                    )}
                  </CardBody>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredJobs.map((job) => (
                    <Card key={job._id} className="group border border-divider hover:border-primary/50 hover:shadow-xl transition-all duration-500 overflow-hidden bg-content1 dark:bg-default-50/20 backdrop-blur-sm">
                      <CardHeader className="flex justify-between items-start p-6 pb-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                              <Briefcase size={20} />
                            </div>
                            <h3 className="font-black text-xl text-default-900 group-hover:text-primary transition-colors duration-300 leading-tight">{job.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-default-500 dark:text-default-400 uppercase tracking-widest">
                            <MapPin size={14} className="text-primary" />
                            <span>{job.location || 'Remote'}</span>
                          </div>
                        </div>
                        {isHR && (
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button isIconOnly size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 hover:bg-default-200">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Job actions" variant="flat">
                              <DropdownItem 
                                key="edit" 
                                startContent={<Pencil size={16} />}
                                onPress={() => handleEditJob(job)}
                              >
                                Edit Details
                              </DropdownItem>
                              {canDeleteJobs && (
                                <DropdownItem 
                                  key="delete" 
                                  className="text-danger" 
                                  color="danger"
                                  startContent={<Trash2 size={16} />}
                                  onPress={() => openDeleteDialog(job)}
                                >
                                  Delete Job
                                </DropdownItem>
                              )}
                            </DropdownMenu>
                          </Dropdown>
                        )}
                      </CardHeader>
                      <CardBody className="px-6 py-4">
                        <div className="relative">
                          <p className="text-sm text-default-700 dark:text-default-600 line-clamp-3 mb-6 leading-relaxed font-medium">
                            {job.description || 'No description available'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Chip 
                            size="sm" 
                            variant="shadow" 
                            color="primary"
                            className="font-black px-3 uppercase tracking-tighter h-7 shadow-primary-200 dark:shadow-none"
                          >
                            {job.type || 'Full-time'}
                          </Chip>
                          {job.salary && (
                            <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100 text-default-800 dark:text-default-700 font-bold h-7 px-3">
                              {job.salary}
                            </Chip>
                          )}
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
                              className="cursor-help font-black uppercase tracking-tighter h-7 px-3"
                            >
                              {job.is_active !== false ? 'Active' : 'Inactive'}
                            </Chip>
                          </Tooltip>
                        </div>
                      </CardBody>
                      <Divider className="opacity-30" />
                      <CardFooter className="px-6 py-4 flex-col items-start gap-4 bg-default-50/50 dark:bg-default-100/10">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {[1, 2, 3].map((i) => (
                                <Avatar 
                                  key={i}
                                  size="sm"
                                  className="w-6 h-6 border-2 border-background"
                                  src={`https://i.pravatar.cc/150?u=${job._id}${i}`}
                                />
                              ))}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-default-900 leading-none">{job.applicants_count || 0}</span>
                              <span className="text-[10px] font-bold text-default-500 dark:text-default-400 uppercase tracking-widest">Applicants</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-default-500 dark:text-default-400 uppercase tracking-widest">
                              <Clock size={12} />
                              <span>{job.created_at ? new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                            </div>
                            <span className="text-[9px] font-medium text-default-400 dark:text-default-300 italic">By {job.created_by_name || 'Admin'}</span>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              /* Board View Content */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Admin Created Jobs */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-danger-100 text-danger">
                        <ShieldAlert size={20} />
                      </div>
                      <h2 className="text-lg font-bold text-default-900">Admin Postings</h2>
                    </div>
                    <Chip size="md" variant="flat" color="danger" className="font-bold">{adminJobs.length}</Chip>
                  </div>
                  <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                    {adminJobs.length === 0 ? (
                      <Card className="border-dashed border-2 border-divider bg-transparent">
                        <CardBody className="py-12 text-center text-default-400">
                          <Briefcase className="mx-auto mb-3 opacity-20" size={40} />
                          <p className="font-medium">No admin postings</p>
                        </CardBody>
                      </Card>
                    ) : (
                      adminJobs.map(job => <BoardJobCard key={job._id} job={job} />)
                    )}
                  </div>
                </div>

                {/* Team Lead Created Jobs */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary-100 text-primary">
                        <ShieldCheck size={20} />
                      </div>
                      <h2 className="text-lg font-bold text-default-900">Lead Postings</h2>
                    </div>
                    <Chip size="md" variant="flat" color="primary" className="font-bold">{teamLeadJobs.length}</Chip>
                  </div>
                  <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                    {teamLeadJobs.length === 0 ? (
                      <Card className="border-dashed border-2 border-divider bg-transparent">
                        <CardBody className="py-12 text-center text-default-400">
                          <Briefcase className="mx-auto mb-3 opacity-20" size={40} />
                          <p className="font-medium">No lead postings</p>
                        </CardBody>
                      </Card>
                    ) : (
                      teamLeadJobs.map(job => <BoardJobCard key={job._id} job={job} />)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Search (non-board view) */}
            <div className="flex items-center justify-between">
              <Input
                classNames={{
                  base: "w-80",
                  inputWrapper: "bg-default-100 h-10 shadow-sm",
                }}
                placeholder="Search jobs..."
                startContent={<Search size={18} className="text-default-400" />}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <div className="flex items-center gap-2 text-default-500 font-medium">
                <List size={16} />
                <span>{filteredJobs.length} Results</span>
              </div>
            </div>

            {/* Jobs Grid (non-board view) */}
            {filteredJobs.length === 0 ? (
              <Card className="p-20 border-dashed border-2 border-divider bg-transparent">
                <CardBody className="flex flex-col items-center gap-6">
                  <div className="p-8 rounded-full bg-default-100">
                    <Briefcase size={48} className="text-default-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-default-900">No jobs found</h3>
                    <p className="text-default-500 mt-2 text-lg">Your search didn't match any job postings.</p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <Card key={job._id} className="group border border-divider hover:border-primary/50 hover:shadow-xl transition-all duration-500 overflow-hidden bg-default-50/20 backdrop-blur-sm">
                    <CardHeader className="flex justify-between items-start p-6 pb-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                            <Briefcase size={20} />
                          </div>
                          <h3 className="font-black text-xl text-default-900 group-hover:text-primary transition-colors duration-300 leading-tight">{job.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-default-400 uppercase tracking-widest">
                          <MapPin size={14} className="text-primary" />
                          <span>{job.location || 'Remote'}</span>
                        </div>
                      </div>
                      {isHR && (
                        <Dropdown placement="bottom-end">
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="flat" className="bg-default-100/50 hover:bg-default-200">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="Job actions" variant="flat">
                            <DropdownItem 
                              key="edit" 
                              startContent={<Pencil size={16} />}
                              onPress={() => handleEditJob(job)}
                            >
                              Edit Details
                            </DropdownItem>
                            {canDeleteJobs && (
                              <DropdownItem 
                                key="delete" 
                                className="text-danger" 
                                color="danger"
                                startContent={<Trash2 size={16} />}
                                onPress={() => openDeleteDialog(job)}
                              >
                                Delete Job
                              </DropdownItem>
                            )}
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    </CardHeader>
                    <CardBody className="px-6 py-4">
                      <div className="relative">
                        <p className="text-sm text-default-600 line-clamp-3 mb-6 leading-relaxed font-medium">
                          {job.description || 'No description available'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Chip 
                          size="sm" 
                          variant="shadow" 
                          color="primary"
                          className="font-black px-3 uppercase tracking-tighter h-7"
                        >
                          {job.type || 'Full-time'}
                        </Chip>
                        {job.salary && (
                          <Chip size="sm" variant="flat" className="bg-default-100 text-default-700 font-bold h-7 px-3">
                            {job.salary}
                          </Chip>
                        )}
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
                            className="cursor-help font-black uppercase tracking-tighter h-7 px-3"
                          >
                            {job.is_active !== false ? 'Active' : 'Inactive'}
                          </Chip>
                        </Tooltip>
                      </div>
                    </CardBody>
                    <Divider className="opacity-30" />
                    <CardFooter className="px-6 py-4 flex-col items-start gap-4 bg-default-100/10">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                              <Avatar 
                                key={i}
                                size="sm"
                                className="w-6 h-6 border-2 border-background"
                                src={`https://i.pravatar.cc/150?u=${job._id}${i}`}
                              />
                            ))}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-default-900 leading-none">{job.applicants_count || 0}</span>
                            <span className="text-[10px] font-bold text-default-400 uppercase tracking-widest">Applicants</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-default-400 uppercase tracking-widest">
                            <Clock size={12} />
                            <span>{job.created_at ? new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                          </div>
                          <span className="text-[9px] font-medium text-default-300 italic">By {job.created_by_name || 'Admin'}</span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
