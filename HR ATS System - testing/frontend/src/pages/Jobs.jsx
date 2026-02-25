import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
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
  Spinner
} from '@nextui-org/react';
import { 
  Briefcase, 
  MapPin, 
  Plus, 
  Search,
  Pencil,
  MoreVertical,
  Trash2,
  Users
} from 'lucide-react';

export default function Jobs() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState(null);
  
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
    } catch (error) {
      addToast('Failed to save job.', 'error');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      addToast('Job deleted successfully!', 'success');
      fetchJobs();
    } catch (error) {
      addToast('Failed to delete job.', 'error');
    }
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

  const filteredJobs = jobs.filter(job => {
    const query = searchQuery.toLowerCase();
    return job.title?.toLowerCase().includes(query) ||
           job.location?.toLowerCase().includes(query) ||
           job.description?.toLowerCase().includes(query);
  });

  const isHR = user?.role === 'hr' || user?.role === 'admin';

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" label="Loading jobs..." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Job Openings</h1>
            <p className="text-default-600">Manage your open positions and job postings.</p>
          </div>
          {isHR && (
            <Button 
              color="primary" 
              startContent={<Plus size={18} />}
              onPress={() => { resetForm(); onOpen(); }}
            >
              Post New Job
            </Button>
          )}
        </div>

        {/* Search */}
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

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <Card className="p-12 text-center">
            <CardBody className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100">
                <Briefcase className="h-8 w-8 text-default-400" />
              </div>
              <h3 className="text-lg font-semibold text-default-900">No jobs found</h3>
              <p className="text-sm text-default-500">Get started by creating your first job posting.</p>
              {isHR && (
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
                        <DropdownItem 
                          key="delete" 
                          className="text-danger" 
                          color="danger"
                          startContent={<Trash2 size={16} />}
                          onPress={() => handleDeleteJob(job._id)}
                        >
                          Delete
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  )}
                </CardHeader>
                <CardBody className="py-3">
                  <p className="text-sm text-default-600 line-clamp-2">{job.description || 'No description available'}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Chip size="sm" variant="flat" color="primary">{job.type || 'Full-time'}</Chip>
                    {job.salary && <Chip size="sm" variant="flat">{job.salary}</Chip>}
                  </div>
                </CardBody>
                <CardFooter className="border-t border-divider pt-3">
                  <div className="flex items-center gap-2 text-sm text-default-500">
                    <Users size={14} />
                    <span>{job.applicants_count || 0} applicants</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
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
    </AppShell>
  );
}
