import { useCallback, useEffect, useState } from 'react';
import { getInitials } from '../utils/helpers';
import api from '../services/api';
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
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Tooltip
} from '@nextui-org/react';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatCardSkeleton, TableSkeleton } from '../components/SkeletonLoaders';
import { formatLastUpdated } from '../utils/export';
import { useToast } from '../context/ToastContext';
import { Users, UserCheck, UserX, CalendarCheck, Upload, Plus, MoreVertical, RefreshCw } from 'lucide-react';
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

const AdminDashboard = () => {
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

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get('/jobs/'),
        api.get('/applications/')
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

      // Chart data: Calculate actual applicants and shortlists for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyDataMap = new Map();

      // Initialize last 6 months with 0
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyDataMap.set(key, {
          name: months[d.getMonth()],
          applicants: 0,
          shortlisted: 0
        });
      }

      // Aggregate data from applications
      apps.forEach(app => {
        if (!app.applied_at) return;
        const d = new Date(app.applied_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthlyDataMap.has(key)) {
          const dataNode = monthlyDataMap.get(key);
          dataNode.applicants += 1;
          if (app.status === 'Shortlisted' || app.status === 'Selected') {
            dataNode.shortlisted += 1;
          }
        }
      });

      const monthlyData = Array.from(monthlyDataMap.values());
      setChartData(monthlyData);
      setLastUpdated(new Date());

    } catch {
      addToast("Failed to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
            {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={5} columns={4} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Dashboard Overview</h1>
            <p className="text-default-600">Welcome back, here&apos;s what&apos;s happening today.</p>
            {lastUpdated && (
              <p className="text-xs text-default-400">Last updated: {formatLastUpdated(lastUpdated)}</p>
            )}
          </div>
          <Tooltip content="Refresh">
            <Button isIconOnly variant="flat" onPress={fetchDashboardData}>
              <RefreshCw size={18} />
            </Button>
          </Tooltip>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            color="primary"
            startContent={<Upload size={18} />}
            onPress={onOpen}
          >
            Upload Resume
          </Button>
          <Button
            as={Link}
            to="/jobs"
            variant="bordered"
            startContent={<Plus size={18} />}
          >
            View Jobs
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        {/* Charts and Recent Activity */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ApplicationTrendsChart data={chartData} />
          </div>

          <Card className="shadow-sm border border-divider">
            <CardHeader className="pb-0 pt-6 px-6">
              <h3 className="font-semibold text-lg text-default-900">Recent Activity</h3>
            </CardHeader>
            <CardBody className="px-6 pb-6 gap-4">
              {recentApps.map((app) => (
                <div key={app._id} className="flex items-center justify-between border-b border-divider pb-2 last:border-none">
                  <div className="flex items-center gap-3">
                    <User
                      name={app.candidate_name_extracted || 'Unknown'}
                      description={app.job_title}
                      avatarProps={{
                        name: getInitials(app.candidate_name_extracted),
                        showFallback: true,
                        size: "sm"
                      }}
                      classNames={{
                        name: "text-default-900 font-medium",
                        description: "text-default-600",
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <Chip size="sm" variant="flat" color={statusColorMap[app.status] || "default"}>
                      {app.status}
                    </Chip>
                    <span className="text-xs text-default-600 mt-1">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              <Button as={Link} to="/applications" variant="flat" size="sm" className="w-full mt-2">
                View All Applications
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Recent Applications Table */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="flex items-center justify-between px-6 pt-6 pb-2">
            <h3 className="font-semibold text-lg text-default-900">Recent Applications</h3>
            <Button size="sm" variant="light" as={Link} to="/applications">View All</Button>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <Table aria-label="Recent applications table" removeWrapper>
              <TableHeader>
                <TableColumn>CANDIDATE</TableColumn>
                <TableColumn>ROLE</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>SCORE</TableColumn>
                <TableColumn>DATE</TableColumn>
              </TableHeader>
              <TableBody>
                {recentApps.map((app) => {
                  const displayScore = app.final_score || app.match_score || 0;
                  return (
                    <TableRow key={app._id}>
                      <TableCell>
                        <User
                          avatarProps={{ radius: "lg", name: getInitials(app.candidate_name_extracted), showFallback: true }}
                          name={app.candidate_name_extracted || 'Unknown'}
                          description={app.candidate_email_extracted}
                          classNames={{
                            name: "text-default-900",
                            description: "text-default-500",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-default-900">{app.job_title}</span>
                        </div>
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
                        <span className={`font-semibold ${displayScore >= 80 ? 'text-success' :
                            displayScore >= 60 ? 'text-warning' : 'text-danger'
                          }`}>
                          {displayScore?.toFixed(0) || 0}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-default-500 text-sm">
                          {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

export default AdminDashboard;
