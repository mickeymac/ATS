import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { TableSkeleton } from '../components/SkeletonLoaders';
import { exportToCSV, formatLastUpdated } from '../utils/export';
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
  Avatar,
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
  Divider,
  Switch,
  Tooltip
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
  List,
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
  AlertCircle,
  RefreshCw
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
  const [lastUpdated, setLastUpdated] = useState(null);
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
      // Handle paginated response format
      const data = response.data;
      setApplications(data.items || data);
      setLastUpdated(new Date());
    } catch {
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
    } catch {
      addToast('Failed to update status.', 'error');
    }
  };

  // Get selected application for split view
  const selectedApplication = applications.find(app => app._id === selectedAppId);

  // Handle split view selection
  const handleSplitViewSelect = (id) => {
    setSelectedAppId(id);
  };

  // View details handler
  const _handleViewDetails = (app) => {
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
      (app.candidate_email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Export applications to CSV
  const handleExportApplications = () => {
    const columns = [
      { key: 'candidate_name_extracted', label: 'Candidate Name' },
      { key: 'candidate_email', label: 'Email' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'status', label: 'Status' },
      { key: 'fit_score', label: 'Fit Score' },
      { key: 'created_at', label: 'Applied At' }
    ];
    exportToCSV(filteredApplications, 'applications', columns);
    addToast('Applications exported successfully.', 'success');
  };

  const isHR = user?.role === 'team_lead' || user?.role === 'recruiter' || user?.role === 'admin';

  if (loading) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Applications</h1>
            <p className="text-default-600">Loading applications...</p>
          </div>
          <TableSkeleton rows={8} columns={5} />
        </div>
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
            <h1 className="text-3xl font-extrabold tracking-tight text-default-900">
              {isRecruiter ? 'My Applications' : 'Applications'}
            </h1>
            <p className="text-default-500 text-lg">
              {isRecruiter ? 'Review applications you have uploaded' : 'Review and manage candidate applications'}
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-default-400 mt-1">
                <Clock size={12} />
                <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="Refresh list">
              <Button 
                variant="flat" 
                onPress={fetchApplications}
                className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
              >
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
            {filteredApplications.length > 0 && (
              <Tooltip content="Export to CSV">
                <Button 
                  variant="flat" 
                  onPress={handleExportApplications}
                  className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
                >
                  <Download size={18} />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Main Controls Card */}
        <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/30 p-1">
          <CardBody className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
            <div className="flex flex-1 items-center gap-3">
              <Input
                classNames={{
                  base: "w-full md:max-w-md",
                  inputWrapper: "bg-default-100 dark:bg-default-100 h-10 shadow-sm",
                }}
                placeholder="Search candidates, emails, or jobs..."
                startContent={<Search size={18} className="text-default-400" />}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <Select
                className="w-44"
                size="sm"
                variant="flat"
                selectedKeys={[filterStatus]}
                onSelectionChange={(keys) => setFilterStatus(Array.from(keys)[0])}
                aria-label="Filter by status"
                startContent={<Target size={14} className="text-default-400" />}
                classNames={{
                  trigger: "bg-default-100 dark:bg-default-100"
                }}
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
            
            <div className="flex items-center gap-4 pr-2">
              <div className="flex items-center gap-2 text-default-400 mr-2 border-r border-divider pr-4 h-6">
                <LayoutGrid size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Display View</span>
              </div>
              <div className="flex items-center gap-3">
                <Tooltip content="Table View">
                  <div className={`p-2 rounded-lg cursor-pointer transition-colors ${!isSplitView ? 'bg-primary text-white shadow-sm' : 'bg-default-100 text-default-400 hover:bg-default-200'}`}
                    onClick={() => setIsSplitView(false)}>
                    <TableIcon size={18} />
                  </div>
                </Tooltip>
                <Tooltip content="Split Board View">
                  <div className={`p-2 rounded-lg cursor-pointer transition-colors ${isSplitView ? 'bg-primary text-white shadow-sm' : 'bg-default-100 text-default-400 hover:bg-default-200'}`}
                    onClick={() => setIsSplitView(true)}>
                    <LayoutGrid size={18} />
                  </div>
                </Tooltip>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Applications View */}
        {isSplitView ? (
          /* Split View - 3 Column Layout */
          <div className="flex h-[calc(100vh-12rem)] w-full overflow-hidden rounded-2xl border border-divider bg-default-50/50 shadow-lg">
            
            {/* Column 1: Application List */}
            {showList && (
              <div className="flex w-80 flex-col border-r border-divider bg-background">
                <div className="flex items-center justify-between p-4 border-b border-divider bg-default-50/50">
                   <div className="flex items-center gap-2">
                     <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                       <List size={16} />
                     </div>
                     <h3 className="font-bold text-sm text-default-900">Applications</h3>
                   </div>
                   <Button isIconOnly size="sm" variant="flat" className="bg-default-100" onPress={() => setShowList(false)}>
                     <PanelLeftClose size={16} />
                   </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  <ApplicationList 
                    applications={filteredApplications} 
                    selectedId={selectedAppId} 
                    onSelect={handleSplitViewSelect} 
                  />
                </div>
              </div>
            )}
            {!showList && (
              <div className="border-r border-divider bg-background p-2 flex flex-col items-center">
                <Tooltip content="Show List" placement="right">
                  <Button isIconOnly size="sm" variant="flat" className="bg-default-100" onPress={() => setShowList(true)}>
                    <PanelLeftOpen size={16} />
                  </Button>
                </Tooltip>
              </div>
            )}

            {/* Column 2: Application Details */}
            {showDetails && (
              <div className="flex w-96 flex-col border-r border-divider bg-background">
                 <div className="flex items-center justify-between p-4 border-b border-divider bg-default-50/50">
                   <div className="flex items-center gap-2">
                     <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                       <Target size={16} />
                     </div>
                     <h3 className="font-bold text-sm text-default-900">ATS Analysis</h3>
                   </div>
                   <Button isIconOnly size="sm" variant="flat" className="bg-default-100" onPress={() => setShowDetails(false)}>
                     <PanelLeftClose size={16} />
                   </Button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <ApplicationDetails 
                    application={selectedApplication} 
                    onStatusUpdate={handleUpdateStatus}
                    isHR={isHR}
                  />
                </div>
              </div>
            )}
            {!showDetails && (
               <div className="border-r border-divider bg-background p-2 flex flex-col items-center">
                  <Tooltip content="Show Analysis" placement="right">
                    <Button isIconOnly size="sm" variant="flat" className="bg-default-100 rotate-180" onPress={() => setShowDetails(true)}>
                       <PanelLeftOpen size={16} />
                     </Button>
                  </Tooltip>
               </div>
            )}

            {/* Column 3: Resume Viewer */}
            <div className="flex flex-1 flex-col bg-background">
              <div className="flex items-center justify-between p-4 border-b border-divider bg-default-50/50">
                 <div className="flex items-center gap-2">
                   <div className="p-1.5 rounded-lg bg-success/10 text-success">
                     <FileText size={16} />
                   </div>
                   <h3 className="font-bold text-sm text-default-900">Resume Preview</h3>
                 </div>
                 {selectedApplication && (
                   <div className="flex items-center gap-2">
                     <Button 
                        size="sm" 
                        variant="flat" 
                        className="bg-primary/10 text-primary font-bold"
                        startContent={<Maximize2 size={14} />}
                        onPress={onResumeOpen}
                      >
                        Fullscreen
                      </Button>
                   </div>
                 )}
              </div>
              <div 
                className="flex-1 overflow-hidden p-6 bg-default-50/30"
              >
                <div className="h-full w-full rounded-xl border border-divider/50 bg-white shadow-inner overflow-hidden relative group">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
                    <div className="p-3 rounded-full bg-primary text-white shadow-lg">
                      <Maximize2 size={24} />
                    </div>
                  </div>
                  <div className="h-full w-full overflow-y-auto p-4" onClick={() => selectedApplication && onResumeOpen()}>
                    <ResumeViewer application={selectedApplication} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="flex flex-col gap-6">
            {filteredApplications.length === 0 ? (
              <Card className="p-16 border-dashed border-2 border-divider bg-transparent">
                <CardBody className="flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-default-100">
                    <FileText size={40} className="text-default-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-default-900">No applications found</h3>
                    <p className="text-default-500 mt-2">Applications will appear here once candidates apply.</p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card className="border border-divider shadow-sm overflow-hidden bg-content1 dark:bg-default-50/20">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead>
                      <tr className="bg-default-50 dark:bg-default-100/50 border-b border-divider">
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500 w-12"></th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Candidate</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Position</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Status</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Match Score</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Review Progress</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/50">
                      {filteredApplications.map((app) => (
                        <React.Fragment key={app._id}>
                          {/* Main Row */}
                          <tr 
                            className={`group hover:bg-default-50 dark:hover:bg-default-100/50 transition-all duration-200 cursor-pointer ${expandedRows.has(app._id) ? 'bg-default-100/50 dark:bg-default-100/30' : ''}`}
                            onClick={() => toggleRowExpansion(app._id)}
                          >
                            <td className="px-6 py-5">
                              <div className={`p-1.5 rounded-lg transition-colors ${expandedRows.has(app._id) ? 'bg-primary text-white shadow-sm' : 'bg-default-100 dark:bg-default-100 text-default-400 group-hover:bg-default-200'}`}>
                                {expandedRows.has(app._id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <Avatar 
                                  name={app.candidate_name_extracted?.charAt(0) || '?'} 
                                  size="sm"
                                  isBordered
                                  className="w-8 h-8 text-xs font-bold"
                                />
                                <div>
                                  <p className="text-sm font-bold text-default-900 group-hover:text-primary transition-colors leading-tight">
                                    {app.candidate_name_extracted || 'Unknown'}
                                  </p>
                                  <p className="text-[11px] text-default-500 dark:text-default-400 mt-0.5 font-medium">
                                    {app.candidate_email || app.candidate_email_extracted}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-default-800 dark:text-default-700">{app.job_title}</span>
                                <span className="text-[10px] font-medium text-default-400 uppercase tracking-tighter">Target Role</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <Chip 
                                size="sm" 
                                variant="flat" 
                                color={statusColorMap[app.status] || "default"}
                                className="font-bold uppercase text-[10px]"
                              >
                                {app.status}
                              </Chip>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-1.5 w-24">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold ${
                                    app.final_score >= 80 ? 'text-success' : 
                                    app.final_score >= 60 ? 'text-warning' : 'text-danger'
                                  }`}>
                                    {app.final_score?.toFixed(0) || app.match_score?.toFixed(0) || 0}%
                                  </span>
                                  <Star size={12} className={app.final_score >= 80 ? 'text-success fill-success' : app.final_score >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                                </div>
                                <Progress 
                                  size="sm" 
                                  value={app.final_score || app.match_score || 0} 
                                  color={app.final_score >= 80 ? 'success' : app.final_score >= 60 ? 'warning' : 'danger'}
                                  className="h-1.5"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <ReviewStepper 
                                reviewStatus={app.review_status || 'pending'}
                                reviewedAt={app.reviewed_at}
                                sentForReviewAt={app.sent_for_review_at}
                              />
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2 text-default-500 dark:text-default-400">
                                <Clock size={14} className="opacity-50" />
                                <span className="text-xs font-medium">
                                  {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded Row */}
                          {expandedRows.has(app._id) && (
                            <tr className="bg-default-50 dark:bg-default-100/10">
                              <td colSpan={7} className="px-8 py-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                  {/* Left Column: Profile & Info */}
                                  <div className="flex flex-col gap-6">
                                    <div className="p-5 rounded-2xl bg-white dark:bg-default-50 border border-divider shadow-sm">
                                      <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <User size={14} className="text-primary" />
                                        Contact Information
                                      </h4>
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-50 text-primary">
                                            <Mail size={16} />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-default-400 uppercase">Email</span>
                                            <span className="text-sm font-medium text-default-800 dark:text-default-700">{app.candidate_email || 'N/A'}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 rounded-lg bg-secondary-50 dark:bg-secondary-50 text-secondary">
                                            <Phone size={16} />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-default-400 uppercase">Phone</span>
                                            <span className="text-sm font-medium text-default-800 dark:text-default-700">{app.candidate_phone || 'N/A'}</span>
                                          </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                          {app.candidate_linkedin && (
                                            <Button 
                                              as="a" 
                                              href={app.candidate_linkedin} 
                                              target="_blank" 
                                              size="sm" 
                                              variant="flat" 
                                              className="bg-[#0077b5]/10 text-[#0077b5] font-bold"
                                              startContent={<Linkedin size={14} />}
                                            >
                                              LinkedIn
                                            </Button>
                                          )}
                                          {app.candidate_github && (
                                            <Button 
                                              as="a" 
                                              href={app.candidate_github} 
                                              target="_blank" 
                                              size="sm" 
                                              variant="flat" 
                                              className="bg-[#333]/10 text-[#333] font-bold"
                                              startContent={<Github size={14} />}
                                            >
                                              GitHub
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Education Card */}
                                    {app.candidate_education && app.candidate_education.length > 0 && (
                                      <div className="p-5 rounded-2xl bg-white dark:bg-default-50 border border-divider shadow-sm">
                                        <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                          <GraduationCap size={16} className="text-primary" />
                                          Education
                                        </h4>
                                        <div className="flex flex-col gap-2">
                                          {app.candidate_education.map((edu, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm text-default-700 font-medium">
                                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                              {edu}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Middle Column: Scores */}
                                  <div className="p-5 rounded-2xl bg-white dark:bg-default-50 border border-divider shadow-sm">
                                    <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                      <Target size={16} className="text-primary" />
                                      ATS Match Breakdown
                                    </h4>
                                    {app.score_display ? (
                                      <div className="space-y-6">
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-default-600">Skills Alignment</span>
                                            <span className="text-sm font-extrabold text-default-900">{app.score_display.skill}</span>
                                          </div>
                                          <Progress size="sm" value={parseFloat(app.score_display.skill.split('/')[0]) * 2} color="primary" className="h-1.5" />
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-default-600">Experience Match</span>
                                            <span className="text-sm font-extrabold text-default-900">{app.score_display.experience}</span>
                                          </div>
                                          <Progress size="sm" value={parseFloat(app.score_display.experience.split('/')[0]) * 2.85} color="secondary" className="h-1.5" />
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-default-600">Educational Fit</span>
                                            <span className="text-sm font-extrabold text-default-900">{app.score_display.education}</span>
                                          </div>
                                          <Progress size="sm" value={parseFloat(app.score_display.education.split('/')[0]) * 6.66} color="warning" className="h-1.5" />
                                        </div>
                                        
                                        <div className="mt-8 p-4 rounded-xl bg-primary-50 dark:bg-primary-50/50 border border-primary-100 flex items-center justify-between">
                                          <div>
                                            <p className="text-[10px] font-extrabold text-primary-400 uppercase tracking-widest">Final Score</p>
                                            <p className="text-2xl font-black text-primary-700">{app.score_display.total}</p>
                                          </div>
                                          <div className={`p-3 rounded-full ${app.final_score >= 80 ? 'bg-success-100 text-success' : app.final_score >= 60 ? 'bg-warning-100 text-warning' : 'bg-danger-100 text-danger'}`}>
                                            <Star size={24} className="fill-current" />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-10 text-default-400 italic">
                                        <AlertCircle size={32} className="mb-2 opacity-20" />
                                        <p>Score details unavailable</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Right Column: Skills Analysis */}
                                  <div className="flex flex-col gap-6">
                                    <div className="p-5 rounded-2xl bg-white dark:bg-default-50 border border-divider shadow-sm flex-1">
                                      <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <CheckCircle size={16} className="text-success" />
                                        Skill Analysis
                                      </h4>
                                      
                                      <div className="space-y-5">
                                        {app.matched_skills && app.matched_skills.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-bold text-success-600 uppercase mb-2">Matched ({app.matched_skills.length})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {app.matched_skills.map((skill, idx) => (
                                                <Chip key={idx} size="sm" variant="dot" color="success" className="bg-success-50 dark:bg-success-50 h-6">{skill}</Chip>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {app.missing_skills && app.missing_skills.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-bold text-danger-600 uppercase mb-2">Missing ({app.missing_skills.length})</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {app.missing_skills.map((skill, idx) => (
                                                <Chip key={idx} size="sm" variant="dot" color="danger" className="bg-danger-50 dark:bg-danger-50 h-6">{skill}</Chip>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {app.candidate_skills && app.candidate_skills.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-bold text-primary-600 uppercase mb-2">All Candidate Skills</p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {app.candidate_skills.slice(0, 10).map((skill, idx) => (
                                                <Chip key={idx} size="sm" variant="flat" color="primary" className="h-6 text-[10px]">{skill}</Chip>
                                              ))}
                                              {app.candidate_skills.length > 10 && (
                                                <Chip size="sm" variant="flat" className="h-6 text-[10px]">+{app.candidate_skills.length - 10} more</Chip>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Action Footer for Expanded Row */}
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex gap-2">
                                        {isHR && (
                                          <>
                                            <Tooltip content="Mark as Shortlisted">
                                              <Button isIconOnly size="md" color="success" variant="flat" className="bg-success-50 dark:bg-success-50" onPress={() => handleUpdateStatus(app._id, 'Shortlisted')}>
                                                <CheckCircle size={18} />
                                              </Button>
                                            </Tooltip>
                                            <Tooltip content="Schedule Interview">
                                              <Button isIconOnly size="md" color="primary" variant="flat" className="bg-primary-50 dark:bg-primary-50" onPress={() => handleUpdateStatus(app._id, 'Interview Scheduled')}>
                                                <Clock size={18} />
                                              </Button>
                                            </Tooltip>
                                            <Tooltip content="Reject Candidate">
                                              <Button isIconOnly size="md" color="danger" variant="flat" className="bg-danger-50 dark:bg-danger-50" onPress={() => handleUpdateStatus(app._id, 'Rejected')}>
                                                <XCircle size={18} />
                                              </Button>
                                            </Tooltip>
                                          </>
                                        )}
                                      </div>
                                      <Button 
                                        color="secondary" 
                                        variant="shadow" 
                                        className="font-bold shadow-secondary-200 dark:shadow-none"
                                        startContent={<FileText size={16} />}
                                        onPress={() => handleResumePreview(app)}
                                      >
                                        View Resume
                                      </Button>
                                    </div>
                                  </div>
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
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        size="3xl" 
        scrollBehavior="inside"
        classNames={{
          header: "border-b border-divider bg-default-50",
          footer: "border-t border-divider bg-default-50",
          closeButton: "hover:bg-default-100 active:bg-default-200",
        }}
      >
        <ModalContent>
          {(onClose) => selectedApp && (
            <>
              <ModalHeader className="flex flex-col gap-1 py-4">
                <div className="flex items-center gap-4">
                  <Avatar 
                    name={selectedApp.candidate_name_extracted?.charAt(0) || '?'} 
                    size="md"
                    isBordered
                    color="primary"
                    className="font-bold"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-default-900 leading-tight">
                      {selectedApp.candidate_name_extracted || 'Unknown Candidate'}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-default-500 text-sm font-medium">{selectedApp.job_title}</p>
                      <Chip size="sm" variant="flat" color={statusColorMap[selectedApp.status] || "default"} className="h-5 text-[10px] font-bold uppercase">
                        {selectedApp.status}
                      </Chip>
                    </div>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="py-6 gap-8">
                {/* Top Grid: Info & Score */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Contact Info Card */}
                  <div className="p-5 rounded-2xl bg-default-50 border border-divider shadow-sm">
                    <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Mail size={14} className="text-primary" />
                      Contact Details
                    </h4>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-divider text-default-600">
                          <Mail size={14} />
                        </div>
                        <span className="font-medium text-default-700">{selectedApp.candidate_email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-divider text-default-600">
                          <Phone size={14} />
                        </div>
                        <span className="font-medium text-default-700">{selectedApp.candidate_phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-divider text-default-600">
                          <MapPin size={14} />
                        </div>
                        <span className="font-medium text-default-700">{selectedApp.candidate_location || 'Remote'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Overall Score Card */}
                  <div className="p-5 rounded-2xl bg-primary-50/30 border border-primary-100 shadow-sm flex flex-col justify-between">
                    <h4 className="text-xs font-extrabold text-primary-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Target size={14} className="text-primary" />
                      Overall Match
                    </h4>
                    <div className="flex items-center gap-6">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-primary-100"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={226.2}
                            strokeDashoffset={226.2 * (1 - (selectedApp.match_score || 0) / 100)}
                            className="text-primary"
                          />
                        </svg>
                        <span className="absolute text-xl font-black text-primary-700">
                          {selectedApp.match_score?.toFixed(0) || 0}%
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-primary-800">High Match Potential</p>
                        <p className="text-xs text-primary-600 mt-1 leading-relaxed">Candidate shows strong alignment with core job requirements.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Analysis */}
                {selectedApp.extracted_skills && selectedApp.extracted_skills.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest flex items-center gap-2">
                      <Star size={14} className="text-warning fill-warning" />
                      Extracted Expertise
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.extracted_skills.map((skill, idx) => (
                        <Chip key={idx} size="sm" variant="flat" color="primary" className="bg-primary-50 font-bold px-3 py-1 h-auto">
                          {skill}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Summary */}
                {selectedApp.parsed_text && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-secondary" />
                      Professional Summary
                    </h4>
                    <div className="bg-default-100/50 rounded-2xl p-5 text-sm text-default-600 border border-divider/50 leading-relaxed italic">
                      {selectedApp.parsed_text.substring(0, 800)}...
                    </div>
                  </div>
                )}

                {/* Admin/HR Actions */}
                {isHR && (
                  <div className="p-5 rounded-2xl bg-default-100/50 border border-divider border-dashed">
                    <h4 className="text-xs font-extrabold text-default-400 uppercase tracking-widest mb-4">Review Decision</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        size="md" 
                        color="success" 
                        variant="shadow" 
                        className="font-bold px-6"
                        startContent={<CheckCircle size={18} />}
                        onPress={() => handleUpdateStatus(selectedApp._id, 'Shortlisted')}
                      >
                        Shortlist
                      </Button>
                      <Button 
                        size="md" 
                        color="primary" 
                        variant="flat" 
                        className="bg-primary-50 font-bold px-6"
                        startContent={<Clock size={18} />}
                        onPress={() => handleUpdateStatus(selectedApp._id, 'Interview Scheduled')}
                      >
                        Schedule Interview
                      </Button>
                      <Button 
                        size="md" 
                        color="danger" 
                        variant="light" 
                        className="font-bold px-6"
                        startContent={<XCircle size={18} />}
                        onPress={() => handleUpdateStatus(selectedApp._id, 'Rejected')}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="justify-between px-6 py-4">
                <div className="flex gap-2">
                  <Button variant="light" onPress={onClose} className="font-bold">
                    Close
                  </Button>
                </div>
                {selectedApp.file_path && (
                  <Button 
                    color="primary" 
                    variant="shadow"
                    className="font-bold"
                    startContent={<Download size={18} />}
                  >
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
          backdrop: "bg-black/70 backdrop-blur-xl",
          base: "bg-background",
          closeButton: "top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-divider bg-default-50 py-3 px-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-primary text-white shadow-md shadow-primary-200">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-default-900 leading-tight">
                      Resume Preview
                    </h3>
                    <p className="text-[10px] font-bold text-default-400 uppercase tracking-widest mt-0.5">
                      {(resumePreviewApp || selectedApplication)?.candidate_name_extracted || 'Unknown Candidate'}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="p-0 bg-default-100/30">
                <div className="h-[calc(100vh-8rem)] w-full overflow-hidden p-8 flex justify-center">
                  <div className="h-full w-full max-w-5xl rounded-2xl border border-divider bg-white shadow-2xl overflow-y-auto custom-scrollbar p-10">
                    <ResumeViewer application={resumePreviewApp || selectedApplication} />
                  </div>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
}
