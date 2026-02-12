import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { Users as UsersIcon, Search, UserPlus, Mail, Shield, Trash2, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const SkeletonLoader = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />;

const Users = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      addToast('Failed to fetch users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [fetchUsers, currentUser?.role]);

  const handleDeleteUser = async (id) => {
    if (id === currentUser?._id) {
      addToast("You cannot delete your own account.", "error");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u._id !== id));
      addToast('User deleted successfully.', 'success');
    } catch (error) {
      addToast('Failed to delete user.', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== 'admin') {
    return (
      <AppShell>
        <PageHeader title="Access Denied" description="Only administrators can manage users." />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
          You do not have permission to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="User Management"
        description="View and manage all registered users on the platform."
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
            <UserPlus size={16} />
            Add User
          </button>
        }
      />

      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-900/5 transition-all focus:border-slate-900 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-100 dark:focus:ring-slate-100/5"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">User</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">Role</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={4} className="px-6 py-4">
                      <SkeletonLoader className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{u.email}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail size={12} />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 capitalize text-slate-600 dark:text-slate-400">
                        <Shield size={14} className={u.role === 'admin' ? 'text-amber-500' : 'text-slate-400'} />
                        {u.role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-900/50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <UsersIcon className="mb-4 h-12 w-12 text-slate-300" />
                      <p>No users found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
};

export default Users;
