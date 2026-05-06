import { Bell, Search, Users, CheckCircle, MessageSquare, X, Sun, Moon, Briefcase } from 'lucide-react';
import { 
  Input, 
  Avatar, 
  Badge, 
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Card,
  CardBody,
  Spinner,
  Listbox,
  ListboxItem,
  User,
  Tooltip
} from '@nextui-org/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export function Navbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { subscribe, isConnected } = useSocket();
  const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ jobs: [], candidates: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Global Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        setShowSearchResults(true);
        try {
          const response = await api.get(`/search/?q=${searchQuery}`);
          setSearchResults(response.data);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setShowSearchResults(false);
        setSearchResults({ jobs: [], candidates: [] });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleResultClick = (type, id) => {
    setShowSearchResults(false);
    setSearchQuery('');
    if (type === 'job') {
      navigate('/jobs'); // Could be improved to scroll to or open modal
    } else {
      navigate('/applications'); // Could be improved to show details
    }
  };

  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/notifications/count');
      setNotificationCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch notification count', error);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoadingNotifications(true);
    try {
      const response = await api.get('/notifications/');
      setNotifications(response.data);
      setNotificationCount(response.data.length);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  // Subscribe to real-time notification events
  useEffect(() => {
    if (!user || !isConnected) return;

    // Subscribe to new notifications
    const unsubscribeNew = subscribe('notification:new', (data) => {
      console.log('[Socket] New notification received:', data);
      // Add to notifications list if popover is open
      setNotifications(prev => [{
        _id: Date.now().toString(), // Temporary ID until refresh
        ...data,
        created_at: new Date().toISOString()
      }, ...prev]);
      // Increment count
      setNotificationCount(prev => prev + 1);
    });

    // Subscribe to notification count updates
    const unsubscribeCount = subscribe('notification:count', (data) => {
      console.log('[Socket] Notification count updated:', data.count);
      setNotificationCount(data.count);
    });

    return () => {
      unsubscribeNew();
      unsubscribeCount();
    };
  }, [user, isConnected, subscribe]);

  // Fetch count on mount and periodically (fallback for socket disconnection)
  useEffect(() => {
    fetchNotificationCount();
    // Use longer interval since we have real-time updates
    const interval = setInterval(fetchNotificationCount, 60000); // Every 60 seconds as fallback
    return () => clearInterval(interval);
  }, [fetchNotificationCount]);

  // Fetch full notifications when popover opens
  useEffect(() => {
    if (isPopoverOpen) {
      fetchNotifications();
    }
  }, [isPopoverOpen, fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications([]);
      setNotificationCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Navigate based on notification type
    if (notification.type === 'review_request') {
      navigate('/review');
    } else if (notification.type === 'review_completed') {
      navigate('/my-uploads');
    } else if (notification.type === 'job_created' || notification.type === 'job_assigned') {
      navigate('/jobs');
    }
    handleMarkAsRead(notification._id);
    setIsPopoverOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'review_request':
        return <Users size={16} className="text-primary" />;
      case 'review_completed':
        return <CheckCircle size={16} className="text-success" />;
      case 'comment_added':
        return <MessageSquare size={16} className="text-secondary" />;
      case 'job_created':
        return <Briefcase size={16} className="text-warning" />;
      case 'job_assigned':
        return <Briefcase size={16} className="text-success" />;
      default:
        return <Bell size={16} className="text-default-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-divider/70 bg-content1/70 px-4 sm:px-6 lg:px-8 backdrop-blur-xl">
      <div className="relative flex w-full max-w-xl items-center">
          <Input
            classNames={{
              base: "h-11",
              mainWrapper: "h-full",
              input: "text-small",
              inputWrapper: "h-full font-normal text-default-600 bg-content2/70 border border-divider/60 shadow-sm",
            }}
            placeholder="Search candidates, jobs, applications..."
            size="sm"
            startContent={isSearching ? <Spinner size="sm" /> : <Search size={18} />}
            type="search"
            value={searchQuery}
            onValueChange={setSearchQuery}
            onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
          />

          {showSearchResults && (searchQuery.length >= 2) && (
            <Card className="absolute top-12 w-full z-50 shadow-xl border border-divider">
              <CardBody className="p-2 max-h-[400px] overflow-y-auto">
                {searchResults.jobs.length === 0 && searchResults.candidates.length === 0 && !isSearching ? (
                  <div className="p-4 text-center text-default-500 text-sm italic">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.jobs.length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-[10px] font-bold text-default-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Briefcase size={12} />
                          Jobs
                        </p>
                        <Listbox aria-label="Job results" variant="flat">
                          {searchResults.jobs.map(job => (
                            <ListboxItem 
                              key={job.id} 
                              description={job.location}
                              onPress={() => handleResultClick('job', job.id)}
                            >
                              {job.title}
                            </ListboxItem>
                          ))}
                        </Listbox>
                      </div>
                    )}
                    
                    {searchResults.candidates.length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-[10px] font-bold text-default-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Users size={12} />
                          Candidates
                        </p>
                        <Listbox aria-label="Candidate results" variant="flat">
                          {searchResults.candidates.map(candidate => (
                            <ListboxItem 
                              key={candidate.id}
                              onPress={() => handleResultClick('candidate', candidate.id)}
                              textValue={candidate.name}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar 
                                  name={candidate.name?.charAt(0)} 
                                  size="sm" 
                                  className="w-6 h-6 text-[10px]"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{candidate.name}</span>
                                  <span className="text-[10px] text-default-400">{candidate.job_title}</span>
                                </div>
                              </div>
                            </ListboxItem>
                          ))}
                        </Listbox>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
          
          {showSearchResults && (
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowSearchResults(false)}
            />
          )}
        </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Dark Mode Toggle */}
        <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <Button 
            isIconOnly 
            variant="flat" 
            className="text-default-600 bg-content2/70 border border-divider/60"
            onPress={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </Tooltip>

        <Popover 
          placement="bottom-end" 
          offset={20} 
          showArrow
          isOpen={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
        >
          <PopoverTrigger>
            <Button isIconOnly variant="flat" className="text-default-600 bg-content2/70 border border-divider/60">
              {notificationCount > 0 ? (
                <Badge content={notificationCount} color="danger" shape="circle" size="sm">
                  <Bell size={20} />
                </Badge>
              ) : (
                <Bell size={20} />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Card className="border-none shadow-none">
              <CardBody className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-default-900">Notifications</h4>
                  {notifications.length > 0 && (
                    <Button size="sm" variant="light" className="text-primary" onPress={handleMarkAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                
                {loadingNotifications ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto text-default-300 mb-2" />
                    <p className="text-sm text-default-500">No new notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div 
                        key={notification._id}
                        className="flex gap-3 p-2 rounded-lg hover:bg-default-100 cursor-pointer group"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-default-100">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-default-900 truncate">{notification.title}</p>
                          <p className="text-xs text-default-500 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-default-400 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          isIconOnly 
                          size="sm" 
                          variant="light" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onPress={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification._id);
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </PopoverContent>
        </Popover>

        {user && (
          <div 
            className="ml-1 flex items-center gap-3 cursor-pointer rounded-2xl border border-divider/70 bg-content2/60 px-2.5 py-1.5 transition-colors hover:bg-content2"
            onClick={() => navigate('/profile')}
          >
            <Avatar 
              src={user.profile_image}
              size="sm"
              name={(user.name || user.email)?.charAt(0).toUpperCase()}
              color="primary"
              classNames={{
                name: "font-semibold"
              }}
            />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-default-900 leading-tight">{user.name || user.email}</p>
              <p className="text-[11px] text-default-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
