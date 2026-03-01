import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { ApplicationList } from '../components/applications/ApplicationList';
import { ApplicationDetails } from '../components/applications/ApplicationDetails';
import { ResumeViewer } from '../components/applications/ResumeViewer';
import ReviewStepper from '../components/ReviewStepper';
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
  Divider,
  Switch
} from '@nextui-org/react';
import { 
  FileText, 
  Search, 
  Mail, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock,
  Star,
  Download,
  LayoutGrid,
  Table as TableIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  X,
  ChevronDown,
  ChevronRight,
  Linkedin,
  Github,
  GraduationCap,
  Target,
  AlertCircle
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
  const { isOpen: isResumeOpen, onOpen: onResumeOpen, onOpenChange: onResumeOpenChange } = useDisclosure();
  
  // Split view state
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  
  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [resumePreviewApp, setResumePreviewApp] = useState(null);
  const [showList, setShowList] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  const isRecruiter = user?.role === 'recruiter';

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isRecruiter ? '/applications/my-uploads' : '/applications/';
      const response = await api.get(endpoint);
      setApplications(response.data);
    } catch (error) {
      addToast('Failed to fetch applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, isRecruiter]);

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

  // Get selected application for split view
  const selectedApplication = applications.find(app => app._id === selectedAppId);

  // Handle split view selection
  const handleSplitViewSelect = (id) => {
    setSelectedAppId(id);
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    onOpen();
  };

  // Toggle row expansion
  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Open resume preview for table view
  const handleResumePreview = (app) => {
    setResumePreviewApp(app);
    onResumeOpen();
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.candidate_name_extracted?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.candidate_email_extracted?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const isHR = user?.role === 'team_lead' || user?.role === 'recruiter' || user?.role === 'admin';

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
        {/* <div>
          <h1 className="text-2xl font-bold tracking-tight text-default-900">
            {isRecruiter ? 'My Applications' : 'Applications'}
          </h1>
          <p className="text-default-600">
            {isRecruiter ? 'Review applications you have uploaded' : 'Review and manage candidate applications'}
          </p>
        </div> */}

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
            <div className="flex items-center gap-2 border-l border-divider pl-4">
              <TableIcon size={18} className={!isSplitView ? "text-primary" : "text-default-400"} />
              <Switch 
                isSelected={isSplitView}
                onValueChange={setIsSplitView}
                size="sm"
                aria-label="Toggle split view"
              />
              <LayoutGrid size={18} className={isSplitView ? "text-primary" : "text-default-400"} />
            </div>
          </div>
        </Card>

        {/* Applications View */}
        {isSplitView ? (
          /* Split View - 3 Column Layout */
          <div className="flex h-[calc(100vh-10rem)] w-full overflow-hidden rounded-xl border border-divider bg-background shadow-sm">
            
            {/* Column 1: Application List */}
            {showList && (
              <div className="flex w-80 flex-col border-r border-divider bg-default-50">
                <div className="flex items-center justify-between p-4 border-b border-divider">
                   <h3 className="font-semibold text-default-900">Applications</h3>
                   <Button isIconOnly size="sm" variant="light" onPress={() => setShowList(false)}>
                     <PanelLeftClose size={18} />
                   </Button>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                  <ApplicationList 
                    applications={filteredApplications} 
                    selectedId={selectedAppId} 
                    onSelect={handleSplitViewSelect} 
                  />
                </div>
              </div>
            )}
            {!showList && (
              <div className="border-r border-divider bg-default-50 p-2">
                <Button isIconOnly size="sm" variant="light" onPress={() => setShowList(true)}>
                  <PanelLeftOpen size={18} />
                </Button>
              </div>
            )}

            {/* Column 2: Application Details */}
            {showDetails && (
              <div className="flex w-96 flex-col border-r border-divider bg-default-50">
                 <div className="flex items-center justify-between p-4 border-b border-divider">
                   <h3 className="font-semibold text-default-900">Analysis</h3>
                   <Button isIconOnly size="sm" variant="light" onPress={() => setShowDetails(false)}>
                     <PanelLeftClose size={18} />
                   </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ApplicationDetails 
                    application={selectedApplication} 
                    onStatusUpdate={handleUpdateStatus}
                    isHR={isHR}
                  />
                </div>
              </div>
            )}
            {!showDetails && (
               <div className="border-r border-divider bg-default-50 p-2">
                  <Button isIconOnly size="sm" variant="light" onPress={() => setShowDetails(true)} className="rotate-180">
                     <PanelLeftOpen size={18} />
                   </Button>
               </div>
            )}

            {/* Column 3: Resume Viewer */}
            <div className="flex flex-1 flex-col bg-default-50">
              <div className="flex items-center justify-between p-4 border-b border-divider">
                 <h3 className="font-semibold text-default-900">Resume Preview</h3>
                 {selectedApplication && (
                   <Button isIconOnly size="sm" variant="light" onPress={onResumeOpen} title="Expand Resume">
                     <Maximize2 size={18} />
                   </Button>
                 )}
              </div>
              <div 
                className="flex-1 overflow-hidden p-4 cursor-pointer hover:bg-default-100 transition-colors" 
                onClick={() => selectedApplication && onResumeOpen()}
              >
                <ResumeViewer application={selectedApplication} />
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <>
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
          <Card className="border border-divider overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-default-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600 w-10"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600">Candidate</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600">Workflow</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-default-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredApplications.map((app) => (
                    <React.Fragment key={app._id}>
                      {/* Main Row */}
                      <tr className="hover:bg-default-50 transition-colors">
                        <td className="px-4 py-3">
                          <Button 
                            isIconOnly 
                            size="sm" 
                            variant="light" 
                            onPress={() => toggleRowExpansion(app._id)}
                          >
                            {expandedRows.has(app._id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-default-900">{app.candidate_name_extracted || 'Unknown'}</p>
                            <p className="text-xs text-default-500">{app.candidate_email || app.candidate_email_extracted}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-default-900">{app.job_title}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            color={statusColorMap[app.status] || "default"}
                          >
                            {app.status}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Star size={14} className={app.final_score >= 80 ? 'text-success fill-success' : app.final_score >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                            <span className={`font-semibold ${
                              app.final_score >= 80 ? 'text-success' : 
                              app.final_score >= 60 ? 'text-warning' : 'text-danger'
                            }`}>
                              {app.final_score?.toFixed(0) || app.match_score?.toFixed(0) || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ReviewStepper 
                            reviewStatus={app.review_status || 'pending'}
                            reviewedAt={app.reviewed_at}
                            sentForReviewAt={app.sent_for_review_at}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-default-500 text-sm">
                            {new Date(app.applied_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Row */}
                      {expandedRows.has(app._id) && (
                        <tr className="bg-default-50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Contact Information */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-default-900 flex items-center gap-2">
                                  <Mail size={16} className="text-primary" />
                                  Contact Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-default-600">
                                    <Mail size={14} /> {app.candidate_email || 'N/A'}
                                  </div>
                                  <div className="flex items-center gap-2 text-default-600">
                                    <Phone size={14} /> {app.candidate_phone || 'N/A'}
                                  </div>
                                  {app.candidate_linkedin && (
                                    <a href={app.candidate_linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                      <Linkedin size={14} /> LinkedIn Profile
                                    </a>
                                  )}
                                  {app.candidate_github && (
                                    <a href={app.candidate_github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                      <Github size={14} /> GitHub Profile
                                    </a>
                                  )}
                                </div>
                                
                                {/* Education */}
                                {app.candidate_education && app.candidate_education.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="font-semibold text-default-900 flex items-center gap-2 mb-2">
                                      <GraduationCap size={16} className="text-primary" />
                                      Education
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {app.candidate_education.map((edu, idx) => (
                                        <Chip key={idx} size="sm" variant="flat" color="secondary">{edu}</Chip>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Score Breakdown */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-default-900 flex items-center gap-2">
                                  <Target size={16} className="text-primary" />
                                  Score Breakdown
                                </h4>
                                {app.score_display ? (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-default-600">Skills</span>
                                      <span className="font-medium text-default-900">{app.score_display.skill}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-default-600">Experience</span>
                                      <span className="font-medium text-default-900">{app.score_display.experience}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-default-600">Education</span>
                                      <span className="font-medium text-default-900">{app.score_display.education}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-default-600">Semantic Match</span>
                                      <span className="font-medium text-default-900">{app.score_display.semantic}</span>
                                    </div>
                                    <Divider className="my-2" />
                                    <div className="flex justify-between">
                                      <span className="font-semibold text-default-900">Total Score</span>
                                      <span className={`font-bold ${
                                        app.final_score >= 80 ? 'text-success' : 
                                        app.final_score >= 60 ? 'text-warning' : 'text-danger'
                                      }`}>{app.score_display.total}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-default-500">Score breakdown not available</p>
                                )}
                              </div>
                              
                              {/* Skills */}
                              <div className="space-y-3">
                                {/* Matched Skills */}
                                {app.matched_skills && app.matched_skills.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-default-900 flex items-center gap-2 mb-2">
                                      <CheckCircle size={16} className="text-success" />
                                      Matched Skills ({app.matched_skills.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {app.matched_skills.map((skill, idx) => (
                                        <Chip key={idx} size="sm" variant="flat" color="success">{skill}</Chip>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Missing Skills */}
                                {app.missing_skills && app.missing_skills.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-default-900 flex items-center gap-2 mb-2">
                                      <AlertCircle size={16} className="text-danger" />
                                      Missing Skills ({app.missing_skills.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {app.missing_skills.map((skill, idx) => (
                                        <Chip key={idx} size="sm" variant="flat" color="danger">{skill}</Chip>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Candidate Skills */}
                                {app.candidate_skills && app.candidate_skills.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-default-900 flex items-center gap-2 mb-2">
                                      <Star size={16} className="text-primary" />
                                      All Skills ({app.candidate_skills.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {app.candidate_skills.slice(0, 8).map((skill, idx) => (
                                        <Chip key={idx} size="sm" variant="flat" color="primary">{skill}</Chip>
                                      ))}
                                      {app.candidate_skills.length > 8 && (
                                        <Chip size="sm" variant="flat">+{app.candidate_skills.length - 8} more</Chip>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions Row */}
                            <div className="mt-4 pt-4 border-t border-divider flex flex-wrap items-center justify-between gap-4">
                              <div className="flex flex-wrap gap-2">
                                {isHR && (
                                  <>
                                    <Button size="sm" color="success" variant="flat" startContent={<CheckCircle size={14} />}
                                      onPress={() => handleUpdateStatus(app._id, 'Shortlisted')}>
                                      Shortlist
                                    </Button>
                                    <Button size="sm" color="primary" variant="flat" startContent={<Clock size={14} />}
                                      onPress={() => handleUpdateStatus(app._id, 'Interview Scheduled')}>
                                      Schedule Interview
                                    </Button>
                                    <Button size="sm" color="danger" variant="flat" startContent={<XCircle size={14} />}
                                      onPress={() => handleUpdateStatus(app._id, 'Rejected')}>
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                color="secondary" 
                                variant="flat" 
                                startContent={<FileText size={14} />}
                                onPress={() => handleResumePreview(app)}
                              >
                                Preview Resume
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
          </>
        )}
      </div>

      {/* Application Details Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => selectedApp && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div>
                  <h2 className="text-xl font-bold text-default-900">{selectedApp.candidate_name_extracted || 'Unknown Candidate'}</h2>
                  <p className="text-default-600">{selectedApp.job_title}</p>
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

      {/* Resume Full Screen Modal */}
      <Modal 
        isOpen={isResumeOpen} 
        onOpenChange={onResumeOpenChange} 
        size="full"
        backdrop="blur"
        classNames={{
          backdrop: "bg-black/50 backdrop-blur-md",
          base: "bg-background",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-divider">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-primary" />
                  <span>Resume - {(resumePreviewApp || selectedApplication)?.candidate_name_extracted || 'Unknown Candidate'}</span>
                </div>
                <Button isIconOnly size="sm" variant="light" onPress={onClose}>
                  <X size={20} />
                </Button>
              </ModalHeader>
              <ModalBody className="p-0">
                <div className="h-[calc(100vh-8rem)] w-full overflow-auto p-6">
                  <ResumeViewer application={resumePreviewApp || selectedApplication} />
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
