import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
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
  CardFooter,
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
  const { subscribe, isConnected } = useSocket();
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

  // Subscribe to real-time batch events
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to new batch created events
    const unsubscribeBatchCreated = subscribe('batch:created', (data) => {
      console.log('[Socket] New batch created:', data);
      addToast('New review batch received!', 'info');
      // Add new batch to the pending list
      setBatches(prev => [{
        ...data,
        _id: Date.now().toString() // Temporary ID
      }, ...prev]);
      setLastUpdated(new Date());
    });

    // Subscribe to batch completed events
    const unsubscribeBatchCompleted = subscribe('batch:completed', (data) => {
      console.log('[Socket] Batch completed:', data);
      addToast(`Review batch completed by ${data.completed_by_name}`, 'success');
      // Refresh the batches to get updated list
      fetchBatches();
    });

    return () => {
      unsubscribeBatchCreated();
      unsubscribeBatchCompleted();
    };
  }, [isConnected, subscribe, addToast, fetchBatches]);

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
        <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Review Candidates</h1>
              <p className="text-default-500 text-lg">Manage and evaluate candidate profiles submitted by recruiters</p>
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
                  onPress={fetchBatches}
                  className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
                >
                  <RefreshCw size={18} />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Main Controls Card */}
          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/30 p-1">
            <CardBody className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
              <Tabs 
                selectedKey={activeTab} 
                onSelectionChange={setActiveTab}
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
                  key="pending" 
                  title={
                    <div className="flex items-center gap-2.5">
                      <Clock size={18} />
                      <span>Pending Reviews</span>
                      {batches.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 group-data-[selected=true]:bg-white/20 px-1.5 text-[10px] font-bold group-data-[selected=true]:text-white text-primary">
                          {batches.length}
                        </span>
                      )}
                    </div>
                  }
                />
                <Tab 
                  key="completed" 
                  title={
                    <div className="flex items-center gap-2.5">
                      <CheckCircle size={18} />
                      <span>Completed History</span>
                      {completedBatches.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-success/20 group-data-[selected=true]:bg-white/20 px-1.5 text-[10px] font-bold group-data-[selected=true]:text-white text-success">
                          {completedBatches.length}
                        </span>
                      )}
                    </div>
                  }
                />
              </Tabs>

              <div className="flex flex-wrap items-center gap-3 pr-2">
                <div className="flex items-center gap-2 text-default-500 dark:text-default-400 mr-2">
                  <Filter size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Refine View</span>
                </div>
                <Select
                  placeholder="All Senders"
                  selectedKeys={[senderFilter]}
                  onSelectionChange={(keys) => setSenderFilter(Array.from(keys)[0] || 'all')}
                  className="w-44"
                  size="sm"
                  variant="flat"
                  startContent={<User size={14} className="text-default-400" />}
                  classNames={{
                    trigger: "bg-default-100 dark:bg-default-100"
                  }}
                >
                  <SelectItem key="all">All Senders</SelectItem>
                  {uniqueSenders.map((sender) => (
                    <SelectItem key={sender}>{sender}</SelectItem>
                  ))}
                </Select>
                <Select
                  placeholder="Sort By"
                  selectedKeys={[sortOrder]}
                  onSelectionChange={(keys) => setSortOrder(Array.from(keys)[0] || 'latest')}
                  className="w-40"
                  size="sm"
                  variant="flat"
                  startContent={<ArrowUpDown size={14} className="text-default-400" />}
                  classNames={{
                    trigger: "bg-default-100 dark:bg-default-100"
                  }}
                >
                  <SelectItem key="latest">Latest First</SelectItem>
                  <SelectItem key="oldest">Oldest First</SelectItem>
                </Select>
              </div>
            </CardBody>
          </Card>

          {/* Batches Grid */}
          {filteredBatches.length === 0 ? (
            <Card className="p-12 border border-divider shadow-sm bg-content1 dark:bg-default-50/50">
              <CardBody className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-default-100 dark:bg-default-100/50 text-default-400">
                  <Users className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-default-900">
                    {activeTab === 'pending' ? 'No pending reviews' : 'No completed reviews'}
                  </h3>
                  <p className="text-default-500 max-w-md mt-2">
                    {activeTab === 'pending' 
                      ? 'Great job! Your review queue is currently empty. New submissions from recruiters will appear here.'
                      : 'You haven\'t completed any review batches yet.'}
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBatches.map((batch) => (
                <Card 
                  key={batch._id} 
                  className="group border border-divider hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-content1 dark:bg-default-50/20"
                  isPressable
                  onPress={() => handleSelectBatch(batch, activeTab === 'completed')}
                >
                  <CardHeader className="flex flex-col items-start gap-3 pb-2">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          name={batch.recruiter_name?.charAt(0).toUpperCase() || 'R'}
                          color={activeTab === 'pending' ? 'primary' : 'success'}
                          isBordered
                          className="w-10 h-10"
                        />
                        <div>
                          <p className="text-sm font-bold text-default-900 leading-tight">{batch.recruiter_name}</p>
                          <p className="text-xs text-default-500">Recruiter</p>
                        </div>
                      </div>
                      <Chip 
                        size="sm" 
                        color={batch.is_resubmission ? 'warning' : activeTab === 'completed' ? 'success' : 'primary'} 
                        variant="flat"
                        className="font-medium"
                        startContent={batch.is_resubmission ? <RefreshCw size={12} /> : null}
                      >
                        {batch.is_resubmission ? 'Resubmission' : activeTab === 'completed' ? 'Completed' : 'New'}
                      </Chip>
                    </div>
                  </CardHeader>
                  
                  <CardBody className="py-4 flex flex-col gap-4">
                    {/* Job Roles Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-default-500 dark:text-default-400 uppercase tracking-wider">
                        <Briefcase size={12} />
                        <span>Job Roles</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {batch.job_titles && batch.job_titles.length > 0 ? (
                          <>
                            {batch.job_titles.slice(0, 3).map((title, idx) => (
                              <Chip 
                                key={idx} 
                                size="sm" 
                                variant="flat" 
                                color="secondary" 
                                className="bg-secondary-50 dark:bg-secondary-50 text-secondary-600 border border-secondary-100"
                              >
                                {title}
                              </Chip>
                            ))}
                            {batch.job_titles.length > 3 && (
                              <Chip size="sm" variant="flat" color="default" className="bg-default-100">
                                +{batch.job_titles.length - 3}
                              </Chip>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-default-400 italic">No roles specified</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stats & Info */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-default-50 dark:bg-default-50/50 border border-default-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-default-400 uppercase">Candidates</span>
                        <div className="flex items-center gap-1.5">
                          <Users size={16} className="text-primary" />
                          <span className="text-sm font-bold text-default-700">{batch.candidate_count}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-default-400 uppercase">Submitted</span>
                        <div className="flex items-center gap-1.5 text-default-700">
                          <Calendar size={14} />
                          <span className="text-sm font-medium">
                            {new Date(batch.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Completed batch stats */}
                    {activeTab === 'completed' && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-divider">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-default-500">Review Outcome:</span>
                          <div className="flex items-center gap-2">
                            <Tooltip content="Approved">
                              <Chip size="sm" color="success" variant="flat" className="h-6 min-w-8">
                                {batch.approved_count || 0}
                              </Chip>
                            </Tooltip>
                            <Tooltip content="Rejected">
                              <Chip size="sm" color="danger" variant="flat" className="h-6 min-w-8">
                                {batch.not_selected_count || 0}
                              </Chip>
                            </Tooltip>
                          </div>
                        </div>
                        {batch.completed_by_name && (
                          <div className="flex items-center gap-1.5 text-xs text-default-400">
                            <User size={12} />
                            <span>Reviewed by {batch.completed_by_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardBody>
                  
                  <Divider className="opacity-50" />
                  
                  <CardFooter className="justify-center py-3 bg-default-50 dark:bg-default-50/30 group-hover:bg-primary-50/30 transition-colors">
                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                      {activeTab === 'pending' ? (
                        <>
                          <span>Start Review</span>
                          <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          <span>View Details</span>
                          <Eye size={14} className="group-hover:scale-110 transition-transform" />
                        </>
                      )}
                    </div>
                  </CardFooter>
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
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
        {/* Page Header with Back Button */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button 
              isIconOnly 
              variant="flat" 
              onPress={handleBack}
              className="bg-default-100 hover:bg-default-200"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-default-900">
                  {isViewMode ? 'Review Details' : 'Reviewing Batch'}
                </h1>
                {isViewMode ? (
                  <Chip color="success" variant="flat" size="sm" startContent={<CheckCircle size={14} />}>
                    Completed
                  </Chip>
                ) : (
                  <Chip color="primary" variant="flat" size="sm" className="animate-pulse">
                    Review in Progress
                  </Chip>
                )}
              </div>
              <p className="text-default-500 text-sm mt-0.5">
                From <span className="font-semibold text-default-700">{selectedBatch.recruiter_name}</span> • 
                Submitted {new Date(selectedBatch.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            </div>
          </div>

          {/* Summary Stats Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary-50/30 border-primary-100 border shadow-none">
              <CardBody className="flex flex-row items-center gap-3 py-3">
                <div className="p-2 rounded-lg bg-primary-100 text-primary">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider leading-none">Total Candidates</p>
                  <p className="text-xl font-bold text-primary-700">{batchApplications.length}</p>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-success-50/30 border-success-100 border shadow-none">
              <CardBody className="flex flex-row items-center gap-3 py-3">
                <div className="p-2 rounded-lg bg-success-100 text-success">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-success-400 uppercase tracking-wider leading-none">Approved</p>
                  <p className="text-xl font-bold text-success-700">
                    {isViewMode ? (selectedBatch.approved_count || 0) : selectedIds.size}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-danger-50/30 border-danger-100 border shadow-none">
              <CardBody className="flex flex-row items-center gap-3 py-3">
                <div className="p-2 rounded-lg bg-danger-100 text-danger">
                  <XCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-danger-400 uppercase tracking-wider leading-none">Not Selected</p>
                  <p className="text-xl font-bold text-danger-700">
                    {isViewMode ? (selectedBatch.not_selected_count || 0) : (batchApplications.length - selectedIds.size)}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-secondary-50/30 border-secondary-100 border shadow-none">
              <CardBody className="flex flex-row items-center gap-3 py-3">
                <div className="p-2 rounded-lg bg-secondary-100 text-secondary">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-wider leading-none">Job Roles</p>
                  <p className="text-xl font-bold text-secondary-700">{(selectedBatch.job_titles || []).length}</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Actions Bar - Only show in edit mode */}
        {!isViewMode && (
          <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md py-3 border-b border-divider flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold">Candidates</h2>
              <div className="h-4 w-px bg-divider mx-2" />
              <div className="flex items-center gap-2">
                <Checkbox
                  isSelected={isAllSelected}
                  onValueChange={handleSelectAll}
                  aria-label="Select all"
                  color="success"
                  className="mr-1"
                />
                <span className="text-sm font-medium text-default-600">Select All</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 ? (
                <Chip color="success" variant="flat" size="sm" className="font-bold">
                  {selectedIds.size} Selected for Approval
                </Chip>
              ) : (
                <span className="text-sm text-default-400 italic">No candidates selected</span>
              )}
              <Button
                color="primary"
                size="md"
                startContent={<CheckCircle size={18} />}
                isLoading={submitting}
                onPress={handleCompleteReviewClick}
                className="font-bold shadow-md"
              >
                Complete Review
              </Button>
            </div>
          </div>
        )}

        {/* Applications Content */}
        {loadingApplications ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" label="Fetching candidate data..." />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {batchApplications.length === 0 ? (
              <Card className="border-dashed border-2 border-divider bg-transparent">
                <CardBody className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="p-4 rounded-full bg-default-100">
                    <FileText size={32} className="text-default-400" />
                  </div>
                  <p className="text-lg font-bold text-default-600">No candidates found in this batch</p>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-4">
                {batchApplications.map((app) => {
                  const isApproved = isViewMode && (selectedBatch.approved_application_ids || []).includes(app._id);
                  const isRejected = isViewMode && (selectedBatch.not_selected_application_ids || []).includes(app._id);
                  const isSelected = !isViewMode && selectedIds.has(app._id);
                  
                  return (
                    <Card 
                      key={app._id} 
                      className={`border-l-4 transition-all duration-200 ${
                        isSelected || isApproved ? 'border-l-success border-success-100' : 
                        isRejected ? 'border-l-danger border-danger-100' : 
                        'border-l-transparent hover:border-l-primary/30 border-divider'
                      } ${isSelected || isApproved ? 'bg-success-50/10' : ''}`}
                    >
                      <CardBody className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Selection/Status Column */}
                          <div className="flex lg:flex-col items-center lg:justify-center gap-4">
                            {!isViewMode ? (
                              <Checkbox
                                isSelected={isSelected}
                                onValueChange={(selected) => handleSelectOne(app._id, selected)}
                                size="lg"
                                color="success"
                              />
                            ) : (
                              <div className={`p-2 rounded-full ${isApproved ? 'bg-success-100 text-success' : 'bg-danger-100 text-danger'}`}>
                                {isApproved ? <CheckCircle size={24} /> : <XCircle size={24} />}
                              </div>
                            )}
                          </div>

                          {/* Candidate Info Column */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <Avatar 
                                  name={app.candidate_name_extracted?.charAt(0) || '?'} 
                                  className="w-12 h-12 text-large bg-default-200"
                                />
                                <div className="min-w-0">
                                  <h3 className="text-lg font-bold text-default-900 truncate">
                                    {app.candidate_name_extracted || 'Unknown Candidate'}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-default-500">
                                    <span className="truncate">{app.candidate_email}</span>
                                    {app.candidate_phone && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-default-300" />
                                        <span>{app.candidate_phone}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="hidden sm:flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold text-default-400 uppercase">Target Role</span>
                                <Chip size="sm" color="secondary" variant="flat" className="bg-secondary-50">
                                  {app.job_title || 'General Application'}
                                </Chip>
                              </div>
                            </div>

                            <Divider className="my-4 opacity-50" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Score & Progress */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-default-600">Match Score</span>
                                  <span className={`font-bold ${
                                    app.final_score >= 80 ? 'text-success' : 
                                    app.final_score >= 60 ? 'text-warning' : 'text-danger'
                                  }`}>
                                    {app.final_score?.toFixed(0) || 0}%
                                  </span>
                                </div>
                                <Progress 
                                  size="md" 
                                  value={app.final_score || 0} 
                                  color={app.final_score >= 80 ? 'success' : app.final_score >= 60 ? 'warning' : 'danger'}
                                  className="h-2"
                                />
                              </div>

                              {/* Skills Tags */}
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-default-400 uppercase">Matched Skills</span>
                                <div className="flex flex-wrap gap-1">
                                  {(app.matched_skills || []).slice(0, 4).map((skill, idx) => (
                                    <Chip key={idx} size="sm" variant="dot" color="success" className="h-6">
                                      {skill}
                                    </Chip>
                                  ))}
                                  {(app.matched_skills || []).length > 4 && (
                                    <Chip size="sm" variant="flat" className="h-6">
                                      +{(app.matched_skills || []).length - 4}
                                    </Chip>
                                  )}
                                  {(app.matched_skills || []).length === 0 && (
                                    <span className="text-xs text-default-400 italic">No direct matches</span>
                                  )}
                                </div>
                              </div>

                              {/* Comments Preview */}
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-default-400 uppercase">Review Feedback</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-2">
                                    {(app.comments || []).slice(0, 3).map((c, i) => (
                                      <Avatar 
                                        key={i} 
                                        size="sm" 
                                        name={c.user_name?.charAt(0)} 
                                        className="border-2 border-background w-7 h-7"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-default-600">
                                    {(app.comments || []).length > 0 
                                      ? `${(app.comments || []).length} comment${(app.comments || []).length > 1 ? 's' : ''}`
                                      : 'No comments yet'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions Column */}
                          <div className="flex flex-row lg:flex-col gap-2 justify-end lg:justify-center border-t lg:border-t-0 lg:border-l border-divider pt-4 lg:pt-0 lg:pl-6">
                            <Button 
                              size="md" 
                              variant="flat" 
                              color="primary"
                              startContent={<Eye size={18} />}
                              onPress={() => handleViewResume(app)}
                              className="font-bold flex-1 lg:flex-none"
                            >
                              Resume
                            </Button>
                            {!isViewMode ? (
                              <Button 
                                size="md" 
                                variant="flat" 
                                color="secondary"
                                startContent={<MessageSquare size={18} />}
                                onPress={() => handleOpenComment(app)}
                                className="font-bold flex-1 lg:flex-none"
                              >
                                Comment
                              </Button>
                            ) : (app.comments || []).length > 0 && (
                              <Button 
                                size="md" 
                                variant="flat" 
                                color="secondary"
                                startContent={<MessageSquare size={18} />}
                                onPress={() => handleOpenComment(app)}
                                className="font-bold flex-1 lg:flex-none"
                              >
                                View Notes
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
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
