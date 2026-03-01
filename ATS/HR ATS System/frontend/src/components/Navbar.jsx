import { Bell, Search, Users, CheckCircle, MessageSquare, X } from 'lucide-react';
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
  Spinner
} from '@nextui-org/react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

  // Fetch count on mount and periodically
  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000); // Every 30 seconds
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
      default:
        return <Bell size={16} className="text-default-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-divider bg-background/60 px-6 backdrop-blur-md">
      <div className="relative flex w-full max-w-sm items-center">
        <Input
          classNames={{
            base: "max-w-full sm:max-w-[20rem] h-10",
            mainWrapper: "h-full",
            input: "text-small",
            inputWrapper: "h-full font-normal text-default-500 bg-default-400/20 dark:bg-default-500/20",
          }}
          placeholder="Type to search..."
          size="sm"
          startContent={<Search size={18} />}
          type="search"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
      </div>

      <div className="flex items-center gap-4">
        <Popover 
          placement="bottom-end" 
          offset={20} 
          showArrow
          isOpen={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
        >
          <PopoverTrigger>
            <Button isIconOnly variant="light" className="text-default-600">
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
            className="flex items-center gap-3 cursor-pointer"
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
              <p className="text-sm font-medium text-default-900">{user.name || user.email}</p>
              <p className="text-xs text-default-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
