import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { TableSkeleton } from '../components/SkeletonLoaders';
import { formatLastUpdated } from '../utils/export';
import { getInitials } from '../utils/helpers';
import { ResumeViewer } from '../components/applications/ResumeViewer';
import { 
  Card, 
  CardBody,
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
  Progress,
  Tooltip
} from '@nextui-org/react';
import { 
  FileText, 
  Search, 
  Database,
  Star,
  Maximize2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock
} from 'lucide-react';


export default function ResumeDatabase() {
  const { addToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const { isOpen: isResumeOpen, onOpen: onResumeOpen, onOpenChange: onResumeOpenChange } = useDisclosure();
  
  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [resumePreviewApp, setResumePreviewApp] = useState(null);
  
  // Assignment state
  const [selectedJobs, setSelectedJobs] = useState({});
  const [isAssigning, setIsAssigning] = useState(false);

  const handleSelectJob = (appId, jobId) => {
    setSelectedJobs(prev => ({ ...prev, [appId]: jobId }));
  };

  const handleAssign = async (appId) => {
    const jobId = selectedJobs[appId];
    if (!jobId) return;
    
    setIsAssigning(true);
    try {
      await api.post(`/applications/${appId}/assign`, { job_id: jobId });
      addToast('Candidate assigned successfully! They will now appear in the Applications tab for that job.', 'success');
      fetchDatabase(); 
    } catch {
      addToast('Failed to assign candidate', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const fetchDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/applications/database');
      const data = response.data;
      setApplications(data.items || data);
      setLastUpdated(new Date());
    } catch {
      addToast('Failed to fetch resume database.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  const toggleRowExpansion = (id) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.candidate_name_extracted?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (app.candidate_email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    return matchesSearch;
  });

  const getBestMatch = (app) => {
    if (!app.global_job_scores || app.global_job_scores.length === 0) return null;
    return app.global_job_scores.reduce((prev, current) => 
      ((prev.final_score || 0) > (current.final_score || 0)) ? prev : current
    );
  };

  if (loading) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Resume Database</h1>
            <p className="text-default-500 text-lg">Loading global resumes...</p>
          </div>
          <TableSkeleton rows={8} columns={5} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-100px)]">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end flex-shrink-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Database size={24} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Resume Database</h1>
            </div>
            <p className="text-default-500 text-lg ml-11">Unassigned resumes matched against all active jobs.</p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-default-400 mt-1 ml-11">
                <Clock size={12} />
                <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Input
              classNames={{
                base: "w-full sm:max-w-[300px]",
                inputWrapper: "bg-default-100",
              }}
              placeholder="Search candidate name or email..."
              startContent={<Search size={18} className="text-default-400" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <Tooltip content="Refresh database">
              <Button 
                variant="flat" 
                onPress={fetchDatabase}
                className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
              >
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Main Content Area */}
        <Card className="border border-divider shadow-sm overflow-hidden bg-content1 dark:bg-default-50/20 flex-1">
          <div className="overflow-auto h-full relative">
            {filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
                <div className="p-6 rounded-full bg-default-100">
                  <Database size={40} className="text-default-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-default-900">No resumes in database</h3>
                  <p className="text-default-500 mt-2">Upload resumes without selecting a job to see them here.</p>
                </div>
              </div>
            ) : (
              <table className="w-full min-w-full relative">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-default-50 dark:bg-default-100/80 border-b border-divider backdrop-blur-md">
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500 w-12"></th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Candidate</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Highest Match</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500 min-w-[140px]">Match Score</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Date Added</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-default-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/50">
                  {filteredApplications.map((app) => {
                    const bestMatch = getBestMatch(app);
                    const displayScore = bestMatch ? bestMatch.final_score : 0;
                    
                    return (
                    <React.Fragment key={app._id}>
                      {/* Main Row */}
                      <tr 
                        className={`group hover:bg-default-50 dark:hover:bg-default-100/50 transition-all duration-200 cursor-pointer ${expandedRows.has(app._id) ? 'bg-default-100/50 dark:bg-default-100/30' : ''}`}
                        onClick={() => toggleRowExpansion(app._id)}
                      >
                        <td className="px-6 py-5">
                          <div className={`p-1.5 rounded-lg transition-colors w-fit ${expandedRows.has(app._id) ? 'bg-primary text-white shadow-sm' : 'bg-default-100 dark:bg-default-100 text-default-400 group-hover:bg-default-200'}`}>
                            {expandedRows.has(app._id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              name={getInitials(app.candidate_name_extracted)} 
                              showFallback={true}
                              size="sm"
                              isBordered
                              className="w-8 h-8 text-xs font-bold"
                            />
                            <div>
                              <p className="text-sm font-bold text-default-900 group-hover:text-primary transition-colors leading-tight">
                                {app.candidate_name_extracted || 'Unknown'}
                              </p>
                              <p className="text-[11px] text-default-500 dark:text-default-400 mt-0.5 font-medium">
                                {app.candidate_email || app.candidate_email_extracted || 'No email'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-default-800 dark:text-default-700">
                              {bestMatch ? bestMatch.job_title : 'No Jobs Evaluated'}
                            </span>
                            <span className="text-[10px] font-medium text-default-400 uppercase tracking-tighter">Best Matched Role</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {bestMatch ? (
                            <div className="flex flex-col gap-1.5 w-24">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${
                                  displayScore >= 80 ? 'text-success' : 
                                  displayScore >= 60 ? 'text-warning' : 'text-danger'
                                }`}>
                                  {displayScore?.toFixed(0)}%
                                </span>
                                <Star size={12} className={displayScore >= 80 ? 'text-success fill-success' : displayScore >= 60 ? 'text-warning fill-warning' : 'text-danger fill-danger'} />
                              </div>
                              <Progress 
                                size="sm" 
                                value={displayScore} 
                                color={displayScore >= 80 ? 'success' : displayScore >= 60 ? 'warning' : 'danger'}
                                className="h-1.5"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-default-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-default-500 dark:text-default-400">
                            <Clock size={14} className="opacity-50" />
                            <span className="text-xs font-medium">
                              {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<FileText size={14} />}
                            className="font-bold"
                            onPress={(e) => {
                              e.stopPropagation();
                              setResumePreviewApp(app);
                              onResumeOpen();
                            }}
                          >
                            View Resume
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {expandedRows.has(app._id) && (
                        <tr className="bg-default-50/50 dark:bg-default-100/10">
                          <td colSpan={6} className="px-0 py-0">
                            <div className="px-16 py-6 border-b border-divider/50 shadow-inner">
                              <div className="flex flex-col gap-4 max-w-4xl">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-bold uppercase tracking-widest text-default-500 flex items-center gap-2">
                                    <Database size={14} />
                                    Matches Across All Active Jobs
                                  </h4>
                                  <Button 
                                    color="primary" 
                                    variant="solid"
                                    isDisabled={!selectedJobs[app._id]} 
                                    isLoading={isAssigning}
                                    onPress={() => handleAssign(app._id)}
                                    size="sm"
                                    className="font-bold shadow-sm"
                                  >
                                    Assign to Selected Job
                                  </Button>
                                </div>
                                
                                {(!app.global_job_scores || app.global_job_scores.length === 0) ? (
                                  <p className="text-sm text-default-400 italic bg-default-100/50 p-4 rounded-xl border border-dashed border-divider">
                                    No jobs were evaluated.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[...app.global_job_scores].sort((a,b) => (b.final_score || 0) - (a.final_score || 0)).map((scoreEntry, idx) => {
                                      const isSelected = selectedJobs[app._id] === scoreEntry.job_id;
                                      return (
                                      <Card 
                                        key={scoreEntry.job_id || idx} 
                                        isPressable
                                        onPress={() => handleSelectJob(app._id, scoreEntry.job_id)}
                                        className={`shadow-sm border transition-all ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-divider/50 hover:border-default-400'}`}
                                      >
                                        <CardBody className="p-4 flex flex-col gap-3">
                                          <div>
                                            <p className="font-bold text-sm text-default-900 leading-tight truncate" title={scoreEntry.job_title}>
                                              {scoreEntry.job_title}
                                            </p>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                              <span className="text-[10px] text-default-400 uppercase tracking-widest font-bold">Match Score</span>
                                              <span className={`text-lg font-black ${
                                                scoreEntry.final_score >= 80 ? 'text-success' : 
                                                scoreEntry.final_score >= 60 ? 'text-warning' : 'text-danger'
                                              }`}>
                                                {scoreEntry.final_score?.toFixed(0) || 0}%
                                              </span>
                                            </div>
                                            <Progress 
                                              size="md"
                                              value={scoreEntry.final_score || 0}
                                              color={scoreEntry.final_score >= 80 ? 'success' : scoreEntry.final_score >= 60 ? 'warning' : 'danger'}
                                              className="w-20"
                                            />
                                          </div>
                                        </CardBody>
                                      </Card>
                                    )})}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Resume Viewer Modal */}
      <Modal 
        isOpen={isResumeOpen} 
        onOpenChange={onResumeOpenChange} 
        size="4xl" 
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-between items-center bg-default-50 border-b border-divider p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{resumePreviewApp?.candidate_name_extracted}</h3>
                    <p className="text-sm text-default-500 font-medium">Resume Preview</p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="p-0 overflow-hidden bg-default-50/50">
                <div className="h-[75vh] w-full">
                  <ResumeViewer application={resumePreviewApp} />
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-divider p-4">
                <Button color="primary" variant="flat" onPress={onClose} className="font-bold">
                  Close Preview
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </AppShell>
  );
}
