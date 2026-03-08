import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CardSkeleton, StatCardSkeleton } from '../components/SkeletonLoaders';
import { formatLastUpdated } from '../utils/export';
import ReviewStepper from '../components/ReviewStepper';
import { ResumeViewer } from '../components/applications/ResumeViewer';
import { 
  Card, 
  CardBody,
  CardHeader,
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  Chip, 
  Button,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Avatar,
  Divider,
  Progress,
  Tooltip,
  Spinner,
  Tabs,
  Tab,
  Select,
  SelectItem
} from '@nextui-org/react';
import { 
  Users,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Send,
  Star,
  Clock,
  MessageSquare,
  Eye,
  RefreshCw,
  Briefcase,
  Filter,
  ArrowUpDown,
  Calendar,
  User
} from 'lucide-react';

export default function Review() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [batches, setBatches] = useState([]);
  const [completedBatches, setCompletedBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchApplications, setBatchApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedApp, setSelectedApp] = useState(null);
  const [comment, setComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  
  // Filters
  const [senderFilter, setSenderFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('latest');
  
  const { isOpen: isResumeOpen, onOpen: onResumeOpen, onOpenChange: onResumeOpenChange } = useDisclosure();
  const { isOpen: isCommentOpen, onOpen: onCommentOpen, onOpenChange: onCommentOpenChange } = useDisclosure();
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/review/batches');
      // Separate pending and completed batches
      const pending = response.data.filter(b => b.status === 'pending');
      const completed = response.data.filter(b => b.status === 'completed');
      setBatches(pending);
      setCompletedBatches(completed);
      setLastUpdated(new Date());
    } catch {
      addToast('Failed to fetch review batches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleSelectBatch = async (batch, viewOnly = false) => {
    setSelectedBatch(batch);
    setIsViewMode(viewOnly);
    setLoadingApplications(true);
    setSelectedIds(new Set());
    try {
      console.log('Fetching batch:', batch.batch_id, batch);
      const response = await api.get(`/review/batch/${batch.batch_id}/applications`);
      console.log('Batch applications response:', response.data);
      setBatchApplications(response.data.applications || []);
    } catch (error) {
      console.error('Failed to fetch batch applications:', error);
      addToast('Failed to fetch batch applications.', 'error');
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleBack = () => {
    setSelectedBatch(null);
    setBatchApplications([]);
    setSelectedIds(new Set());
    setIsViewMode(false);
  };
  
  // Get unique senders for filter dropdown
  const currentBatches = activeTab === 'pending' ? batches : completedBatches;
  const uniqueSenders = [...new Set(currentBatches.map(b => b.recruiter_name))];
  
  // Apply filters and sorting
  const getFilteredBatches = () => {
    let filtered = activeTab === 'pending' ? [...batches] : [...completedBatches];
    
    // Filter by sender
    if (senderFilter !== 'all') {
      filtered = filtered.filter(b => b.recruiter_name === senderFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  };
  
  const filteredBatches = getFilteredBatches();

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedIds(new Set(batchApplications.map(app => app._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id, isSelected) => {
    const newSet = new Set(selectedIds);
    if (isSelected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const isAllSelected = batchApplications.length > 0 && batchApplications.every(app => selectedIds.has(app._id));

  const handleCompleteReviewClick = () => {
    // If no candidates selected, show confirmation dialog
    if (selectedIds.size === 0) {
      onConfirmOpen();
      return;
    }
    // Otherwise proceed directly
    handleCompleteReview();
  };

  const handleCompleteReview = async () => {
    setSubmitting(true);
    try {
      await api.post('/review/complete', {
        batch_id: selectedBatch.batch_id,
        approved_ids: Array.from(selectedIds)
      });
      if (selectedIds.size === 0) {
        addToast(`Review completed. No candidates were selected.`, 'info');
      } else {
        addToast(`Review completed. ${selectedIds.size} approved, ${batchApplications.length - selectedIds.size} not selected.`, 'success');
      }
      onConfirmOpenChange(false);
      handleBack();
      fetchBatches();
    } catch {
      addToast('Failed to complete review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResume = (app) => {
    setSelectedApp(app);
    onResumeOpen();
  };

  const handleOpenComment = (app) => {
    setSelectedApp(app);
    setComment('');
    onCommentOpen();
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      addToast('Please enter a comment', 'warning');
      return;
    }

    setAddingComment(true);
    try {
      await api.post(`/review/applications/${selectedApp._id}/comment`, {
        text: comment
      });
      addToast('Comment added successfully', 'success');
      // Refresh applications
      const response = await api.get(`/review/batch/${selectedBatch.batch_id}/applications`);
      setBatchApplications(response.data.applications || []);
      onCommentOpenChange(false);
    } catch {
      addToast('Failed to add comment', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Review Queue</h1>
            <p className="text-default-600">Loading review batches...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  // Batch List View
  if (!selectedBatch) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="flex flex-col gap-6">
          {/* Page Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-default-900">Review Candidates</h1>
              <p className="text-default-600">Review candidate profiles submitted by recruiters</p>
              {lastUpdated && (
                <p className="text-xs text-default-400">Last updated: {formatLastUpdated(lastUpdated)}</p>
              )}
            </div>
            <Tooltip content="Refresh">
              <Button isIconOnly variant="flat" onPress={fetchBatches}>
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
          </div>

          {/* Tabs */}
          <Tabs 
            selectedKey={activeTab} 
            onSelectionChange={setActiveTab}
            color="primary"
            variant="solid"
          >
            <Tab 
              key="pending" 
              title={
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>Pending Reviews</span>
                  {batches.length > 0 && (
                    <Chip size="sm" color="warning" variant="flat">{batches.length}</Chip>
                  )}
                </div>
              }
            />
            <Tab 
              key="completed" 
              title={
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>Completed Reviews</span>
                  {completedBatches.length > 0 && (
                    <Chip size="sm" color="success" variant="flat">{completedBatches.length}</Chip>
                  )}
                </div>
              }
            />
          </Tabs>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-default-500" />
              <span className="text-sm text-default-600">Filters:</span>
            </div>
            <Select
              label="Sender"
              placeholder="All Senders"
              selectedKeys={[senderFilter]}
              onSelectionChange={(keys) => setSenderFilter(Array.from(keys)[0] || 'all')}
              className="w-48"
              size="sm"
              startContent={<User size={14} className="text-default-400" />}
            >
              <SelectItem key="all">All Senders</SelectItem>
              {uniqueSenders.map((sender) => (
                <SelectItem key={sender}>{sender}</SelectItem>
              ))}
            </Select>
            <Select
              label="Sort By"
              placeholder="Sort"
              selectedKeys={[sortOrder]}
              onSelectionChange={(keys) => setSortOrder(Array.from(keys)[0] || 'latest')}
              className="w-40"
              size="sm"
              startContent={<ArrowUpDown size={14} className="text-default-400" />}
            >
              <SelectItem key="latest">Latest First</SelectItem>
              <SelectItem key="oldest">Oldest First</SelectItem>
            </Select>
          </div>

          {/* Batches Grid */}
          {filteredBatches.length === 0 ? (
            <Card className="p-12 border border-divider">
              <CardBody className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100">
                  <Users className="h-8 w-8 text-default-400" />
                </div>
                <h3 className="text-lg font-semibold text-default-900">
                  {activeTab === 'pending' ? 'No pending reviews' : 'No completed reviews'}
                </h3>
                <p className="text-sm text-default-500 text-center">
                  {activeTab === 'pending' 
                    ? 'When recruiters send candidates for review, they will appear here.'
                    : 'Completed review batches will appear here.'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBatches.map((batch) => (
                <Card 
                  key={batch._id} 
                  className="border border-divider cursor-pointer hover:border-primary transition-colors"
                  isPressable
                  onPress={() => handleSelectBatch(batch, activeTab === 'completed')}
                >
                  <CardHeader className="flex gap-3">
                    <Avatar 
                      name={batch.recruiter_name?.charAt(0).toUpperCase() || 'R'}
                      color={activeTab === 'pending' ? 'primary' : 'success'}
                      size="md"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-md font-semibold">{batch.recruiter_name}</p>
                        <Chip 
                          size="sm" 
                          color={batch.is_resubmission ? 'warning' : activeTab === 'completed' ? 'success' : 'primary'} 
                          variant="flat"
                        >
                          {batch.is_resubmission ? 'Resubmission' : activeTab === 'completed' ? 'Completed' : 'New'}
                        </Chip>
                      </div>
                      <div className="flex items-center gap-1 text-small text-default-500">
                        <Calendar size={12} />
                        <span>
                          {new Date(batch.created_at).toLocaleDateString()} at {new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody className="gap-3">
                    {/* Job Roles */}
                    {batch.job_titles && batch.job_titles.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Briefcase size={14} className="text-default-500" />
                        {batch.job_titles.slice(0, 2).map((title, idx) => (
                          <Chip key={idx} size="sm" variant="flat" color="secondary" className="text-xs">
                            {title}
                          </Chip>
                        ))}
                        {batch.job_titles.length > 2 && (
                          <Chip size="sm" variant="flat" color="default" className="text-xs">
                            +{batch.job_titles.length - 2} more
                          </Chip>
                        )}
                      </div>
                    )}
                    
                    {/* Candidate Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-default-500" />
                        <span className="text-default-700">{batch.candidate_count} Candidate(s)</span>
                      </div>
                    </div>
                    
                    {/* Completed batch stats */}
                    {activeTab === 'completed' && (
                      <div className="flex items-center gap-3">
                        <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle size={12} />}>
                          {batch.approved_count || 0} Approved
                        </Chip>
                        <Chip size="sm" color="danger" variant="flat" startContent={<XCircle size={12} />}>
                          {batch.not_selected_count || 0} Rejected
                        </Chip>
                      </div>
                    )}
                    
                    {/* Completed by info */}
                    {activeTab === 'completed' && batch.completed_by_name && (
                      <div className="text-xs text-default-500">
                        Reviewed by: <span className="font-medium">{batch.completed_by_name}</span>
                      </div>
                    )}
                    
                    <div className="text-center text-sm text-primary font-medium mt-2">
                      {activeTab === 'pending' ? 'Click to Review Candidates' : 'Click to View Details'}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // Batch Applications View
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button 
            isIconOnly 
            variant="light" 
            onPress={handleBack}
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-default-900">
                {isViewMode ? 'Completed Review' : 'Review'} from {selectedBatch.recruiter_name}
              </h1>
              {isViewMode && (
                <Chip color="success" variant="flat" startContent={<CheckCircle size={14} />}>
                  Completed
                </Chip>
              )}
            </div>
            <p className="text-default-600">
              {selectedBatch.candidate_count} candidates • Submitted {new Date(selectedBatch.created_at).toLocaleDateString()}
              {isViewMode && selectedBatch.completed_at && (
                <span> • Reviewed {new Date(selectedBatch.completed_at).toLocaleDateString()}</span>
              )}
            </p>
            {isViewMode && selectedBatch.completed_by_name && (
              <p className="text-sm text-default-500">
                Reviewed by: <span className="font-medium">{selectedBatch.completed_by_name}</span>
              </p>
            )}
          </div>
        </div>

        {/* View Mode Summary */}
        {isViewMode && (
          <div className="flex items-center gap-4">
            <Chip size="lg" color="success" variant="flat" startContent={<CheckCircle size={16} />}>
              {selectedBatch.approved_count || 0} Approved
            </Chip>
            <Chip size="lg" color="danger" variant="flat" startContent={<XCircle size={16} />}>
              {selectedBatch.not_selected_count || 0} Not Selected
            </Chip>
          </div>
        )}

        {/* Actions Bar - Only show in edit mode */}
        {!isViewMode && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Chip color="success" variant="flat">
                  {selectedIds.size} selected for approval
                </Chip>
              )}
              {batchApplications.length - selectedIds.size > 0 && selectedIds.size > 0 && (
                <Chip color="danger" variant="flat">
                  {batchApplications.length - selectedIds.size} will not be selected
                </Chip>
              )}
            </div>
            <Button
              color="primary"
              startContent={<CheckCircle size={16} />}
              isLoading={submitting}
              onPress={handleCompleteReviewClick}
            >
              Complete Review
            </Button>
          </div>
        )}

        {/* Applications Table */}
        {loadingApplications ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" label="Loading candidates..." />
          </div>
        ) : (
          <Card className="border border-divider">
            <Table aria-label="Review candidates table" removeWrapper>
              <TableHeader>
                <TableColumn width={80}>
                  {isViewMode ? 'STATUS' : (
                    <Checkbox
                      isSelected={isAllSelected}
                      onValueChange={handleSelectAll}
                      aria-label="Select all"
                      color="success"
                    />
                  )}
                </TableColumn>
                <TableColumn>CANDIDATE</TableColumn>
                <TableColumn>JOB</TableColumn>
                <TableColumn>SCORE</TableColumn>
                <TableColumn>SKILLS</TableColumn>
                <TableColumn>COMMENTS</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody 
                emptyContent={
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100 mb-4">
                      <FileText className="h-8 w-8 text-default-400" />
                    </div>
                    <p className="font-medium text-default-900">No candidates found</p>
                  </div>
                }
              >
                {batchApplications.map((app) => {
                  const isApproved = isViewMode && (selectedBatch.approved_application_ids || []).includes(app._id);
                  const isRejected = isViewMode && (selectedBatch.not_selected_application_ids || []).includes(app._id);
                  return (
                  <TableRow key={app._id} className={!isViewMode && selectedIds.has(app._id) ? 'bg-success-50' : isApproved ? 'bg-success-50' : isRejected ? 'bg-danger-50' : ''}>
                    <TableCell>
                      {isViewMode ? (
                        isApproved ? (
                          <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle size={12} />}>
                            Approved
                          </Chip>
                        ) : (
                          <Chip size="sm" color="danger" variant="flat" startContent={<XCircle size={12} />}>
                            Rejected
                          </Chip>
                        )
                      ) : (
                        <Checkbox
                          isSelected={selectedIds.has(app._id)}
                          onValueChange={(isSelected) => handleSelectOne(app._id, isSelected)}
                          aria-label={`Select ${app.candidate_name_extracted}`}
                          color="success"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-default-900">{app.candidate_name_extracted || 'Unknown'}</p>
                        <p className="text-xs text-default-500">{app.candidate_email || 'No email'}</p>
                        {app.candidate_phone && (
                          <p className="text-xs text-default-400">{app.candidate_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-900 font-medium">{app.job_title || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 w-24">
                        <div className="flex items-center gap-2">
                          <Star size={14} className={app.final_score >= 80 ? 'text-success fill-success' : app.final_score >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                          <span className={`font-semibold ${
                            app.final_score >= 80 ? 'text-success' : 
                            app.final_score >= 60 ? 'text-warning' : 'text-danger'
                          }`}>
                            {app.final_score?.toFixed(0) || 0}%
                          </span>
                        </div>
                        <Progress 
                          size="sm" 
                          value={app.final_score || 0} 
                          color={app.final_score >= 80 ? 'success' : app.final_score >= 60 ? 'warning' : 'danger'}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-48">
                        {(app.matched_skills || []).slice(0, 3).map((skill, idx) => (
                          <Chip key={idx} size="sm" variant="flat" color="success" className="text-xs">
                            {skill}
                          </Chip>
                        ))}
                        {(app.matched_skills || []).length > 3 && (
                          <Chip size="sm" variant="flat" color="default" className="text-xs">
                            +{app.matched_skills.length - 3}
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-default-400" />
                        <span className="text-sm text-default-600">{(app.comments || []).length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="flat" 
                          color="primary"
                          startContent={<Eye size={14} />}
                          onPress={() => handleViewResume(app)}
                        >
                          Resume
                        </Button>
                        {!isViewMode && (
                          <Button 
                            size="sm" 
                            variant="flat" 
                            color="secondary"
                            startContent={<MessageSquare size={14} />}
                            onPress={() => handleOpenComment(app)}
                          >
                            Comment
                          </Button>
                        )}
                        {isViewMode && (app.comments || []).length > 0 && (
                          <Tooltip content="View comments">
                            <Button 
                              size="sm" 
                              variant="flat" 
                              color="secondary"
                              startContent={<MessageSquare size={14} />}
                              onPress={() => handleOpenComment(app)}
                            >
                              {(app.comments || []).length}
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Resume Modal */}
      <Modal isOpen={isResumeOpen} onOpenChange={onResumeOpenChange} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{selectedApp?.candidate_name_extracted || 'Candidate'} - Resume</h2>
              </ModalHeader>
              <ModalBody className="p-0">
                <div className="h-[70vh]">
                  <ResumeViewer application={selectedApp} />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Close</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Comment Modal */}
      <Modal isOpen={isCommentOpen} onOpenChange={onCommentOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{isViewMode ? 'View Comments' : 'Add Comment'}</h2>
                <p className="text-sm text-default-500">{isViewMode ? 'Comments for' : 'Comment on'} {selectedApp?.candidate_name_extracted || 'candidate'}</p>
              </ModalHeader>
              <ModalBody>
                {/* Existing Comments */}
                {selectedApp?.comments && selectedApp.comments.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {!isViewMode && <p className="text-sm font-medium text-default-700">Previous Comments:</p>}
                    {selectedApp.comments.map((c, idx) => (
                      <Card key={idx} className="p-3 border border-divider">
                        <div className="flex items-start gap-3">
                          <Avatar 
                            name={c.user_name?.charAt(0).toUpperCase() || 'U'}
                            size="sm"
                            color={c.user_role === 'team_lead' ? 'primary' : 'secondary'}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{c.user_name}</span>
                              <Chip size="sm" variant="flat" color={c.user_role === 'team_lead' ? 'primary' : 'secondary'}>
                                {c.user_role === 'team_lead' ? 'Team Lead' : 'Recruiter'}
                              </Chip>
                            </div>
                            <p className="text-sm text-default-600 mt-1">{c.text}</p>
                            <p className="text-xs text-default-400 mt-1">
                              {new Date(c.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  isViewMode && (
                    <div className="text-center py-8 text-default-500">
                      No comments for this candidate.
                    </div>
                  )
                )}
                
                {!isViewMode && (
                  <Textarea
                    label="Your Comment"
                    placeholder="Add your feedback or notes about this candidate..."
                    value={comment}
                    onValueChange={setComment}
                    minRows={3}
                  />
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>{isViewMode ? 'Close' : 'Cancel'}</Button>
                {!isViewMode && (
                  <Button 
                    color="primary" 
                    onPress={handleAddComment}
                    isLoading={addingComment}
                  >
                    Add Comment
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Confirmation Modal for No Selection */}
      <Modal isOpen={isConfirmOpen} onOpenChange={onConfirmOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-warning">
                  <XCircle size={24} />
                  <span>No Candidates Selected</span>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-default-700">
                  You have not selected any candidate for approval. This will mark <strong>all {batchApplications.length} candidate(s)</strong> as "Not Selected".
                </p>
                <p className="text-default-500 text-sm mt-2">
                  The recruiter will be notified that no candidates were approved from this batch.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button 
                  color="danger" 
                  onPress={handleCompleteReview}
                  isLoading={submitting}
                  startContent={<XCircle size={16} />}
                >
                  Mark All as Not Selected
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
