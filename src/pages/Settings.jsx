import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  Card, 
  CardBody,
  CardHeader,
  Button,
  Input,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@nextui-org/react';
import { Moon, Sun, Trash2, Bell, Lock, Monitor, Shield, Check, TrendingUp, Users } from 'lucide-react';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [passwordValue, setPasswordValue] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { 
    isOpen: isPasswordOpen, 
    onOpen: onPasswordOpen, 
    onOpenChange: onPasswordOpenChange,
    onClose: onPasswordClose 
  } = useDisclosure();
  
  const { 
    isOpen: isSessionsOpen, 
    onOpen: onSessionsOpen, 
    onOpenChange: onSessionsOpenChange 
  } = useDisclosure();
  
  const { 
    isOpen: isDeleteOpen, 
    onOpen: onDeleteOpen, 
    onOpenChange: onDeleteOpenChange
  } = useDisclosure();

  const handlePasswordUpdate = async () => {
    if (!passwordValue) {
      addToast('Please enter a new password.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/me', { password: passwordValue });
      addToast('Password updated successfully.', 'success');
      setPasswordValue('');
      onPasswordClose();
    } catch {
      addToast('Failed to update password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      addToast('Account deleted.', 'success');
      logout();
      navigate('/');
    } catch {
      addToast('Failed to delete account.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-8 max-w-[1000px] mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Preferences</h1>
          <p className="text-default-500 text-lg">Customize your account experience and manage security.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Settings Navigation */}
          <div className="flex flex-col gap-4">
            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20">
              <CardBody className="p-2">
                <div className="flex flex-col gap-1">
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      activeSection === 'general' 
                        ? 'bg-primary text-white shadow-md shadow-primary-200' 
                        : 'hover:bg-default-100 dark:hover:bg-default-100 text-default-700 dark:text-default-600'
                    }`}
                    onClick={() => setActiveSection('general')}
                  >
                    <Monitor size={18} />
                    <span className="font-bold text-sm">General Settings</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      activeSection === 'security' 
                        ? 'bg-primary text-white shadow-md shadow-primary-200' 
                        : 'hover:bg-default-100 dark:hover:bg-default-100 text-default-700 dark:text-default-600'
                    }`}
                    onClick={() => setActiveSection('security')}
                  >
                    <Shield size={18} />
                    <span className="font-bold text-sm">Security & Privacy</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      activeSection === 'notifications' 
                        ? 'bg-primary text-white shadow-md shadow-primary-200' 
                        : 'hover:bg-default-100 dark:hover:bg-default-100 text-default-700 dark:text-default-600'
                    }`}
                    onClick={() => setActiveSection('notifications')}
                  >
                    <Bell size={18} />
                    <span className="font-bold text-sm">Notifications</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20">
              <CardBody className="p-6">
                <h4 className="text-[10px] font-black text-default-400 dark:text-default-500 uppercase tracking-widest mb-4">Help & Support</h4>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-default-700 dark:text-default-600">Need assistance?</p>
                    <p className="text-[10px] text-default-500 leading-relaxed">Our support team is available 24/7 to help you with platform issues.</p>
                  </div>
                  <Button size="sm" variant="flat" className="w-full font-bold bg-default-100 dark:bg-default-100/50">Contact Support</Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Settings Content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Appearance Section */}
            {activeSection === 'general' && (
              <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="px-8 pt-8 pb-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-100/20 text-primary shadow-sm">
                    <Monitor size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-default-900 uppercase tracking-tight">Appearance</h3>
                    <p className="text-xs text-default-500 font-medium uppercase tracking-widest">Interface customization</p>
                  </div>
                </CardHeader>
                <CardBody className="px-8 pb-8">
                  <div className="p-5 rounded-2xl bg-default-50 dark:bg-default-100/30 border border-divider/50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-default-900">Interface Theme</p>
                        <p className="text-xs text-default-500">Choose between light and dark visual modes</p>
                      </div>
                      <div className="flex bg-default-100 dark:bg-default-200/50 p-1 rounded-xl border border-divider">
                        <Button
                          size="sm"
                          variant={theme === 'light' ? 'shadow' : 'light'}
                          color={theme === 'light' ? 'primary' : 'default'}
                          className={`font-bold ${theme === 'light' ? 'text-white shadow-primary-200' : 'text-default-500'}`}
                          startContent={<Sun size={16} />}
                          onPress={() => theme !== 'light' && toggleTheme()}
                        >
                          Light
                        </Button>
                        <Button
                          size="sm"
                          variant={theme === 'dark' ? 'shadow' : 'light'}
                          color={theme === 'dark' ? 'primary' : 'default'}
                          className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-default-500'}`}
                          startContent={<Moon size={16} />}
                          onPress={() => theme !== 'dark' && toggleTheme()}
                        >
                          Dark
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="px-8 pt-8 pb-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-success-100 dark:bg-success-100/20 text-success shadow-sm">
                    <Bell size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-default-900 uppercase tracking-tight">Notifications</h3>
                    <p className="text-xs text-default-500 font-medium uppercase tracking-widest">Alerts and communication</p>
                  </div>
                </CardHeader>
                <CardBody className="px-8 pb-8">
                  <div className="p-5 rounded-2xl bg-default-50 dark:bg-default-100/30 border border-divider/50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-default-900">Email Notifications</p>
                        <p className="text-xs text-default-500">Receive system updates and candidate alerts via email</p>
                      </div>
                      <Switch
                        isSelected={emailNotifications}
                        onValueChange={(val) => {
                          setEmailNotifications(val);
                          addToast(
                            val ? 'Email notifications enabled.' : 'Email notifications disabled.',
                            'info'
                          );
                        }}
                        color="success"
                        classNames={{
                          wrapper: "group-data-[selected=true]:bg-success"
                        }}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden">
                  <CardHeader className="px-8 pt-8 pb-4 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-warning-100 dark:bg-warning-100/20 text-warning shadow-sm">
                      <Shield size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-default-900 uppercase tracking-tight">Security</h3>
                      <p className="text-xs text-default-500 font-medium uppercase tracking-widest">Account protection</p>
                    </div>
                  </CardHeader>
                  <CardBody className="px-8 pb-8 flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-5 rounded-2xl bg-default-50 dark:bg-default-100/30 border border-divider/50 flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-bold text-default-900">Password</p>
                          <p className="text-xs text-default-500">Last updated 3 months ago</p>
                        </div>
                        <Button
                          variant="flat"
                          className="font-bold bg-default-100 dark:bg-default-200/50 hover:bg-warning hover:text-white transition-all"
                          startContent={<Lock size={16} />}
                          onPress={onPasswordOpen}
                        >
                          Change Password
                        </Button>
                      </div>
                      <div className="p-5 rounded-2xl bg-default-50 dark:bg-default-100/30 border border-divider/50 flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-bold text-default-900">Active Sessions</p>
                          <p className="text-xs text-default-500">Manage logged-in devices</p>
                        </div>
                        <Button 
                          variant="flat" 
                          className="font-bold bg-default-100 dark:bg-default-200/50 hover:bg-primary hover:text-white transition-all"
                          onPress={onSessionsOpen}
                        >
                          View All Sessions
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Danger Zone */}
                <Card className="border border-danger/30 shadow-sm bg-danger-50/10 overflow-hidden">
                  <CardHeader className="px-8 pt-8 pb-4 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-danger-100 text-danger shadow-sm">
                      <Trash2 size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-danger uppercase tracking-tight">Danger Zone</h3>
                      <p className="text-xs text-danger-400 font-medium uppercase tracking-widest">Irreversible account actions</p>
                    </div>
                  </CardHeader>
                  <CardBody className="px-8 pb-8">
                    <div className="p-5 rounded-2xl bg-danger-50/50 border border-danger/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-danger-700">Delete My Account</p>
                        <p className="text-xs text-danger-500 max-w-sm">Permanently delete your account and all associated recruitment data. This cannot be undone.</p>
                      </div>
                      <Button
                        color="danger"
                        variant="shadow"
                        className="font-black px-8 shadow-danger-200 dark:shadow-none"
                        startContent={<Trash2 size={16} />}
                        onPress={onDeleteOpen}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <Modal isOpen={isPasswordOpen} onOpenChange={onPasswordOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-default-900">Update Password</h2>
                <p className="text-sm font-normal text-default-500">Enter your new password</p>
              </ModalHeader>
              <ModalBody>
                <Input
                  type="password"
                  label="New Password"
                  placeholder="Enter new password"
                  value={passwordValue}
                  onValueChange={setPasswordValue}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={savingPassword}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handlePasswordUpdate} isLoading={savingPassword}>
                  Save Password
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Sessions Modal */}
      <Modal isOpen={isSessionsOpen} onOpenChange={onSessionsOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-default-900">Active Sessions</h2>
                <p className="text-sm font-normal text-default-500">Your current logins</p>
              </ModalHeader>
              <ModalBody>
                <div className="flex items-center justify-between p-4 rounded-xl bg-default-50 border border-divider">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Check size={18} className="text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-default-900">This Device</p>
                      <p className="text-xs text-default-400">Active now</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-success px-2 py-1 rounded-full bg-success/10">Current</span>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="bordered" onPress={onClose} className="w-full">
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-default-900">Delete Account</h2>
                    <p className="text-sm font-normal text-default-500">This action cannot be undone</p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  Your account and all associated data will be permanently deleted. This action is irreversible.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={deleting}>
                  Cancel
                </Button>
                <Button color="danger" onPress={handleDeleteAccount} isLoading={deleting}>
                  Delete Account
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
};

export default Settings;
