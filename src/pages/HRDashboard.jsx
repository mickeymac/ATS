import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  User, 
  Chip, 
  Avatar,
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
  Tooltip
} from '@nextui-org/react';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatCardSkeleton, TableSkeleton } from '../components/SkeletonLoaders';
import { formatLastUpdated } from '../utils/export';
import { useToast } from '../context/ToastContext';
import { Users, UserCheck, UserX, CalendarCheck, Upload, Plus, MoreVertical, RefreshCw, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ApplicationTrendsChart } from '../components/dashboard/Charts';

const statusColorMap = {
  Shortlisted: "success",
  "Under Review": "warning",
  Rejected: "danger",
  "Interview Scheduled": "primary",
  Applied: "default",
  Selected: "success"
};

const HRDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalJobs: 0, totalApps: 0, shortlisted: 0, pending: 0 });
  const [recentApps, setRecentApps] = useState([]);
  const [chartData, setChartData] = useState([]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Upload resume state
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isRecruiter = user?.role === 'recruiter';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Recruiters see only their own uploads, others see all
      const appsEndpoint = isRecruiter ? '/applications/my-uploads' : '/applications/';
      
      const [jobsRes, appsRes] = await Promise.all([
        api.get('/jobs/'),
        api.get(appsEndpoint)
      ]);

      // Handle paginated response format
      const jobsData = jobsRes.data;
      const jobsList = jobsData.items || jobsData;
      const appsData = appsRes.data;
      const apps = appsData.items || appsData;
      
      setJobs(jobsList);

      const pendingStatuses = new Set(['Applied', 'Under Review']);

      const statsCalc = {
        totalJobs: jobsList.length,
        totalApps: apps.length,
        shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
        pending: apps.filter(a => pendingStatuses.has(a.status)).length
      };
      setStats(statsCalc);

      setRecentApps(apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).slice(0, 5));

      // Chart data: Apps per month (mock for now, could be calculated from real data)
      const monthlyData = [
        { name: 'Jan', applicants: Math.floor(apps.length * 0.8), shortlisted: Math.floor(statsCalc.shortlisted * 0.6) },
        { name: 'Feb', applicants: Math.floor(apps.length * 0.6), shortlisted: Math.floor(statsCalc.shortlisted * 0.3) },
        { name: 'Mar', applicants: Math.floor(apps.length * 0.4), shortlisted: Math.floor(statsCalc.shortlisted * 0.5) },
        { name: 'Apr', applicants: Math.floor(apps.length * 0.5), shortlisted: Math.floor(statsCalc.shortlisted * 0.8) },
        { name: 'May', applicants: Math.floor(apps.length * 0.3), shortlisted: Math.floor(statsCalc.shortlisted * 1.0) },
        { name: 'Jun', applicants: apps.length, shortlisted: statsCalc.shortlisted },
      ];
      setChartData(monthlyData);
      setLastUpdated(new Date());

    } catch {
      addToast("Failed to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, isRecruiter]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(file.type)) {
        addToast("Please upload a PDF, DOC, DOCX, or TXT file.", "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadResume = async () => {
    if (!selectedJobId) {
      addToast("Please select a job.", "error");
      return;
    }
    if (!selectedFile) {
      addToast("Please select a resume file.", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('job_id', selectedJobId);
      formData.append('file', selectedFile);

      await api.post('/applications/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast("Resume uploaded successfully!", "success");
      onClose();
      setSelectedJobId('');
      setSelectedFile(null);
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      addToast(error.response?.data?.detail || "Failed to upload resume.", "error");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Dashboard Overview</h1>
            <p className="text-default-600">Loading dashboard...</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={5} columns={4} />
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
            <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Dashboard Overview</h1>
            <p className="text-default-500 text-lg">Welcome back, here&apos;s what&apos;s happening today.</p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-default-400 mt-1">
                <Clock size={12} />
                <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="Refresh dashboard">
              <Button 
                variant="flat" 
                onPress={fetchDashboardData}
                className="bg-default-100 hover:bg-default-200 min-w-10 px-0 h-10 w-10"
              >
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
            <Button 
              color="primary" 
              startContent={<Upload size={20} />}
              onPress={onOpen}
              className="h-10 font-bold px-6 shadow-md"
            >
              Upload Resume
            </Button>
            <Button 
              as={Link}
              to="/jobs"
              variant="flat"
              startContent={<Plus size={20} />}
              className="h-10 font-bold px-6 bg-default-100 hover:bg-default-200"
            >
              View Jobs
            </Button>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard 
            title="Total Applicants" 
            value={stats.totalApps.toString()} 
            trend="12%" 
            trendUp={true} 
            icon={Users}
            color="primary"
          />
          <StatsCard 
            title="Shortlisted" 
            value={stats.shortlisted.toString()} 
            trend="5%" 
            trendUp={true} 
            icon={UserCheck}
            color="success"
          />
          <StatsCard 
            title="Pending Review" 
            value={stats.pending.toString()} 
            trend="2%" 
            trendUp={false} 
            icon={UserX}
            color="danger"
          />
          <StatsCard 
            title="Total Jobs" 
            value={stats.totalJobs.toString()} 
            trend="8%" 
            trendUp={true} 
            icon={CalendarCheck}
            color="warning"
          />
        </div>

        {/* Charts and Activity Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-visible h-full">
              <CardBody className="p-0">
                <ApplicationTrendsChart data={chartData} />
              </CardBody>
            </Card>
          </div>
          
          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20">
            <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6 pb-2">
              <h3 className="text-xl font-bold text-default-900">Recent Activity</h3>
              <p className="text-xs text-default-500 font-medium uppercase tracking-widest">Latest Candidate Updates</p>
            </CardHeader>
            <CardBody className="px-6 pb-6 gap-6">
              {recentApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-default-400 italic gap-2">
                  <RefreshCw size={24} className="opacity-20 animate-spin-slow" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {recentApps.map((app) => (
                    <div key={app._id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={`https://i.pravatar.cc/150?u=${app._id}`} 
                          name={app.candidate_name_extracted?.charAt(0)}
                          size="sm"
                          isBordered
                          className="w-10 h-10 border-2 border-background shadow-sm"
                        />
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-default-900 group-hover:text-primary transition-colors leading-tight">
                            {app.candidate_name_extracted || 'Unknown'}
                          </p>
                          <p className="text-[11px] text-default-500 font-medium mt-0.5">{app.job_title}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Chip 
                          size="sm" 
                          variant="flat" 
                          color={statusColorMap[app.status] || "default"}
                          className="h-5 text-[10px] font-extrabold uppercase"
                        >
                          {app.status}
                        </Chip>
                        <div className="flex items-center gap-1 text-[10px] text-default-400 font-bold">
                          <Clock size={10} />
                          <span>{new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                as={Link} 
                to="/applications" 
                variant="flat" 
                size="md" 
                className="w-full mt-2 font-bold bg-default-100 dark:bg-default-100/50 hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                View All Applications
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Recent Applications Table Card */}
        <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden">
          <CardHeader className="flex items-center justify-between px-8 py-6 border-b border-divider bg-default-50 dark:bg-default-50/50">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-default-900 leading-tight">Recent Submissions</h3>
              <p className="text-xs text-default-500 font-medium uppercase tracking-widest">In-depth application status</p>
            </div>
            <Button 
              size="sm" 
              variant="flat" 
              as={Link} 
              to="/applications"
              className="font-bold bg-default-100 dark:bg-default-100 hover:bg-default-200"
              startContent={<Users size={14} />}
            >
              View Full Pipeline
            </Button>
          </CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="bg-default-50 dark:bg-default-100/50 border-b border-divider">
                  <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Candidate</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Position</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Status</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Score</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-default-500">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/50">
                {recentApps.map((app) => (
                  <tr key={app._id} className="group hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors cursor-pointer" onClick={() => {}}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={`https://i.pravatar.cc/150?u=${app._id}`} 
                          name={app.candidate_name_extracted?.charAt(0)}
                          size="sm"
                          isBordered
                          className="w-10 h-10 text-xs font-bold"
                        />
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-default-900 group-hover:text-primary transition-colors leading-tight">
                            {app.candidate_name_extracted || 'Unknown'}
                          </p>
                          <p className="text-[11px] text-default-500 dark:text-default-400 mt-0.5 font-medium">{app.candidate_email_extracted}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-default-800 dark:text-default-700">{app.job_title}</span>
                        <span className="text-[10px] font-medium text-default-400 uppercase tracking-tighter">Target Role</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Chip 
                        size="sm" 
                        variant="flat" 
                        color={statusColorMap[app.status] || "default"}
                        className="font-bold uppercase text-[10px]"
                      >
                        {app.status}
                      </Chip>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5 w-24">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${
                            app.match_score >= 80 ? 'text-success' : 
                            app.match_score >= 60 ? 'text-warning' : 'text-danger'
                          }`}>
                            {app.match_score?.toFixed(0) || 0}%
                          </span>
                          <Users size={12} className={app.match_score >= 80 ? 'text-success' : app.match_score >= 60 ? 'text-warning' : 'text-danger'} />
                        </div>
                        <Progress 
                          size="sm" 
                          value={app.match_score || 0} 
                          color={app.match_score >= 80 ? 'success' : app.match_score >= 60 ? 'warning' : 'danger'}
                          className="h-1.5"
                        />
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-default-500 dark:text-default-400">
                        <Clock size={14} className="opacity-50" />
                        <span className="text-xs font-medium">
                          {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      {/* Upload Resume Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">Upload Resume</h2>
                <p className="text-sm text-default-500 font-normal">Add a new candidate to the system</p>
              </ModalHeader>
              <ModalBody>
                <Select
                  label="Job Position"
                  placeholder="Select a job position"
                  selectedKeys={selectedJobId ? [selectedJobId] : []}
                  onSelectionChange={(keys) => setSelectedJobId(Array.from(keys)[0])}
                >
                  {jobs.map((job) => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </Select>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-default-700">
                    Resume File
                  </label>
                  <div className="border-2 border-dashed border-divider rounded-xl p-6 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-10 w-10 text-default-400 mb-2" />
                      <p className="text-sm text-default-500">
                        {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-default-400 mt-1">PDF, DOC, DOCX, or TXT</p>
                    </label>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleUploadResume}
                  isLoading={uploading}
                >
                  Upload
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
};

export default HRDashboard;
