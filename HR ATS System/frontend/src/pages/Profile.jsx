import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { Mail, Shield, Calendar, MapPin, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [formState, setFormState] = useState({ name: '', password: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/users/me');
        setProfile(response.data);
        setFormState({ name: response.data.name || '', password: '' });
      } catch (error) {
        addToast('Failed to load profile.', 'error');
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, addToast]);

  if (!user) return null;

  const profileData = [
    { label: 'Email Address', value: profile?.email || user.email, icon: Mail },
    { label: 'Account Role', value: profile?.role || user.role, icon: Shield },
    { label: 'Location', value: 'San Francisco, CA', icon: MapPin },
    { label: 'Department', value: user.role === 'hr' ? 'Human Resources' : user.role === 'admin' ? 'Operations' : 'Engineering', icon: Briefcase },
    { label: 'Joined Date', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—', icon: Calendar },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: formState.name };
      if (formState.password) {
        payload.password = formState.password;
      }
      const response = await api.put('/users/me', payload);
      setProfile(response.data);
      addToast('Profile updated successfully.', 'success');
      setShowEdit(false);
      setFormState({ name: response.data.name || '', password: '' });
    } catch (error) {
      addToast('Failed to update profile.', 'error');
    }
  };

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
              {(profile?.email || user.email).charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {profile?.name || (profile?.email || user.email).split('@')[0]}
            </h2>
            <p className="text-sm capitalize text-slate-500 dark:text-slate-400">{profile?.role || user.role}</p>
            
            <button
              onClick={() => setShowEdit(true)}
              className="mt-6 w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
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

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Profile</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update your name or password.</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  value={formState.password}
                  onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Profile;
