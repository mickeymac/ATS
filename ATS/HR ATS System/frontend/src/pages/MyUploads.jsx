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
  Chip, 
  Input, 
  Progress,
  Spinner,
  Select,
  SelectItem,
  Button,
  Checkbox,
  Tabs,
  Tab,
  Badge,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Avatar
} from '@nextui-org/react';
import { 
  FileText, 
  Search, 
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Upload,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Linkedin,
  Github,
  Target,
  AlertCircle,
  GraduationCap,
  MessageSquare,
  Eye,
  Briefcase
} from 'lucide-react';

const statusColorMap = {
  'Applied': 'default',
  'Under Review': 'warning',
  'Shortlisted': 'success',
  'Interview Scheduled': 'primary',
  'Selected': 'success',
  'Rejected': 'danger',
};

const reviewStatusColorMap = {
  'pending': 'default',
  'sent_for_review': 'warning',
  'approved': 'success',
  'not_selected': 'danger',
};

const reviewStatusLabelMap = {
  'pending': 'Pending',
  'sent_for_review': 'Under Review',
  'approved': 'Approved',
  'not_selected': 'Not Selected',
};

export default function MyUploads() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [uploads, setUploads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, year: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingForReview, setSendingForReview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterJob, setFilterJob] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [selectedTab, setSelectedTab] = useState('needs_review');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [rejectingDirectly, setRejectingDirectly] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedApp, setSelectedApp] = useState(null);
  
  const { isOpen: isResumeOpen, onOpen: onResumeOpen, onOpenChange: onResumeOpenChange } = useDisclosure();

  const fetchMyUploads = useCallback(async () => {
    setLoading(true);
    try {
      const [uploadsRes, statsRes, jobsRes] = await Promise.all([
        api.get('/applications/my-uploads'),
        api.get('/applications/my-stats'),
        api.get('/jobs/')
      ]);
      setUploads(uploadsRes.data);
      setStats(statsRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      addToast('Failed to fetch your uploads.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMyUploads();
  }, [fetchMyUploads]);

  // Helper function to check if date is within period
  const isWithinPeriod = (dateStr, period) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    switch (period) {
      case 'today': {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date >= startOfToday;
      }
      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return date >= startOfWeek;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= startOfMonth;
      }
      case 'year': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfYear;
      }
      default:
        return true;
    }
  };

  // Helper function to check if date matches specific date filter
  const matchesDateFilter = (dateStr) => {
    if (!filterDate) return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const filterDateObj = new Date(filterDate);
    return date.toDateString() === filterDateObj.toDateString();
  };

  // Filter by review status based on selected tab
  const getTabFilter = (app) => {
    const reviewStatus = app.review_status || 'pending';
    switch (selectedTab) {
      case 'needs_review':
        return reviewStatus === 'pending';
      case 'reviewed':
        return reviewStatus === 'approved';
      case 'not_selected':
        return reviewStatus === 'not_selected';
      case 'sent_for_review':
        return reviewStatus === 'sent_for_review';
      default:
        return true;
    }
  };

  const filteredUploads = uploads.filter(app => {
    const matchesSearch = 
      (app.candidate_name_extracted?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.candidate_email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesPeriod = filterPeriod === 'all' || isWithinPeriod(app.applied_at, filterPeriod);
    const matchesJob = filterJob === 'all' || app.job_id === filterJob;
    const matchesSpecificDate = matchesDateFilter(app.applied_at);
    const matchesTab = getTabFilter(app);
    
    return matchesSearch && matchesStatus && matchesPeriod && matchesJob && matchesSpecificDate && matchesTab;
  });

  // Count for each tab
  const pendingCount = uploads.filter(app => (app.review_status || 'pending') === 'pending').length;
  const sentForReviewCount = uploads.filter(app => app.review_status === 'sent_for_review').length;
  const approvedCount = uploads.filter(app => app.review_status === 'approved').length;
  const notSelectedCount = uploads.filter(app => app.review_status === 'not_selected').length;

  // Handle checkbox selection
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedIds(new Set(filteredUploads.map(app => app._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id, isSelected) => {
    const newSet = new Set(selectedIds);
    if (isSelected) {
      newSet.add(id);
      // Remove from rejected if added to selected
      const rejSet = new Set(rejectedIds);
      rejSet.delete(id);
      setRejectedIds(rejSet);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // Reject checkbox handlers
  const handleRejectAll = (isRejected) => {
    if (isRejected) {
      setRejectedIds(new Set(filteredUploads.map(app => app._id)));
      setSelectedIds(new Set()); // Clear selected when rejecting all
    } else {
      setRejectedIds(new Set());
    }
  };

  const handleRejectOne = (id, isRejected) => {
    const newSet = new Set(rejectedIds);
    if (isRejected) {
      newSet.add(id);
      // Remove from selected if added to rejected
      const selSet = new Set(selectedIds);
      selSet.delete(id);
      setSelectedIds(selSet);
    } else {
      newSet.delete(id);
    }
    setRejectedIds(newSet);
  };

  const isAllSelected = filteredUploads.length > 0 && filteredUploads.every(app => selectedIds.has(app._id));
  const isAllRejected = filteredUploads.length > 0 && filteredUploads.every(app => rejectedIds.has(app._id));

  // Send for review action
  const handleSendForReview = async () => {
    if (selectedIds.size === 0) {
      addToast('Please select at least one candidate', 'warning');
      return;
    }

    setSendingForReview(true);
    try {
      await api.post('/review/send-for-review', {
        application_ids: Array.from(selectedIds)
      });
      addToast(`Sent ${selectedIds.size} candidate(s) for review`, 'success');
      setSelectedIds(new Set());
      fetchMyUploads();
    } catch (error) {
      addToast('Failed to send for review', 'error');
    } finally {
      setSendingForReview(false);
    }
  };

  // Resubmit action
  const handleResubmit = async () => {
    if (selectedIds.size === 0) {
      addToast('Please select at least one candidate', 'warning');
      return;
    }

    setSendingForReview(true);
    try {
      await api.post('/review/resubmit', {
        application_ids: Array.from(selectedIds)
      });
      addToast(`Re-submitted ${selectedIds.size} candidate(s) for review`, 'success');
      setSelectedIds(new Set());
      fetchMyUploads();
    } catch (error) {
      addToast('Failed to resubmit', 'error');
    } finally {
      setSendingForReview(false);
    }
  };

  // Direct reject action (bypasses Team Lead)
  const handleDirectReject = async () => {
    if (rejectedIds.size === 0) {
      addToast('Please select at least one candidate to reject', 'warning');
      return;
    }

    setRejectingDirectly(true);
    try {
      await api.post('/review/reject-directly', {
        application_ids: Array.from(rejectedIds)
      });
      addToast(`Marked ${rejectedIds.size} candidate(s) as not selected`, 'success');
      setRejectedIds(new Set());
      await fetchMyUploads();
      // Switch to "Not Selected for Review" tab to show the rejected candidates
      setSelectedTab('not_selected');
    } catch (error) {
      addToast('Failed to reject candidates', 'error');
    } finally {
      setRejectingDirectly(false);
    }
  };

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedIds(new Set());
    setRejectedIds(new Set());
    setExpandedIds(new Set());
  }, [selectedTab]);

  // Toggle expand row
  const toggleExpand = (id) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // View resume handler
  const handleViewResume = (app) => {
    setSelectedApp(app);
    onResumeOpen();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner size="lg" label="Loading your uploads..." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-default-900">My Uploads</h1>
          <p className="text-default-600">Track resumes you have uploaded and manage review workflow</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-default-900">{stats.today}</p>
                  <p className="text-xs text-default-500">Today</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card className="p-4 border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-default-900">{stats.week}</p>
                  <p className="text-xs text-default-500">This Week</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card className="p-4 border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                  <CalendarDays className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-default-900">{stats.month}</p>
                  <p className="text-xs text-default-500">This Month</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card className="p-4 border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                  <CalendarRange className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-default-900">{stats.year}</p>
                  <p className="text-xs text-default-500">This Year</p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card className="p-4 border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-default-100">
                  <Upload className="h-5 w-5 text-default-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-default-900">{stats.total}</p>
                  <p className="text-xs text-default-500">Total Uploads</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs 
          selectedKey={selectedTab} 
          onSelectionChange={(key) => setSelectedTab(String(key))}
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-6",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
          }}
        >
          <Tab 
            key="needs_review" 
            title={
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span>Candidates Need Review</span>
                <Badge content={pendingCount} color="default" size="sm" />
              </div>
            }
          />
          <Tab 
            key="sent_for_review" 
            title={
              <div className="flex items-center gap-2">
                <Send size={16} />
                <span>Sent for Review</span>
                <Badge content={sentForReviewCount} color="warning" size="sm" />
              </div>
            }
          />
          <Tab 
            key="reviewed" 
            title={
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                <span>Reviewed Candidates</span>
                <Badge content={approvedCount} color="success" size="sm" />
              </div>
            }
          />
          <Tab 
            key="not_selected" 
            title={
              <div className="flex items-center gap-2">
                <XCircle size={16} />
                <span>Not Selected for Review</span>
                <Badge content={notSelectedCount} color="danger" size="sm" />
              </div>
            }
          />
        </Tabs>

        {/* Actions Bar */}
        {(selectedTab === 'needs_review' || selectedTab === 'not_selected') && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Chip color="success" variant="flat">
                  {selectedIds.size} to approve
                </Chip>
              )}
              {rejectedIds.size > 0 && selectedTab === 'needs_review' && (
                <Chip color="danger" variant="flat">
                  {rejectedIds.size} to reject
                </Chip>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedTab === 'needs_review' && (
                <>
                  <Button
                    color="danger"
                    variant="flat"
                    startContent={<XCircle size={16} />}
                    isDisabled={rejectedIds.size === 0}
                    isLoading={rejectingDirectly}
                    onPress={handleDirectReject}
                  >
                    Mark as Not Selected
                  </Button>
                  <Button
                    color="primary"
                    startContent={<Send size={16} />}
                    isDisabled={selectedIds.size === 0}
                    isLoading={sendingForReview}
                    onPress={handleSendForReview}
                  >
                    Send for Review
                  </Button>
                </>
              )}
              {selectedTab === 'not_selected' && (
                <Button
                  color="warning"
                  variant="flat"
                  startContent={<RefreshCw size={16} />}
                  isDisabled={selectedIds.size === 0}
                  isLoading={sendingForReview}
                  onPress={handleResubmit}
                >
                  Re-submit for Review
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4 border border-divider">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search */}
            <Input
              classNames={{
                inputWrapper: "bg-default-100",
              }}
              placeholder="Search by candidate name, email, or job..."
              startContent={<Search size={18} className="text-default-400" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            
            {/* Row 2: Filter dropdowns */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              {/* Time Period Filter */}
              <Select
                className="w-full sm:w-40"
                selectedKeys={[filterPeriod]}
                onSelectionChange={(keys) => {
                  setFilterPeriod(Array.from(keys)[0]);
                  if (Array.from(keys)[0] !== 'all') setFilterDate('');
                }}
                aria-label="Filter by period"
                label="Time Period"
                size="sm"
              >
                <SelectItem key="all">All Time</SelectItem>
                <SelectItem key="today">Today</SelectItem>
                <SelectItem key="week">This Week</SelectItem>
                <SelectItem key="month">This Month</SelectItem>
                <SelectItem key="year">This Year</SelectItem>
              </Select>

              {/* Specific Date Filter */}
              <Input
                type="date"
                className="w-full sm:w-44"
                label="Specific Date"
                size="sm"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  if (e.target.value) setFilterPeriod('all');
                }}
                classNames={{
                  inputWrapper: "bg-default-100",
                }}
              />

              {/* Job Filter */}
              <Select
                className="w-full sm:w-48"
                selectedKeys={[filterJob]}
                onSelectionChange={(keys) => setFilterJob(Array.from(keys)[0])}
                aria-label="Filter by job"
                label="Job"
                size="sm"
              >
                <SelectItem key="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job._id}>{job.title}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Active Filters Summary */}
            {(filterPeriod !== 'all' || filterDate || filterJob !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-default-500">Active filters:</span>
                {filterPeriod !== 'all' && (
                  <Chip size="sm" variant="flat" color="primary" onClose={() => setFilterPeriod('all')}>
                    {filterPeriod === 'today' ? 'Today' : filterPeriod === 'week' ? 'This Week' : filterPeriod === 'month' ? 'This Month' : 'This Year'}
                  </Chip>
                )}
                {filterDate && (
                  <Chip size="sm" variant="flat" color="secondary" onClose={() => setFilterDate('')}>
                    {new Date(filterDate).toLocaleDateString()}
                  </Chip>
                )}
                {filterJob !== 'all' && (
                  <Chip size="sm" variant="flat" color="success" onClose={() => setFilterJob('all')}>
                    {jobs.find(j => j._id === filterJob)?.title || 'Job'}
                  </Chip>
                )}
                <span className="text-xs text-default-400 ml-2">
                  Showing {filteredUploads.length} uploads
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Uploads List with Expandable Rows */}
        <Card className="border border-divider overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 p-4 bg-default-100 border-b border-divider text-xs font-semibold text-default-600 uppercase">
            <div className="col-span-1 flex items-center justify-center">
              {(selectedTab === 'needs_review' || selectedTab === 'not_selected') && (
                <div className="flex flex-col items-center">
                  <Checkbox
                    isSelected={isAllSelected}
                    onValueChange={handleSelectAll}
                    aria-label="Select all"
                    color="success"
                    size="sm"
                  />
                </div>
              )}
            </div>
            {selectedTab === 'needs_review' && (
              <div className="col-span-1 flex flex-col items-center">
                <Checkbox
                  isSelected={isAllRejected}
                  onValueChange={handleRejectAll}
                  aria-label="Reject all"
                  color="danger"
                  size="sm"
                />
              </div>
            )}
            <div className={`${selectedTab === 'needs_review' ? 'col-span-2' : 'col-span-3'}`}>Candidate</div>
            <div className="col-span-2">Job</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Workflow</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-1">Expand</div>
          </div>

          {/* Empty State */}
          {filteredUploads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100 mb-4">
                <FileText className="h-8 w-8 text-default-400" />
              </div>
              <p className="font-medium text-default-900">No uploads found</p>
              <p className="text-sm text-default-500">
                {selectedTab === 'needs_review' && "No candidates waiting to be sent for review"}
                {selectedTab === 'sent_for_review' && "No candidates currently under review"}
                {selectedTab === 'reviewed' && "No reviewed candidates yet"}
                {selectedTab === 'not_selected' && "No rejected candidates"}
              </p>
            </div>
          )}

          {/* Data Rows */}
          {filteredUploads.map((app) => (
            <div key={app._id} className="border-b border-divider last:border-b-0">
              {/* Main Row */}
              <div className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-default-50 transition-colors">
                <div className="col-span-1 flex items-center justify-center">
                  {(selectedTab === 'needs_review' || selectedTab === 'not_selected') ? (
                    <Checkbox
                      isSelected={selectedIds.has(app._id)}
                      onValueChange={(isSelected) => handleSelectOne(app._id, isSelected)}
                      aria-label={`Select ${app.candidate_name_extracted}`}
                      color="success"
                      size="sm"
                    />
                  ) : null}
                </div>
                {selectedTab === 'needs_review' && (
                  <div className="col-span-1 flex items-center justify-center">
                    <Checkbox
                      isSelected={rejectedIds.has(app._id)}
                      onValueChange={(isRejected) => handleRejectOne(app._id, isRejected)}
                      aria-label={`Reject ${app.candidate_name_extracted}`}
                      color="danger"
                      size="sm"
                    />
                  </div>
                )}
                <div className={`${selectedTab === 'needs_review' ? 'col-span-2' : 'col-span-3'}`}>
                  <p className="font-medium text-default-900 text-sm">{app.candidate_name_extracted || 'Unknown'}</p>
                  <p className="text-xs text-default-500">{app.candidate_email || 'No email'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-default-900 font-medium text-sm">{app.job_title || 'N/A'}</span>
                </div>
                <div className="col-span-1">
                  <div className="flex items-center gap-1">
                    <Star size={12} className={app.final_score >= 80 ? 'text-success fill-success' : app.final_score >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                    <span className={`font-semibold text-sm ${
                      app.final_score >= 80 ? 'text-success' : 
                      app.final_score >= 60 ? 'text-warning' : 'text-danger'
                    }`}>
                      {app.final_score?.toFixed(0) || 0}%
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  <Chip
                    size="sm"
                    variant="flat"
                    color={statusColorMap[app.status] || 'default'}
                  >
                    {app.status}
                  </Chip>
                </div>
                <div className="col-span-2">
                  <ReviewStepper 
                    reviewStatus={app.review_status || 'pending'}
                    reviewedAt={app.reviewed_at}
                    sentForReviewAt={app.sent_for_review_at}
                  />
                </div>
                <div className="col-span-1">
                  <span className="text-xs text-default-500">
                    {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => toggleExpand(app._id)}
                  >
                    {expandedIds.has(app._id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </Button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedIds.has(app._id) && (
                <div className="px-4 pb-4 bg-default-50">
                  <div className="p-4 rounded-lg bg-content1 border border-divider">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* Contact Information */}
                      <div>
                        <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                          <Mail size={14} className="text-primary" />
                          Contact Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          {app.candidate_email && (
                            <div className="flex items-center gap-2">
                              <Mail size={12} className="text-default-400" />
                              <a href={`mailto:${app.candidate_email}`} className="text-primary hover:underline">{app.candidate_email}</a>
                            </div>
                          )}
                          {app.candidate_phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={12} className="text-default-400" />
                              <a href={`tel:${app.candidate_phone}`} className="text-primary hover:underline">{app.candidate_phone}</a>
                            </div>
                          )}
                          {app.candidate_linkedin && (
                            <div className="flex items-center gap-2">
                              <Linkedin size={12} className="text-default-400" />
                              <a href={app.candidate_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{app.candidate_linkedin}</a>
                            </div>
                          )}
                          {app.candidate_github && (
                            <div className="flex items-center gap-2">
                              <Github size={12} className="text-default-400" />
                              <a href={app.candidate_github} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{app.candidate_github}</a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Experience & Education */}
                      <div>
                        <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                          <GraduationCap size={14} className="text-secondary" />
                          Experience & Education
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Briefcase size={12} className="text-default-400" />
                            <span className="text-default-700">
                              {app.candidate_experience_years ? `${app.candidate_experience_years} years` : app.candidate_experience_months ? `${app.candidate_experience_months} months` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {app.candidate_education?.map((edu, idx) => (
                              <Chip key={idx} size="sm" variant="flat" color="secondary">{edu}</Chip>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                          <Target size={14} className="text-warning" />
                          Score Breakdown
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-default-500">Skills:</span>
                            <span className="font-medium">{app.score_display?.skill || `${app.skill_score?.toFixed(0) || 0}%`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-default-500">Experience:</span>
                            <span className="font-medium">{app.score_display?.experience || `${app.experience_score?.toFixed(0) || 0}%`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-default-500">Education:</span>
                            <span className="font-medium">{app.score_display?.education || `${app.education_score?.toFixed(0) || 0}%`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-default-500">Semantic:</span>
                            <span className="font-medium">{app.score_display?.semantic || `${app.semantic_score?.toFixed(0) || 0}%`}</span>
                          </div>
                          <Divider className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span className="text-default-700">Total:</span>
                            <span className={app.final_score >= 80 ? 'text-success' : app.final_score >= 60 ? 'text-warning' : 'text-danger'}>
                              {app.score_display?.total || `${app.final_score?.toFixed(1) || 0}/100`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Matched Skills */}
                      <div>
                        <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                          <CheckCircle size={14} className="text-success" />
                          Matched Skills ({app.matched_skills?.length || 0})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {app.matched_skills?.length > 0 ? app.matched_skills.map((skill, idx) => (
                            <Chip key={idx} size="sm" variant="flat" color="success">{skill}</Chip>
                          )) : <span className="text-xs text-default-400">No matched skills</span>}
                        </div>
                      </div>

                      {/* Missing Skills */}
                      <div>
                        <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                          <AlertCircle size={14} className="text-danger" />
                          Missing Skills ({app.missing_skills?.length || 0})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {app.missing_skills?.length > 0 ? app.missing_skills.map((skill, idx) => (
                            <Chip key={idx} size="sm" variant="flat" color="danger">{skill}</Chip>
                          )) : <span className="text-xs text-default-400">No missing skills</span>}
                        </div>
                      </div>

                      {/* All Candidate Skills */}
                      <div>
                        <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                          <Star size={14} className="text-primary" />
                          All Skills ({app.candidate_skills?.length || 0})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {app.candidate_skills?.slice(0, 8).map((skill, idx) => (
                            <Chip key={idx} size="sm" variant="flat" color="primary">{skill}</Chip>
                          ))}
                          {app.candidate_skills?.length > 8 && (
                            <Chip size="sm" variant="bordered">+{app.candidate_skills.length - 8} more</Chip>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Team Lead Comments - Only show in reviewed tab */}
                    {selectedTab === 'reviewed' && app.comments && app.comments.length > 0 && (
                      <>
                        <Divider className="my-4" />
                        <div>
                          <h4 className="text-sm font-semibold text-default-900 mb-3 flex items-center gap-2">
                            <MessageSquare size={14} className="text-primary" />
                            Team Lead Comments ({app.comments.length})
                          </h4>
                          <div className="space-y-3">
                            {app.comments.map((comment, idx) => (
                              <div key={idx} className="flex gap-3 p-3 rounded-lg bg-default-100">
                                <Avatar 
                                  name={comment.user_name?.charAt(0).toUpperCase() || 'U'}
                                  size="sm"
                                  color={comment.user_role === 'team_lead' ? 'primary' : 'secondary'}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{comment.user_name}</span>
                                    <Chip size="sm" variant="flat" color={comment.user_role === 'team_lead' ? 'primary' : 'secondary'}>
                                      {comment.user_role === 'team_lead' ? 'Team Lead' : 'Recruiter'}
                                    </Chip>
                                  </div>
                                  <p className="text-sm text-default-700">{comment.text}</p>
                                  <p className="text-xs text-default-400 mt-1">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <Divider className="my-4" />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        startContent={<Eye size={14} />}
                        onPress={() => handleViewResume(app)}
                      >
                        Preview Resume
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>

        {/* Resume Preview Modal */}
        <Modal 
          isOpen={isResumeOpen} 
          onOpenChange={onResumeOpenChange}
          size="5xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  Resume Preview - {selectedApp?.candidate_name_extracted}
                </ModalHeader>
                <ModalBody className="pb-6">
                  {selectedApp && (
                    <ResumeViewer application={selectedApp} />
                  )}
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </AppShell>
  );
}
