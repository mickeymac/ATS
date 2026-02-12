import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { User, Mail, Shield, Calendar, MapPin, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  const profileData = [
    { label: 'Email Address', value: user.email, icon: Mail },
    { label: 'Account Role', value: user.role, icon: Shield },
    { label: 'Location', value: 'San Francisco, CA', icon: MapPin },
    { label: 'Department', value: user.role === 'hr' ? 'Human Resources' : user.role === 'admin' ? 'Operations' : 'Engineering', icon: Briefcase },
    { label: 'Joined Date', value: 'January 12, 2026', icon: Calendar },
  ];

  return (
    <AppShell>
      <PageHeader
        title="My Profile"
        description="Manage your personal information and account preferences."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-1"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-3xl font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.email.split('@')[0]}</h2>
            <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{user.role}</p>
            
            <button className="mt-6 w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              Edit Profile
            </button>
          </div>
        </motion.div>

        {/* Details Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-slate-100">Personal Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {profileData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <item.icon size={16} className="text-slate-400" />
                    <span className="font-medium">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-800">
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Bio</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Experienced professional with a background in {user.role === 'hr' ? 'talent acquisition and HR strategy' : user.role === 'admin' ? 'systems administration and operational excellence' : 'software development and technical problem solving'}. 
                Passionate about building efficient teams and leveraging AI to improve workplace productivity.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default Profile;
