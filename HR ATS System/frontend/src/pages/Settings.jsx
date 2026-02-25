import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { AppShell } from '../components/AppShell';
import { 
  Card, 
  CardBody,
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
import { Moon, Sun, Trash2, Bell, Lock, Monitor, Shield, Check } from 'lucide-react';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
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
    onOpenChange: onDeleteOpenChange,
    onClose: onDeleteClose 
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
    } catch (error) {
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
    } catch (error) {
      addToast('Failed to delete account.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-default-900">Settings</h1>
          <p className="text-default-600">Manage your account preferences</p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Appearance Section */}
          <Card className="border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3 p-5 border-b border-divider">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-default-900">Appearance</h3>
                  <p className="text-sm text-default-500">Customize your interface</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-default-900">Interface Theme</p>
                    <p className="text-xs text-default-400">Switch between light and dark mode</p>
                  </div>
                  <Button
                    variant="bordered"
                    startContent={theme === 'dark' ? <Sun size={16} className="text-warning" /> : <Moon size={16} className="text-primary" />}
                    onPress={toggleTheme}
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Notifications Section */}
          <Card className="border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3 p-5 border-b border-divider">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-default-900">Notifications</h3>
                  <p className="text-sm text-default-500">Manage email preferences</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-default-900">Email Notifications</p>
                    <p className="text-xs text-default-400">Receive updates about applications</p>
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
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Security Section */}
          <Card className="border border-divider">
            <CardBody className="p-0">
              <div className="flex items-center gap-3 p-5 border-b border-divider">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-default-900">Security</h3>
                  <p className="text-sm text-default-500">Manage account security</p>
                </div>
              </div>
              <div className="divide-y divide-divider">
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm font-medium text-default-900">Change Password</p>
                    <p className="text-xs text-default-400">Update your login credentials</p>
                  </div>
                  <Button
                    variant="flat"
                    startContent={<Lock size={16} />}
                    onPress={onPasswordOpen}
                  >
                    Update
                  </Button>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm font-medium text-default-900">Active Sessions</p>
                    <p className="text-xs text-default-400">Manage your active logins</p>
                  </div>
                  <Button variant="light" color="primary" onPress={onSessionsOpen}>
                    View All
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Danger Zone */}
          <Card className="border border-danger/30">
            <CardBody className="p-0">
              <div className="flex items-center gap-3 p-5 border-b border-divider">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-default-900">Danger Zone</h3>
                  <p className="text-sm text-default-500">Irreversible actions</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-default-900">Delete Account</p>
                    <p className="text-xs text-default-400">Permanently remove your account and data</p>
                  </div>
                  <Button
                    color="danger"
                    variant="flat"
                    startContent={<Trash2 size={16} />}
                    onPress={onDeleteOpen}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
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
