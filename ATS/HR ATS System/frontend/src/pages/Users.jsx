import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
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
  Skeleton
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
  MoreVertical
} from 'lucide-react';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'team_lead' });
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/users/', newUser);
      addToast('User created successfully.', 'success');
      onClose();
      setNewUser({ name: '', email: '', password: '', role: 'team_lead' });
      fetchUsers();
    } catch (error) {
      addToast('Failed to create user.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      addToast('Email copied to clipboard.', 'success');
    } catch (error) {
      addToast('Failed to copy email.', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-default-900">Users</h1>
            <p className="text-default-600">{users.length} registered users</p>
          </div>
          <Button 
            color="primary" 
            startContent={<UserPlus size={18} />}
            onPress={onOpen}
          >
            Add User
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-default-900">{stats.total}</p>
            <p className="text-xs text-default-500">Total Users</p>
          </Card>
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-warning">{stats.admins}</p>
            <p className="text-xs text-default-500">Admins</p>
          </Card>
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-primary">{stats.teamLeads}</p>
            <p className="text-xs text-default-500">Team Leads</p>
          </Card>
          <Card className="p-4 text-center border border-divider">
            <p className="text-2xl font-bold text-success">{stats.recruiters}</p>
            <p className="text-xs text-default-500">Recruiters</p>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 border border-divider">
          <Input
            classNames={{
              inputWrapper: "bg-default-100",
            }}
            placeholder="Search by email or role..."
            startContent={<Search size={18} className="text-default-400" />}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
        </Card>

        {/* Users Table */}
        <Card className="border border-divider">
          <Table aria-label="Users table" removeWrapper>
            <TableHeader>
              <TableColumn>USER</TableColumn>
              <TableColumn>ROLE</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody 
              emptyContent={
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100 mb-4">
                    <UsersIcon className="h-8 w-8 text-default-400" />
                  </div>
                  <p className="font-medium text-default-900">No users found</p>
                  <p className="text-sm text-default-500">Try adjusting your search</p>
                </div>
              }
              isLoading={loading}
              loadingContent={
                <div className="space-y-4 w-full p-6">
                  {[1,2,3,4].map(i => (
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
                <TableRow key={u._id}>
                  <TableCell>
                    <User
                      avatarProps={{ 
                        radius: "lg", 
                        color: "primary",
                        name: u.email.charAt(0).toUpperCase()
                      }}
                      name={u.email}
                      description={u.name || 'No name set'}
                      classNames={{
                        name: "text-default-900",
                        description: "text-default-500",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={u.role === 'admin' ? 'warning' : 'primary'}
                      startContent={u.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                    >
                      {u.role?.toUpperCase()}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="dot" color="success">
                      Active
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Dropdown>
                        <DropdownTrigger>
                          <Button isIconOnly variant="light" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="User actions">
                          <DropdownItem
                            key="copy"
                            startContent={<Copy size={16} />}
                            onPress={() => handleCopyEmail(u.email)}
                          >
                            Copy Email
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            color="danger"
                            className={u._id === currentUser?._id ? 'hidden' : ''}
                            startContent={<Trash2 size={16} />}
                            onPress={() => handleDeleteUser(u._id)}
                          >
                            Delete User
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

      {/* Create User Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleCreateUser}>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-default-900">Create User</h2>
                <p className="text-sm font-normal text-default-500">Add a new user to the system</p>
              </ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  label="Name"
                  placeholder="Full name"
                  value={newUser.name}
                  onValueChange={(v) => setNewUser({ ...newUser, name: v })}
                  isRequired
                />
                <Input
                  type="email"
                  label="Email"
                  placeholder="user@company.com"
                  value={newUser.email}
                  onValueChange={(v) => setNewUser({ ...newUser, email: v })}
                  isRequired
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onValueChange={(v) => setNewUser({ ...newUser, password: v })}
                  isRequired
                />
                <Select
                  label="Role"
                  selectedKeys={[newUser.role]}
                  onSelectionChange={(keys) => setNewUser({ ...newUser, role: Array.from(keys)[0] })}
                >
                  <SelectItem key="team_lead">Team Lead</SelectItem>
                  <SelectItem key="recruiter">Recruiter</SelectItem>
                  <SelectItem key="admin">Admin</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={creating}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={creating}>
                  Create User
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
};

export default Users;
