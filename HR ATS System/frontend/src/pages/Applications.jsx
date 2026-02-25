import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { 
  Card, 
  CardBody,
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  User, 
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
  Progress,
  Spinner,
  Divider
} from '@nextui-org/react';
import { 
  FileText, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock,
  Star,
  Download
} from 'lucide-react';

const statusColorMap = {
  'Applied': 'default',
  'Under Review': 'warning',
  'Shortlisted': 'success',
  'Interview Scheduled': 'primary',
  'Selected': 'success',
  'Rejected': 'danger',
};

export default function Applications() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/applications/');
      setApplications(response.data);
    } catch (error) {
      addToast('Failed to fetch applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
      onClose();
    } catch (error) {
      addToast('Failed to update status.', 'error');
    }
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    onOpen();
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.candidate_name_extracted?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.candidate_email_extracted?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const isHR = user?.role === 'hr' || user?.role === 'admin';

  // Stats
  const stats = {
    total: applications.length,
    pending: applications.filter(a => ['Applied', 'Under Review'].includes(a.status)).length,
    shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" label="Loading applications..." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-default-900">Applications</h1>
          <p className="text-default-600">Review and manage candidate applications</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-default-900">{stats.total}</p>
            <p className="text-xs text-default-500">Total</p>
          </Card>
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-xs text-default-500">Pending</p>
          </Card>
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-success">{stats.shortlisted}</p>
            <p className="text-xs text-default-500">Shortlisted</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 border border-divider">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Input
              classNames={{
                base: "flex-1",
                inputWrapper: "bg-default-100",
              }}
              placeholder="Search candidates, emails, or jobs..."
              startContent={<Search size={18} className="text-default-400" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <Select
              className="w-48"
              selectedKeys={[filterStatus]}
              onSelectionChange={(keys) => setFilterStatus(Array.from(keys)[0])}
              aria-label="Filter by status"
            >
              <SelectItem key="all">All Status</SelectItem>
              <SelectItem key="Applied">Applied</SelectItem>
              <SelectItem key="Under Review">Under Review</SelectItem>
              <SelectItem key="Shortlisted">Shortlisted</SelectItem>
              <SelectItem key="Interview Scheduled">Interview</SelectItem>
              <SelectItem key="Selected">Selected</SelectItem>
              <SelectItem key="Rejected">Rejected</SelectItem>
            </Select>
          </div>
        </Card>

        {/* Applications Table */}
        {filteredApplications.length === 0 ? (
          <Card className="p-12 text-center border border-divider">
            <CardBody className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100">
                <FileText className="h-8 w-8 text-default-400" />
              </div>
              <h3 className="text-lg font-semibold text-default-900">No applications found</h3>
              <p className="text-sm text-default-500">Applications will appear here once candidates apply.</p>
            </CardBody>
          </Card>
        ) : (
          <Card className="border border-divider">
            <Table aria-label="Applications table" removeWrapper>
              <TableHeader>
                <TableColumn>CANDIDATE</TableColumn>
                <TableColumn>JOB</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>SCORE</TableColumn>
                <TableColumn>DATE</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app._id} className="cursor-pointer hover:bg-default-50" onClick={() => handleViewDetails(app)}>
                    <TableCell>
                      <User
                        avatarProps={{ radius: "lg", src: `https://i.pravatar.cc/150?u=${app._id}` }}
                        name={app.candidate_name_extracted || 'Unknown'}
                        description={app.candidate_email_extracted}
                        classNames={{
                          name: "text-default-900",
                          description: "text-default-500",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-default-900">{app.job_title}</span>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="sm" 
                        variant="flat" 
                        color={statusColorMap[app.status] || "default"}
                      >
                        {app.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Star size={14} className={app.match_score >= 80 ? 'text-success fill-success' : app.match_score >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                        <span className={`font-semibold ${
                          app.match_score >= 80 ? 'text-success' : 
                          app.match_score >= 60 ? 'text-warning' : 'text-danger'
                        }`}>
                          {app.match_score?.toFixed(0) || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-500 text-sm">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="flat" color="primary" onPress={() => handleViewDetails(app)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Application Details Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => selectedApp && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-4">
                  <User
                    avatarProps={{ radius: "lg", size: "lg", src: `https://i.pravatar.cc/150?u=${selectedApp._id}` }}
                    name={selectedApp.candidate_name_extracted || 'Unknown Candidate'}
                    description={selectedApp.job_title}
                    classNames={{
                      name: "text-xl font-bold text-default-900",
                      description: "text-default-600",
                    }}
                  />
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Contact Info */}
                  <Card className="border border-divider">
                    <CardBody className="gap-3">
                      <h4 className="font-semibold text-default-900">Contact Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-default-600">
                          <Mail size={14} /> {selectedApp.candidate_email_extracted || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-default-600">
                          <Phone size={14} /> {selectedApp.candidate_phone_extracted || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-default-600">
                          <MapPin size={14} /> {selectedApp.candidate_location_extracted || 'N/A'}
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Score */}
                  <Card className="border border-divider">
                    <CardBody className="gap-3">
                      <h4 className="font-semibold text-default-900">ATS Match Score</h4>
                      <div className="flex items-center gap-4">
                        <span className={`text-4xl font-bold ${
                          selectedApp.match_score >= 80 ? 'text-success' : 
                          selectedApp.match_score >= 60 ? 'text-warning' : 'text-danger'
                        }`}>
                          {selectedApp.match_score?.toFixed(0) || 0}%
                        </span>
                        <Progress 
                          value={selectedApp.match_score || 0} 
                          color={selectedApp.match_score >= 80 ? 'success' : selectedApp.match_score >= 60 ? 'warning' : 'danger'}
                          className="flex-1"
                        />
                      </div>
                    </CardBody>
                  </Card>
                </div>

                <Divider className="my-2" />

                {/* Skills */}
                {selectedApp.extracted_skills && selectedApp.extracted_skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-default-900 mb-2">Extracted Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.extracted_skills.map((skill, idx) => (
                        <Chip key={idx} size="sm" variant="flat" color="primary">{skill}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Text Preview */}
                {selectedApp.parsed_text && (
                  <div>
                    <h4 className="font-semibold text-default-900 mb-2">Resume Summary</h4>
                    <div className="bg-default-100 rounded-xl p-4 text-sm text-default-600 max-h-48 overflow-y-auto">
                      {selectedApp.parsed_text.substring(0, 1000)}...
                    </div>
                  </div>
                )}

                {/* Status Update */}
                {isHR && (
                  <div>
                    <h4 className="font-semibold text-default-900 mb-2">Update Status</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" color="success" variant="flat" startContent={<CheckCircle size={14} />}
                        onPress={() => handleUpdateStatus(selectedApp._id, 'Shortlisted')}>
                        Shortlist
                      </Button>
                      <Button size="sm" color="primary" variant="flat" startContent={<Clock size={14} />}
                        onPress={() => handleUpdateStatus(selectedApp._id, 'Interview Scheduled')}>
                        Schedule Interview
                      </Button>
                      <Button size="sm" color="danger" variant="flat" startContent={<XCircle size={14} />}
                        onPress={() => handleUpdateStatus(selectedApp._id, 'Rejected')}>
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                {selectedApp.file_path && (
                  <Button color="primary" startContent={<Download size={16} />}>
                    Download Resume
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
