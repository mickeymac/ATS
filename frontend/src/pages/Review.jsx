import React, { useState, useEffect, useCallback } from 'react';
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
  SelectItem,
  RadioGroup,
  Radio
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
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp
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
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [onHoldIds, setOnHoldIds] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
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
    setRejectedIds(new Set());
    setOnHoldIds(new Set());
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
    setRejectedIds(new Set());
    setOnHoldIds(new Set());
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

  const handleDecisionChange = (id, decision) => {
    if (decision === 'approve') {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setRejectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOnHoldIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else if (decision === 'reject') {
      setRejectedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOnHoldIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else if (decision === 'onhold') {
      setOnHoldIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setRejectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleExpand = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedIds(new Set(batchApplications.map(app => app._id)));
      setRejectedIds(new Set());
      setOnHoldIds(new Set());
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleRejectAll = (isRejected) => {
    if (isRejected) {
      setRejectedIds(new Set(batchApplications.map(app => app._id)));
      setSelectedIds(new Set());
      setOnHoldIds(new Set());
    } else {
      setRejectedIds(new Set());
    }
  };

  const handleOnHoldAll = (isOnHold) => {
    if (isOnHold) {
      setOnHoldIds(new Set(batchApplications.map(app => app._id)));
      setSelectedIds(new Set());
      setRejectedIds(new Set());
    } else {
      setOnHoldIds(new Set());
    }
  };

  const isAllSelected = batchApplications.length > 0 && batchApplications.every(app => selectedIds.has(app._id));
  const isAllExplicitlyRejected = batchApplications.length > 0 && batchApplications.every(app => rejectedIds.has(app._id));
  const isAllOnHold = batchApplications.length > 0 && batchApplications.every(app => onHoldIds.has(app._id));

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
        approved_ids: Array.from(selectedIds),
        on_hold_ids: Array.from(onHoldIds)
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
        <div className="flex items-center gap-4 justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button 
              isIconOnly 
              variant="light" 
              onPress={handleBack}
              className="text-default-500 hover:text-default-900"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
               <h1 className="text-2xl font-bold tracking-tight text-default-900">
                 Review from {selectedBatch.recruiter_name}
               </h1>
               <p className="text-default-500 text-sm mt-0.5">
                 {batchApplications.length} candidates • Submitted {new Date(selectedBatch.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
               </p>
            </div>
          </div>
          {!isViewMode && (
            <div className="flex items-center gap-3">
              <Button
                color="primary"
                size="md"
                startContent={<CheckCircle size={18} />}
                isLoading={submitting}
                onPress={handleCompleteReviewClick}
                className="font-bold shadow-md px-6 rounded-full"
              >
                Complete Review
              </Button>
            </div>
          )}
        </div>

        {/* Applications Table */}
        {loadingApplications ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" label="Fetching candidate data..." />
          </div>
        ) : (
          <Card className="border border-divider shadow-sm bg-content1 dark:bg-[#18181b] overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-default-50 dark:bg-[#27272a]/50 border-b border-divider">
                    {!isViewMode ? (
                      <>
                        <th 
                          className="px-4 py-4 w-20 text-center cursor-pointer group select-none"
                          onClick={() => handleSelectAll(!isAllSelected)}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-default-400 uppercase tracking-widest group-hover:hidden">Select</span>
                            <span className="text-[10px] font-bold text-success uppercase tracking-widest hidden group-hover:block transition-all ">Select All</span>
                            <Checkbox
                              isSelected={isAllSelected}
                              onValueChange={handleSelectAll}
                              size="sm"
                              color="success"
                              radius="full"
                              className="pointer-events-none"
                            />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 w-20 text-center cursor-pointer group select-none"
                          onClick={() => handleRejectAll(!isAllExplicitlyRejected)}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-default-400 uppercase tracking-widest group-hover:hidden">Reject</span>
                            <span className="text-[10px] font-bold text-danger uppercase tracking-widest hidden group-hover:block transition-all ">Reject All</span>
                            <Checkbox
                              isSelected={isAllExplicitlyRejected}
                              onValueChange={handleRejectAll}
                              size="sm"
                              color="danger"
                              radius="full"
                              className="pointer-events-none"
                            />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-4 w-20 text-center cursor-pointer group select-none"
                          onClick={() => handleOnHoldAll(!isAllOnHold)}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-default-400 uppercase tracking-widest group-hover:hidden">Hold</span>
                            <span className="text-[10px] font-bold text-warning uppercase tracking-widest hidden group-hover:block transition-all ">Hold All</span>
                            <Checkbox
                              isSelected={isAllOnHold}
                              onValueChange={handleOnHoldAll}
                              size="sm"
                              color="warning"
                              radius="full"
                              className="pointer-events-none"
                            />
                          </div>
                        </th>
                      </>
                    ) : (
                      <th className="px-6 py-4 w-24 text-[10px] font-bold text-default-500 uppercase tracking-widest text-center">Outcome</th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-bold text-default-500 uppercase tracking-widest">Candidate</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-default-500 uppercase tracking-widest">Job</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-default-500 uppercase tracking-widest">Score</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-default-500 uppercase tracking-widest">Skills</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-default-500 uppercase tracking-widest">Comments</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-default-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/50">
                  {batchApplications.length === 0 ? (
                    <tr>
                      <td colSpan={isViewMode ? 7 : 9} className="px-6 py-12 text-center text-default-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText size={32} className="opacity-50" />
                          <p>No candidates found in this batch</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    batchApplications.map((app) => {
                      const isApproved = isViewMode && (selectedBatch.approved_application_ids || []).includes(app._id);
                      const isRejected = isViewMode && (selectedBatch.not_selected_application_ids || []).includes(app._id);
                      const isSelected = !isViewMode && selectedIds.has(app._id);
                      const isExplicitlyRejected = !isViewMode && rejectedIds.has(app._id);
                      const isOnHold = !isViewMode && onHoldIds.has(app._id);
                      const isViewOnHold = isViewMode && app.review_status === 'on_hold';
                      const isExpanded = expandedRows.has(app._id);
                      
                      return (
                        <React.Fragment key={app._id}>
                          <tr 
                            className={`hover:bg-default-50 dark:hover:bg-[#27272a]/50 transition-colors cursor-pointer ${
                              isSelected || isApproved ? 'bg-success-50/20 dark:bg-success-900/10' : 
                              isExplicitlyRejected || isRejected ? 'bg-danger-50/20 dark:bg-danger-900/10' : isOnHold || isViewOnHold ? 'bg-warning-50/20 dark:bg-warning-900/10' : ''
                            }`}
                            onClick={() => toggleExpand(app._id)}
                          >
                            {!isViewMode ? (
                              <>
                                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox 
                                    isSelected={isSelected} 
                                    onValueChange={() => handleDecisionChange(app._id, 'approve')}
                                    color="success" 
                                    size="sm"
                                    radius="full"
                                    aria-label="Approve"
                                  />
                                </td>
                                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox 
                                    isSelected={isExplicitlyRejected} 
                                    onValueChange={() => handleDecisionChange(app._id, 'reject')}
                                    color="danger" 
                                    size="sm"
                                    radius="full"
                                    aria-label="Reject"
                                  />
                                </td>
                                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox 
                                    isSelected={isOnHold} 
                                    onValueChange={() => handleDecisionChange(app._id, 'onhold')}
                                    color="warning" 
                                    size="sm"
                                    radius="full"
                                    aria-label="On Hold"
                                  />
                                </td>
                              </>
                            ) : (
                              <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className={`p-1.5 rounded-full inline-flex ${isApproved ? 'bg-success-100 text-success' : isViewOnHold ? 'bg-warning-100 text-warning' : 'bg-danger-100 text-danger'}`}>
                                  {isApproved ? <CheckCircle size={16} /> : isViewOnHold ? <Clock size={16} /> : <XCircle size={16} />}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar 
                                  name={app.candidate_name_extracted?.charAt(0) || '?'} 
                                  size="sm"
                                  className="bg-default-200"
                                />
                                <span className="font-bold text-default-900">{app.candidate_name_extracted || 'Unknown Candidate'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-default-900">{app.job_title || 'General'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 w-24">
                                <div className="flex items-center gap-1.5">
                                  <Star size={12} className={app.final_score >= 80 ? 'text-success fill-success' : app.final_score >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                                  <span className={`text-xs font-bold ${
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
                                  className="h-1"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-[200px]">
                              {/* Only show 2 skills max when collapsed */}
                              <div className="flex flex-wrap gap-1">
                                {(app.matched_skills || []).slice(0, 2).map((skill, idx) => (
                                  <Chip key={idx} size="sm" variant="flat" color="success" className="bg-success-50 text-success-700 h-5 text-[10px] px-1 border-none">
                                    {skill}
                                  </Chip>
                                ))}
                                {(app.matched_skills || []).length > 2 && (
                                  <span className="text-[10px] text-default-400 font-medium whitespace-nowrap">
                                    +{app.matched_skills.length - 2} more
                                  </span>
                                )}
                                {(app.matched_skills || []).length === 0 && (
                                  <span className="text-xs text-default-400 italic">No matches</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-default-500">
                                <MessageSquare size={14} />
                                <span className="text-xs font-medium">{(app.comments || []).length}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="flat" 
                                  color="primary"
                                  className="bg-primary/10 text-primary font-medium px-3 min-w-0"
                                  startContent={<Eye size={14} />}
                                  onPress={(e) => { e.stopPropagation(); handleViewResume(app); }}
                                >
                                  Resume
                                </Button>
                                <Button 
                                  isIconOnly
                                  size="sm" 
                                  variant="light" 
                                  className="text-default-500"
                                  onPress={(e) => { e.stopPropagation(); toggleExpand(app._id); }}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <tr className="bg-default-50 dark:bg-[#18181b]/50 border-b border-divider">
                              <td colSpan={isViewMode ? 7 : 9} className="px-8 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Contact Info */}
                                  <Card className="shadow-none border border-divider bg-background/50 dark:bg-default-100/50">
                                    <CardBody className="p-5 space-y-4">
                                      <h4 className="text-xs font-extrabold text-default-500 uppercase tracking-widest flex items-center gap-2">
                                        <User size={14} /> Contact
                                      </h4>
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                          <Mail size={16} className="text-default-400" />
                                          <span className="text-default-700 font-medium">{app.candidate_email}</span>
                                        </div>
                                        {app.candidate_phone && (
                                          <div className="flex items-center gap-3 text-sm">
                                            <Phone size={16} className="text-default-400" />
                                            <span className="text-default-700 font-medium">{app.candidate_phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    </CardBody>
                                  </Card>

                                  {/* All Skills */}
                                  <Card className="shadow-none border border-divider bg-background/50 dark:bg-default-100/50">
                                    <CardBody className="p-5 space-y-4">
                                      <h4 className="text-xs font-extrabold text-default-500 uppercase tracking-widest">All Matched Skills</h4>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(app.matched_skills || []).map((skill, idx) => (
                                          <Chip key={idx} size="sm" variant="flat" color="success" className="bg-success-50 text-success-700">
                                            {skill}
                                          </Chip>
                                        ))}
                                        {(app.matched_skills || []).length === 0 && (
                                          <span className="text-sm text-default-400 italic">No skills extracted</span>
                                        )}
                                      </div>
                                    </CardBody>
                                  </Card>

                                  {/* Actions/Comments */}
                                  <Card className="shadow-none border border-divider bg-background/50 dark:bg-default-100/50">
                                    <CardBody className="p-5 space-y-4">
                                      <h4 className="text-xs font-extrabold text-default-500 uppercase tracking-widest">Feedback</h4>
                                      <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2">
                                          <div className="flex -space-x-2">
                                            {(app.comments || []).slice(0, 3).map((c, i) => (
                                              <Avatar 
                                                key={i} 
                                                size="sm" 
                                                name={c.user_name?.charAt(0)} 
                                                className="border-2 border-background w-7 h-7 text-[10px]"
                                              />
                                            ))}
                                          </div>
                                          <span className="text-sm font-medium text-default-600">
                                            {(app.comments || []).length > 0 
                                              ? `${(app.comments || []).length} comment${(app.comments || []).length > 1 ? 's' : ''}`
                                              : 'No comments yet'}
                                          </span>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          variant="flat" 
                                          color="secondary"
                                          startContent={<MessageSquare size={14} />}
                                          onPress={() => handleOpenComment(app)}
                                          className="w-full font-semibold"
                                        >
                                          {!isViewMode ? 'Add Comment' : 'View Notes'}
                                        </Button>
                                      </div>
                                    </CardBody>
                                  </Card>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
