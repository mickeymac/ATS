import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { Moon, Sun, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sections = [
    {
      title: 'Appearance',
      description: 'Customize how the platform looks on your device.',
      settings: [
        {
          id: 'theme',
          label: 'Interface Theme',
          description: 'Switch between light and dark mode.',
          action: (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} className="text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-indigo-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          ),
        },
      ],
    },
    {
      title: 'Notifications',
      description: 'Choose what updates you want to receive.',
      settings: [
        {
          id: 'email-notifs',
          label: 'Email Notifications',
          description: 'Receive updates about new applications and job status.',
          action: (
            <button
              type="button"
              onClick={() => {
                const nextValue = !emailNotifications;
                setEmailNotifications(nextValue);
                addToast(
                  nextValue ? 'Email notifications enabled.' : 'Email notifications disabled.',
                  'info'
                );
              }}
              className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${
                emailNotifications ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  emailNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          ),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      description: 'Manage your account security and data.',
      settings: [
        {
          id: 'password',
          label: 'Change Password',
          description: 'Update your login credentials.',
          action: (
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Update
            </button>
          ),
        },
        {
          id: 'sessions',
          label: 'Active Sessions',
          description: 'Manage your active logins across devices.',
          action: (
            <button
              onClick={() => setShowSessionsModal(true)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              View All
            </button>
          ),
        },
      ],
    },
    {
      title: 'Danger Zone',
      description: 'Permanently delete your account and all data.',
      settings: [
        {
          id: 'delete-account',
          label: 'Delete Account',
          description: 'This action is irreversible. Please proceed with caution.',
          action: (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          ),
        },
      ],
    }
  ];

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{section.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {section.settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{setting.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{setting.description}</p>
                  </div>
                  {setting.action}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Update Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose a strong new password.</p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                placeholder="New password"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                disabled={savingPassword}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!passwordValue) {
                    addToast('Please enter a new password.', 'error');
                    return;
                  }
                  setSavingPassword(true);
                  try {
                    await api.put('/users/me', { password: passwordValue });
                    addToast('Password updated successfully.', 'success');
                    setPasswordValue('');
                    setShowPasswordModal(false);
                  } catch (error) {
                    addToast('Failed to update password.', 'error');
                  } finally {
                    setSavingPassword(false);
                  }
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                disabled={savingPassword}
              >
                {savingPassword ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Active Sessions</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your current login sessions.</p>
            </div>
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <p className="font-medium">This device</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active now</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600">Current</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/40 dark:bg-slate-900">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete Account</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">This action is permanent.</p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Your account and data will be removed. This cannot be undone.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
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
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Settings;
