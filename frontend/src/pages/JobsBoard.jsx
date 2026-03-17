import { useState, useEffect, useCallback } from 'react';
import api, { getTeamLeads, getRecruiters, toggleJobActive, assignTeamLeadToJob, assignRecruitersToJob } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { formatLastUpdated } from '../utils/export';
import { 
  Card, 
  CardBody,
  CardHeader,
  Input, 
  Button,
  Chip,
  Switch,
  Select,
  SelectItem,
  Tooltip,
  Divider,
  User,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  CheckboxGroup,
  Checkbox,
  Skeleton
} from '@nextui-org/react';
import { 
  LayoutGrid, 
  Search, 
  RefreshCw,
  Briefcase,
  UserCog,
  Users,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  MapPin,
  Clock
} from 'lucide-react';

const JobsBoard = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedRecruiters, setSelectedRecruiters] = useState([]);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, teamLeadsRes, recruitersRes, usersRes] = await Promise.all([
        api.get('/jobs/'),
        getTeamLeads(),
        getRecruiters(),
        api.get('/users/')
      ]);
      setJobs(jobsRes.data.items || jobsRes.data);
      setTeamLeads(teamLeadsRes.data);
      setRecruiters(recruitersRes.data);
      setUsers(usersRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('Failed to fetch jobs data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'team_lead') {
      fetchData();
    }
  }, [fetchData, currentUser?.role]);

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
    onOpen();
  };

  const handleAssignRecruiters = async () => {
    if (!selectedJob) return;
    
    try {
      await assignRecruitersToJob(selectedJob._id, selectedRecruiters);
      setJobs(prev => prev.map(j => 
        j._id === selectedJob._id ? { ...j, assigned_recruiter_ids: selectedRecruiters } : j
      ));
      addToast('Recruiters assigned.', 'success');
      onClose();
    } catch (error) {
      console.error('Error assigning recruiters:', error);
      addToast('Failed to assign recruiters.', 'error');
    }
  };

  const getUserById = (userId) => {
    return users.find(u => u._id === userId);
  };

  const filteredJobs = jobs.filter(j => 
    j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split jobs by creator type
  const adminJobs = filteredJobs.filter(j => {
    const creator = getUserById(j.created_by);
    return !creator || creator.role === 'admin' || j.created_by === 'admin-static';
  });

  const teamLeadJobs = filteredJobs.filter(j => {
    const creator = getUserById(j.created_by);
    return creator && creator.role === 'team_lead';
  });

  const breadcrumbItems = [
    { label: 'Dashboard', href: currentUser?.role === 'admin' ? '/admin-dashboard' : '/hr-dashboard' },
    { label: 'Jobs Board' }
  ];

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'team_lead') {
    return (
      <AppShell>
        <div className="p-6">
          <Card>
            <CardBody className="text-center py-8">
              <ShieldAlert className="mx-auto mb-4 text-danger" size={48} />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-default-500 mt-2">Only administrators and team leads can access this page.</p>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  const JobCard = ({ job }) => {
    const creator = getUserById(job.created_by);
    const assignedTeamLead = teamLeads.find(tl => tl.id === job.assigned_team_lead_id);
    const assignedRecruiterCount = job.assigned_recruiter_ids?.length || 0;
    const isActive = job.is_active !== false;

    return (
      <Card className={`mb-3 ${!isActive ? 'opacity-60' : ''}`}>
        <CardBody className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm">{job.title}</h4>
            {hasPermission('can_activate_jobs') && (
              <Switch 
                size="sm" 
                isSelected={isActive}
                onValueChange={() => handleToggleActive(job._id, isActive)}
              />
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
              Created by: {creator?.name || creator?.email || 'Admin'}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutGrid className="text-primary" />
              Jobs Board
            </h1>
            <p className="text-default-500 mt-1">
              Manage job assignments and activation status
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-sm text-default-400">
                {formatLastUpdated(lastUpdated)}
              </span>
            )}
            <Tooltip content="Refresh">
              <Button isIconOnly variant="light" onPress={fetchData} isLoading={loading}>
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search jobs by title or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<Search size={18} className="text-default-400" />}
          className="max-w-md"
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="w-32 h-6 rounded" />
              </CardHeader>
              <CardBody>
                <Skeleton className="w-full h-32 rounded mb-3" />
                <Skeleton className="w-full h-32 rounded mb-3" />
                <Skeleton className="w-full h-32 rounded" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="w-32 h-6 rounded" />
              </CardHeader>
              <CardBody>
                <Skeleton className="w-full h-32 rounded mb-3" />
                <Skeleton className="w-full h-32 rounded mb-3" />
              </CardBody>
            </Card>
          </div>
        ) : (
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
                  adminJobs.map(job => <JobCard key={job._id} job={job} />)
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
                  teamLeadJobs.map(job => <JobCard key={job._id} job={job} />)
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Recruiter Assignment Modal */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
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
      </div>
    </AppShell>
  );
};

export default JobsBoard;
