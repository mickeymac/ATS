import { useTheme } from '../context/ThemeContext';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { Moon, Sun, Bell, Lock, Eye, Globe, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();

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
            <div className="flex h-6 w-11 items-center rounded-full bg-slate-200 p-1 dark:bg-slate-800">
              <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
            </div>
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
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Update
            </button>
          ),
        },
        {
          id: 'sessions',
          label: 'Active Sessions',
          description: 'Manage your active logins across devices.',
          action: (
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
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
            <button className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
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
    </AppShell>
  );
};

export default Settings;
