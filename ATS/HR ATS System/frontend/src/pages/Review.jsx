import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
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
  Spinner,
  Textarea,
  Avatar,
  Divider,
  Progress,
  Tooltip
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
  Eye
} from 'lucide-react';

export default function Review() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchApplications, setBatchApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedApp, setSelectedApp] = useState(null);
  const [comment, setComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  
  const { isOpen: isResumeOpen, onOpen: onResumeOpen, onOpenChange: onResumeOpenChange } = useDisclosure();
  const { isOpen: isCommentOpen, onOpen: onCommentOpen, onOpenChange: onCommentOpenChange } = useDisclosure();
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/review/batches');
      // Filter only pending batches
      const pendingBatches = response.data.filter(b => b.status === 'pending');
      setBatches(pendingBatches);
    } catch (error) {
      addToast('Failed to fetch review batches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleSelectBatch = async (batch) => {
    setSelectedBatch(batch);
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
  };

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
    } catch (error) {
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
    } catch (error) {
      addToast('Failed to add comment', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" label="Loading review batches..." />
        </div>
      </AppShell>
    );
  }

  // Batch List View
  if (!selectedBatch) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Review Candidates</h1>
            <p className="text-default-600">Review candidate profiles submitted by recruiters</p>
          </div>

          {/* Batches Grid */}
          {batches.length === 0 ? (
            <Card className="p-12 border border-divider">
              <CardBody className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100">
                  <Users className="h-8 w-8 text-default-400" />
                </div>
                <h3 className="text-lg font-semibold text-default-900">No pending reviews</h3>
                <p className="text-sm text-default-500 text-center">
                  When recruiters send candidates for review, they will appear here.
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {batches.map((batch) => (
                <Card 
                  key={batch._id} 
                  className="border border-divider cursor-pointer hover:border-primary transition-colors"
                  isPressable
                  onPress={() => handleSelectBatch(batch)}
                >
                  <CardHeader className="flex gap-3">
                    <Avatar 
                      name={batch.recruiter_name?.charAt(0).toUpperCase() || 'R'}
                      color="primary"
                      size="md"
                    />
                    <div className="flex flex-col">
                      <p className="text-md font-semibold">{batch.recruiter_name}</p>
                      <p className="text-small text-default-500">
                        {new Date(batch.created_at).toLocaleDateString()} at {new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody className="gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-default-500" />
                        <span className="text-default-700">{batch.candidate_count} Candidate(s)</span>
                      </div>
                      <Chip 
                        size="sm" 
                        color={batch.is_resubmission ? 'warning' : 'primary'} 
                        variant="flat"
                      >
                        {batch.is_resubmission ? 'Resubmission' : 'New'}
                      </Chip>
                    </div>
                    <Button color="primary" variant="flat" className="w-full">
                      Review Candidates
                    </Button>
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-default-900">
              Review from {selectedBatch.recruiter_name}
            </h1>
            <p className="text-default-600">
              {selectedBatch.candidate_count} candidates • Submitted {new Date(selectedBatch.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
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

        {/* Applications Table */}
        {loadingApplications ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" label="Loading candidates..." />
          </div>
        ) : (
          <Card className="border border-divider">
            <Table aria-label="Review candidates table" removeWrapper>
              <TableHeader>
                <TableColumn width={50}>
                  <Checkbox
                    isSelected={isAllSelected}
                    onValueChange={handleSelectAll}
                    aria-label="Select all"
                    color="success"
                  />
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
                {batchApplications.map((app) => (
                  <TableRow key={app._id} className={selectedIds.has(app._id) ? 'bg-success-50' : ''}>
                    <TableCell>
                      <Checkbox
                        isSelected={selectedIds.has(app._id)}
                        onValueChange={(isSelected) => handleSelectOne(app._id, isSelected)}
                        aria-label={`Select ${app.candidate_name_extracted}`}
                        color="success"
                      />
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
                        <Button 
                          size="sm" 
                          variant="flat" 
                          color="secondary"
                          startContent={<MessageSquare size={14} />}
                          onPress={() => handleOpenComment(app)}
                        >
                          Comment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                <h2 className="text-lg font-bold">Add Comment</h2>
                <p className="text-sm text-default-500">Comment on {selectedApp?.candidate_name_extracted || 'candidate'}</p>
              </ModalHeader>
              <ModalBody>
                {/* Existing Comments */}
                {selectedApp?.comments && selectedApp.comments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <p className="text-sm font-medium text-default-700">Previous Comments:</p>
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
                )}
                
                <Textarea
                  label="Your Comment"
                  placeholder="Add your feedback or notes about this candidate..."
                  value={comment}
                  onValueChange={setComment}
                  minRows={3}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button 
                  color="primary" 
                  onPress={handleAddComment}
                  isLoading={addingComment}
                >
                  Add Comment
                </Button>
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
