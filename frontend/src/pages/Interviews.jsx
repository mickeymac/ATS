import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import {
  Card,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Spinner,
  Accordion,
  AccordionItem,
  Divider,
  Chip,
  DatePicker,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip
} from '@nextui-org/react';
import { parseDate, Time, today, getLocalTimeZone } from '@internationalized/date';
import { Calendar, Clock, User, Mail, Link as LinkIcon, Video, CheckCircle, Trash2, Edit } from 'lucide-react';

export default function Interviews() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [scheduledMeeting, setScheduledMeeting] = useState(null);
  
  const [candidates, setCandidates] = useState([]);
  const [fetchingCandidates, setFetchingCandidates] = useState(false);

  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [pastMeetings, setPastMeetings] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchInterviews = async () => {
    setLoadingList(true);
    try {
      const response = await api.get('/interviews/');
      const allInterviews = response.data.interviews || [];
      
      const now = new Date();
      const upcoming = [];
      const past = [];
      
      allInterviews.forEach(interview => {
          const meetingDate = new Date(`${interview.date}T${interview.time}:00`);
          if (meetingDate < now) {
              past.push(interview);
          } else {
              upcoming.push(interview);
          }
      });
      
      setUpcomingMeetings(upcoming);
      setPastMeetings(past);
    } catch (error) {
      console.error('Failed to fetch scheduled interviews', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const [formData, setFormData] = useState({
    candidate_name: '',
    candidate_email: '',
    date: null,
    time: '',
    duration: '30',
    application_id: ''
  });

  const durationOptions = [
    { value: '15', label: '15 Minutes' },
    { value: '30', label: '30 Minutes' },
    { value: '45', label: '45 Minutes' },
    { value: '60', label: '60 Minutes' }
  ];

  const timeOptions = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 15) {
      const h = String(i).padStart(2, '0');
      const m = String(j).padStart(2, '0');
      timeOptions.push({ value: `${h}:${m}`, label: `${h}:${m}` });
    }
  }

  const getAvailableTimeOptions = (selectedDate) => {
    const tz = getLocalTimeZone();
    const currentDate = today(tz);
    
    if (!selectedDate || selectedDate.compare(currentDate) > 0) {
      return timeOptions;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    return timeOptions.filter(opt => {
      const [hStr, mStr] = opt.value.split(':');
      const hStrInt = parseInt(hStr);
      const mStrInt = parseInt(mStr);
      if (hStrInt > currentHour) return true;
      if (hStrInt === currentHour && mStrInt > currentMinute) return true;
      return false;
    });
  };

  useEffect(() => {
    // Check if we came from Applications page
    if (location.state) {
      setFormData(prev => ({
        ...prev,
        candidate_name: location.state.candidate_name || '',
        candidate_email: location.state.candidate_email || '',
        application_id: location.state.application_id || ''
      }));
    }
  }, [location.state]);

  useEffect(() => {
    const fetchEligibleCandidates = async () => {
      setFetchingCandidates(true);
      try {
        const endpoint = user?.role === 'recruiter' ? '/applications/my-uploads' : '/applications/';
        // Using a high limit to ensure we fetch active applications
        const response = await api.get(endpoint, { params: { limit: 200 } });
        const items = response.data.items || response.data;
        // Filter those who are eligible for interview
        const eligible = items.filter(app => 
          app.status === 'Shortlisted' || 
          app.status === 'Interview Scheduled' ||
          app.review_status === 'approved'
        );
        setCandidates(eligible);
      } catch (error) {
        console.error('Failed to fetch candidates', error);
      } finally {
        setFetchingCandidates(false);
      }
    };
    fetchEligibleCandidates();
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSchedule = async () => {
    if (!formData.candidate_name || !formData.candidate_email || !formData.date || !formData.time) {
      addToast('Please fill out all required fields.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Parse CalendarDate and string time into primitive ISO strings
      const dStr = `${formData.date.year}-${String(formData.date.month).padStart(2, '0')}-${String(formData.date.day).padStart(2, '0')}`;
      const tStr = formData.time;
      const dateTimeString = `${dStr}T${tStr}:00`;

      const payload = {
        candidate_name: formData.candidate_name,
        candidate_email: formData.candidate_email,
        start_time: dateTimeString,
        duration: parseInt(formData.duration),
        application_id: formData.application_id || null
      };

      const response = await api.post('/interviews/schedule', payload);
      
      if (response.data.success) {
        addToast('Interview successfully scheduled via Zoom!', 'success');
        setScheduledMeeting({
          ...response.data.interview,
          link: response.data.link
        });
        
        setFormData({
          candidate_name: '',
          candidate_email: '',
          date: null,
          time: '',
          duration: '30',
          application_id: ''
        });
        
        fetchInterviews();
      } else {
        addToast(response.data.error || 'Failed to generate meeting link', 'error');
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'An unexpected error occurred while contacting Zoom API';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingInterview, setEditingInterview] = useState(null);
  const [editFormData, setEditFormData] = useState({ date: null, time: '', duration: '30' });
  const [updating, setUpdating] = useState(false);

  // handlers
  const handleEditOpen = (interview) => {
    setEditingInterview(interview);
    setEditFormData({
      date: interview.date ? parseDate(interview.date) : null,
      time: interview.time,
      duration: String(interview.duration || 30)
    });
    onOpen();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this scheduled meeting?")) return;
    try {
      await api.delete(`/interviews/${id}`);
      addToast("Meeting deleted successfully", "success");
      fetchInterviews();
      if (scheduledMeeting && scheduledMeeting._id === id) {
          setScheduledMeeting(null);
      }
    } catch (e) {
      addToast("Failed to delete interview", "error");
    }
  };

  const handleEditSubmit = async () => {
    if (!editFormData.date || !editFormData.time) {
      addToast("Please provide date and time.", "warning");
      return;
    }
    setUpdating(true);
    try {
      const dStr = `${editFormData.date.year}-${String(editFormData.date.month).padStart(2, '0')}-${String(editFormData.date.day).padStart(2, '0')}`;
      const payload = {
        date: dStr,
        time: editFormData.time,
        duration: parseInt(editFormData.duration)
      };
      await api.put(`/interviews/${editingInterview._id}`, payload);
      addToast("Meeting updated successfully", "success");
      onClose();
      fetchInterviews();
      
      if (scheduledMeeting && scheduledMeeting._id === editingInterview._id) {
          setScheduledMeeting({
              ...scheduledMeeting,
              date: dStr,
              time: editFormData.time,
              duration: parseInt(editFormData.duration)
          });
      }
    } catch (e) {
      addToast("Failed to update interview", "error");
    } finally {
      setUpdating(false);
    }
  };


  const renderTableRows = (meetings, isPast = false) => {
    return meetings.map(interview => (
      <TableRow key={interview._id}>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-bold text-default-900">{interview.candidate}</span>
            <span className="text-xs text-default-500">{interview.email}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-semibold text-default-900">{interview.date}</span>
            <span className="text-xs text-default-500">{interview.time} IST</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium text-default-700">{interview.duration} Min</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-default-400" />
            <span className="text-xs font-bold text-default-700">{interview.scheduled_by_name || 'Unknown'}</span>
          </div>
        </TableCell>
        <TableCell>
          {isPast ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-default-100 text-default-400 text-xs font-bold uppercase tracking-widest cursor-not-allowed opacity-70">
              <Video size={14} /> Expired
            </div>
          ) : (
            <a href={interview.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold uppercase tracking-widest break-all whitespace-normal lg:whitespace-nowrap">
              <Video size={14} /> Join Meeting
            </a>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Tooltip content="Edit Meeting">
              <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => handleEditOpen(interview)}>
                <Edit size={16} />
              </Button>
            </Tooltip>
            <Tooltip content="Delete Meeting">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(interview._id)}>
                <Trash2 size={16} />
              </Button>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-default-900">
            Schedule Interview
          </h1>
          <p className="text-default-500 text-lg">
            Generate and store secure Zoom meeting links for candidate interviews.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="grid md:grid-cols-12 gap-6 items-start">
          
          {/* Scheduling Form */}
          <Card className="border border-divider shadow-sm bg-content1 md:col-span-7">
            <CardBody className="p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-default-900 flex items-center gap-2">
                  <Video className="text-primary" size={24} />
                  Meeting Configuration
                </h3>
              </div>

              {candidates.length > 0 && (
                <div className="bg-default-50 p-4 rounded-xl border border-divider/50 space-y-3">
                  <div className="flex items-center gap-2 text-default-700">
                    <CheckCircle size={16} className="text-success" />
                    <span className="text-sm font-bold uppercase tracking-widest text-default-500">Fast Auto-Fill</span>
                  </div>
                  <Select
                    label="Autofill from Applications"
                    placeholder="Select a shortlisted candidate..."
                    variant="bordered"
                    isLoading={fetchingCandidates}
                    selectedKeys={formData.application_id ? [formData.application_id] : []}
                    onSelectionChange={(keys) => {
                      const id = Array.from(keys)[0];
                      if (!id) return;
                      const selected = candidates.find(c => c._id === id);
                      if (selected) {
                        setFormData(prev => ({
                          ...prev,
                          candidate_name: selected.candidate_name_extracted || '',
                          candidate_email: selected.candidate_email || '',
                          application_id: selected._id
                        }));
                        addToast(`Loaded ${selected.candidate_name_extracted}'s details`, 'success');
                      }
                    }}
                    startContent={<User size={18} className="text-default-400" />}
                    classNames={{
                        trigger: "bg-default-100 hover:bg-default-200 border border-divider hover:border-primary/50 transition-colors",
                        value: "text-foreground font-bold"
                    }}
                    renderValue={(items) => {
                      return items.map((item) => {
                        const parts = item.textValue ? item.textValue.split(' - ') : ['Unknown', 'Unknown'];
                        return (
                          <div key={item.key} className="flex items-center gap-2">
                            <span className="font-bold text-default-900">{parts[0]}</span>
                            <span className="text-default-400 text-xs">({parts[1]})</span>
                          </div>
                        );
                      });
                    }}
                  >
                    {candidates.map(c => (
                      <SelectItem key={c._id} value={c._id} textValue={`${c.candidate_name_extracted} - ${c.job_title}`}>
                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col">
                            <span className="font-bold">{c.candidate_name_extracted}</span>
                            <span className="text-[10px] uppercase text-default-400 tracking-wider">
                              {c.candidate_email}
                            </span>
                          </div>
                          <Chip size="sm" variant="flat" color={c.status === 'Shortlisted' ? 'success' : 'primary'} className="h-5 text-[10px] font-bold">
                            {c.job_title}
                          </Chip>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  isRequired
                  label="Candidate Name"
                  placeholder="John Doe"
                  variant="bordered"
                  startContent={<User size={18} className="text-default-400" />}
                  value={formData.candidate_name}
                  onValueChange={(val) => handleInputChange('candidate_name', val)}
                />
                
                <Input
                  isRequired
                  type="email"
                  label="Candidate Email"
                  placeholder="john@example.com"
                  variant="bordered"
                  startContent={<Mail size={18} className="text-default-400" />}
                  value={formData.candidate_email}
                  onValueChange={(val) => handleInputChange('candidate_email', val)}
                />
              </div>

              <div className="grid grid-cols-3 gap-6 pt-2">
                <DatePicker
                  isRequired
                  label="Interview Date"
                  labelPlacement="outside"
                  variant="bordered"
                  className="flex-1"
                  value={formData.date}
                  minValue={today(getLocalTimeZone())}
                  onChange={(val) => handleInputChange('date', val)}
                />
                <Select
                  isRequired
                  label="Time (IST)"
                  labelPlacement="outside"
                  placeholder="Select Time"
                  classNames={{
                    trigger: "bg-default-50 border border-divider hover:border-primary/50 h-12 shadow-sm",
                    label: "font-semibold text-default-700 pb-1",
                    value: "text-default-900 font-medium",
                    listbox: "max-h-[300px]"
                  }}
                  selectedKeys={formData.time ? [formData.time] : []}
                  onSelectionChange={(keys) => handleInputChange('time', Array.from(keys)[0])}
                  startContent={<Clock size={16} className="text-primary mr-1" />}
                >
                  {getAvailableTimeOptions(formData.date).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  isRequired
                  label="Duration"
                  labelPlacement="outside"
                  placeholder="Select Duration"
                  classNames={{
                    trigger: "bg-default-50 border border-divider hover:border-primary/50 h-12 shadow-sm",
                    label: "font-semibold text-default-700 pb-1",
                    value: "text-default-900 font-medium"
                  }}
                  selectedKeys={formData.duration ? [formData.duration] : []}
                  onSelectionChange={(keys) => handleInputChange('duration', Array.from(keys)[0])}
                  startContent={<Clock size={16} className="text-primary mr-1" />}
                >
                  {durationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <Divider className="my-2 opacity-50" />

              <Button 
                color="primary" 
                size="lg" 
                className="w-full font-black shadow-md mt-2 text-sm uppercase tracking-widest"
                onPress={handleSchedule}
                isLoading={loading}
              >
                {loading ? 'Generating Link...' : 'Generate Zoom Meeting'}
              </Button>
            </CardBody>
          </Card>

          {/* Success Banner / Recent */}
          <div className="flex flex-col gap-6 md:col-span-5 h-full">
            {scheduledMeeting ? (
              <Card className="border-2 border-success-400 bg-success-50 shadow-md h-full">
                <CardBody className="p-8 flex flex-col gap-6 text-success-900 justify-center items-center text-center">
                  <div className="p-4 bg-success-100 rounded-full text-success-600 mb-2">
                    <Calendar size={40} />
                  </div>
                  <h3 className="text-xl font-black">
                    Meeting Scheduled!
                  </h3>
                  
                  <div className="text-sm space-y-3 w-full bg-content1 shadow-sm p-5 rounded-2xl border border-success-200/50">
                    <div className="flex flex-col items-center pb-3 border-b border-divider">
                      <span className="font-extrabold text-foreground text-lg">{scheduledMeeting.candidate}</span>
                      <span className="text-success-600 font-medium">{scheduledMeeting.email}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2 text-default-700">
                       <Clock size={16} className="text-success-500" />
                      <span className="font-bold text-foreground">{scheduledMeeting.date}</span> <span className="text-default-500">at</span> <span className="font-bold text-foreground">{scheduledMeeting.time} IST</span>
                    </div>
                  </div>

                  <div className="w-full mt-2 p-5 bg-content1 shadow-sm rounded-2xl border border-success-200/50 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <LinkIcon size={14} className="text-success-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-success-500">Meeting Link</span>
                    </div>
                    <a 
                      href={scheduledMeeting.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary font-bold hover:underline break-all text-sm transition-colors text-center px-4 py-2 bg-primary/5 rounded-lg border border-primary/20 w-full"
                    >
                      {scheduledMeeting.link}
                    </a>
                  </div>
                </CardBody>
              </Card>
            ) : (
               <Card className="border border-divider bg-transparent shadow-none shadow-sm h-full">
                <CardBody className="p-8 flex flex-col items-center justify-center text-center text-default-400">
                  <Video size={48} className="mb-4 opacity-30" />
                  <p className="font-bold text-default-600 text-lg">No Output Tracked</p>
                  <p className="text-sm mt-2 max-w-xs leading-relaxed">Fill out the configuration block. Once submitted, your newly created scheduled invitation URL will appear here securely.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>

        {/* Interviews List Area */}
        <div className="mt-2 text-default-900">
          <Card className="border border-divider shadow-sm bg-content1">
            <CardBody className="p-8">
              <Accordion selectionMode="multiple" defaultExpandedKeys={["upcoming"]}>
                <AccordionItem 
                  key="upcoming" 
                  aria-label="Upcoming Meetings" 
                  title={<div className="font-bold text-lg flex items-center gap-2"><Calendar className="text-primary" size={20} /> Upcoming Meetings <Chip size="sm" color="primary" variant="flat">{upcomingMeetings.length}</Chip></div>}
                >
                  <Table aria-label="Upcoming Meetings Table" removeWrapper className="w-full mb-4">
                    <TableHeader>
                      <TableColumn>CANDIDATE</TableColumn>
                      <TableColumn>DATE & TIME</TableColumn>
                      <TableColumn>DURATION</TableColumn>
                      <TableColumn>SCHEDULED BY</TableColumn>
                      <TableColumn>MEETING LINK</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={loadingList ? <Spinner size="lg" /> : "No upcoming meetings found."}>
                      {renderTableRows(upcomingMeetings, false)}
                    </TableBody>
                  </Table>
                </AccordionItem>
                <AccordionItem 
                  key="past" 
                  aria-label="Past Meetings" 
                  title={<div className="font-bold text-lg flex items-center gap-2"><Clock className="text-default-400" size={20} /> Past Meetings <Chip size="sm" variant="flat">{pastMeetings.length}</Chip></div>}
                >
                  <Table aria-label="Past Meetings Table" removeWrapper className="w-full mb-4">
                    <TableHeader>
                      <TableColumn>CANDIDATE</TableColumn>
                      <TableColumn>DATE & TIME</TableColumn>
                      <TableColumn>DURATION</TableColumn>
                      <TableColumn>SCHEDULED BY</TableColumn>
                      <TableColumn>MEETING LINK</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={loadingList ? <Spinner size="lg" /> : "No past meetings found. They have all been completed!"}>
                      {renderTableRows(pastMeetings, true)}
                    </TableBody>
                  </Table>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Edit Meeting</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <DatePicker
                    isRequired
                    label="Interview Date"
                    variant="bordered"
                    value={editFormData.date}
                    minValue={today(getLocalTimeZone())}
                    onChange={(val) => setEditFormData(prev => ({...prev, date: val}))}
                  />
                  <Select
                    isRequired
                    label="Time (IST)"
                    variant="bordered"
                    selectedKeys={editFormData.time ? [editFormData.time] : []}
                    onSelectionChange={(keys) => setEditFormData(prev => ({...prev, time: Array.from(keys)[0]}))}
                  >
                    {getAvailableTimeOptions(editFormData.date).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    isRequired
                    label="Duration"
                    variant="bordered"
                    selectedKeys={editFormData.duration ? [editFormData.duration] : []}
                    onSelectionChange={(keys) => setEditFormData(prev => ({...prev, duration: Array.from(keys)[0]}))}
                  >
                    {durationOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleEditSubmit} isLoading={updating}>
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </AppShell>
  );
}
