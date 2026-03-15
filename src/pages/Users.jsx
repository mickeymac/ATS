import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TableSkeleton, StatCardSkeleton } from '../components/SkeletonLoaders';
import { exportToCSV, formatLastUpdated } from '../utils/export';
import { 
  Card, 
  CardBody,
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  User, 
  Chip, 
  Input, 
  Button,
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Skeleton,
  cn
} from '@nextui-org/react';
import { 
  Users as UsersIcon, 
  Search, 
  UserPlus, 
  Copy, 
  Trash2, 
  ShieldCheck, 
  Shield, 
  ShieldAlert,
  MoreVertical,
  RefreshCw,
  Download,
  Clock
} from 'lucide-react';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'team_lead' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
      setLastUpdated(new Date());
    } catch {
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

  const openDeleteDialog = (user) => {
    if (user._id === currentUser?._id) {
      addToast("You cannot delete your own account.", "error");
      return;
    }
    setUserToDelete(user);
    onDeleteOpen();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/users/${userToDelete._id}`);
      setUsers(users.filter(u => u._id !== userToDelete._id));
      addToast('User deleted successfully.', 'success');
      onDeleteClose();
      setUserToDelete(null);
    } catch {
      addToast('Failed to delete user.', 'error');
    }
  };

  const handleCopyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      addToast('Email copied to clipboard.', 'success');
    } catch {
      addToast('Failed to copy email.', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportUsers = () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'created_at', label: 'Created At' }
    ];
    exportToCSV(filteredUsers, 'users', columns);
    addToast('Users exported successfully.', 'success');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/users/', newUser);
      addToast('User created successfully.', 'success');
      onClose();
      setNewUser({ name: '', email: '', password: '', role: 'team_lead' });
      fetchUsers();
    } catch {
      addToast('Failed to create user.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    teamLeads: users.filter(u => u.role === 'team_lead').length,
    recruiters: users.filter(u => u.role === 'recruiter').length,
  };

  if (currentUser?.role !== 'admin') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 mb-4">
            <ShieldAlert className="h-8 w-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-default-900">Access Denied</h2>
          <p className="text-sm text-default-500 mt-2">Only administrators can manage users.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-default-900">User Management</h1>
            <p className="text-default-500 text-lg">Create and manage access credentials for your recruitment team.</p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-default-400 mt-1">
                <Clock size={12} />
                <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="Refresh list">
              <Button variant="flat" onPress={fetchUsers} className="bg-default-100 min-w-10 px-0 h-10 w-10">
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
            {filteredUsers.length > 0 && (
              <Button 
                variant="flat" 
                onPress={handleExportUsers}
                className="bg-default-100 font-bold h-10"
                startContent={<Download size={18} />}
              >
                Export CSV
              </Button>
            )}
            <Button 
              color="primary" 
              startContent={<UserPlus size={20} />}
              onPress={onOpen}
              className="h-10 font-bold px-6 shadow-md shadow-primary-200"
            >
              Create New User
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-default-100 dark:bg-default-100/50 text-default-600 group-hover:scale-110 transition-transform">
                  <UsersIcon size={20} />
                </div>
                <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Platform Total</span>
              </div>
              <h3 className="text-3xl font-black text-default-900">{stats.total}</h3>
              <p className="text-xs font-bold text-default-500 uppercase tracking-widest mt-1">Registered Users</p>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-warning-100 dark:bg-warning-100/20 text-warning group-hover:scale-110 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Admin Role</span>
              </div>
              <h3 className="text-3xl font-black text-warning">{stats.admins}</h3>
              <p className="text-xs font-bold text-default-500 uppercase tracking-widest mt-1">System Administrators</p>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-100/20 text-primary group-hover:scale-110 transition-transform">
                  <Shield size={20} />
                </div>
                <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Lead Role</span>
              </div>
              <h3 className="text-3xl font-black text-primary">{stats.teamLeads}</h3>
              <p className="text-xs font-bold text-default-500 uppercase tracking-widest mt-1">Team Leaders</p>
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-success-100 dark:bg-success-100/20 text-success group-hover:scale-110 transition-transform">
                  <UsersIcon size={20} />
                </div>
                <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Recruiter Role</span>
              </div>
              <h3 className="text-3xl font-black text-success">{stats.recruiters}</h3>
              <p className="text-xs font-bold text-default-500 uppercase tracking-widest mt-1">Talent Specialists</p>
            </CardBody>
          </Card>
        </div>

        {/* Filters and Table */}
        <div className="flex flex-col gap-6">
          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/30 p-1">
            <CardBody className="p-2">
              <Input
                classNames={{
                  inputWrapper: "bg-default-100 dark:bg-default-100 h-10 shadow-sm",
                }}
                placeholder="Search by name, email, or role..."
                startContent={<Search size={18} className="text-default-400" />}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </CardBody>
          </Card>

          <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden">
            <Table 
              aria-label="Users management table" 
              removeWrapper
              classNames={{
                th: "bg-default-50 dark:bg-default-100/50 text-[10px] font-black uppercase tracking-widest text-default-500 h-12",
                td: "py-4 px-6"
              }}
            >
              <TableHeader>
                <TableColumn>USER IDENTITY</TableColumn>
                <TableColumn>ACCESS LEVEL</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn align="end">CONTROL</TableColumn>
              </TableHeader>
              <TableBody 
                emptyContent={
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-6 rounded-full bg-default-100 mb-4 opacity-50">
                      <UsersIcon size={40} className="text-default-400" />
                    </div>
                    <h3 className="text-xl font-bold text-default-900">No users matched your search</h3>
                    <p className="text-default-500 max-w-xs mx-auto mt-2 leading-relaxed">Try adjusting your filters or check if the user is registered.</p>
                  </div>
                }
                isLoading={loading}
                loadingContent={
                  <div className="space-y-4 w-full p-6">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="rounded-full w-10 h-10" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                {filteredUsers.map((u) => (
                  <TableRow key={u._id} className="group hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                    <TableCell>
                      <User
                        avatarProps={{ 
                          radius: "lg", 
                          color: "primary",
                          isBordered: true,
                          name: (u.name || u.email).charAt(0).toUpperCase(),
                          className: "shadow-sm"
                        }}
                        name={u.name || u.email.split('@')[0]}
                        description={u.email}
                        classNames={{
                          name: "text-sm font-black text-default-900 group-hover:text-primary transition-colors",
                          description: "text-[11px] font-medium text-default-500 dark:text-default-400 mt-0.5",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={u.role === 'admin' ? 'warning' : 'primary'}
                        className="font-bold text-[10px] uppercase h-6"
                        startContent={u.role === 'admin' ? <ShieldCheck size={12} className="mr-1" /> : <Shield size={12} className="mr-1" />}
                      >
                        {u.role}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="sm" 
                        variant="dot" 
                        color="success"
                        className="font-bold text-[10px] uppercase h-6 bg-success-50 dark:bg-success-50/10 border-success-100"
                      >
                        Active Account
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end pr-2">
                        <Dropdown placement="bottom-end">
                          <DropdownTrigger>
                            <Button isIconOnly variant="flat" size="sm" className="bg-default-100 hover:bg-default-200">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="User identity actions" variant="flat">
                            <DropdownItem
                              key="copy"
                              startContent={<Copy size={16} />}
                              onPress={() => handleCopyEmail(u.email)}
                              className="font-medium"
                            >
                              Copy Email Address
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              color="danger"
                              className={cn("font-medium text-danger", u._id === currentUser?._id && 'hidden')}
                              startContent={<Trash2 size={16} />}
                              onPress={() => openDeleteDialog(u)}
                            >
                              Revoke Access
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleCreateUser}>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-default-900 uppercase tracking-tight">Provision New User</h2>
                <p className="text-xs font-bold text-default-500 uppercase tracking-widest">Assign platform roles and credentials</p>
              </ModalHeader>
              <ModalBody className="gap-6 py-4">
                <div className="flex flex-col gap-4">
                  <Input
                    label="Full Name"
                    labelPlacement="outside"
                    placeholder="e.g. Sarah Jenkins"
                    value={newUser.name}
                    onValueChange={(v) => setNewUser({ ...newUser, name: v })}
                    isRequired
                    classNames={{
                      label: "font-bold text-default-700",
                      inputWrapper: "bg-default-100/50"
                    }}
                  />
                  <Input
                    type="email"
                    label="Corporate Email"
                    labelPlacement="outside"
                    placeholder="sarah.j@company.com"
                    value={newUser.email}
                    onValueChange={(v) => setNewUser({ ...newUser, email: v })}
                    isRequired
                    classNames={{
                      label: "font-bold text-default-700",
                      inputWrapper: "bg-default-100/50"
                    }}
                  />
                  <Input
                    type="password"
                    label="Temporary Password"
                    labelPlacement="outside"
                    placeholder="Minimum 8 characters"
                    value={newUser.password}
                    onValueChange={(v) => setNewUser({ ...newUser, password: v })}
                    isRequired
                    classNames={{
                      label: "font-bold text-default-700",
                      inputWrapper: "bg-default-100/50"
                    }}
                  />
                  <Select
                    label="Access Level / Role"
                    labelPlacement="outside"
                    selectedKeys={[newUser.role]}
                    onSelectionChange={(keys) => setNewUser({ ...newUser, role: Array.from(keys)[0] })}
                    classNames={{
                      label: "font-bold text-default-700",
                      trigger: "bg-default-100/50"
                    }}
                  >
                    <SelectItem key="recruiter" startContent={<UsersIcon size={14} className="text-success" />}>Recruiter</SelectItem>
                    <SelectItem key="team_lead" startContent={<Shield size={14} className="text-primary" />}>Team Lead</SelectItem>
                    <SelectItem key="admin" startContent={<ShieldCheck size={14} className="text-warning" />}>System Administrator</SelectItem>
                  </Select>
                </div>

                <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-50/10 border border-primary-100">
                  <p className="text-[10px] text-primary-700 leading-relaxed font-bold italic">
                    Note: The new user will be able to log in immediately using these credentials. They can update their profile and password once logged in.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-divider">
                <Button variant="light" onPress={onClose} isDisabled={creating} className="font-bold">
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  type="submit" 
                  isLoading={creating}
                  className="font-bold px-8 shadow-md shadow-primary-200"
                >
                  Create Identity
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.email}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="danger"
      />
    </AppShell>
  );
};

export default Users;
