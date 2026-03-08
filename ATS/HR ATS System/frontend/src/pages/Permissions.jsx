import { useState, useEffect, useCallback } from 'react';
import api, { getUsersWithPermissions, updateUserPermissions, assignRecruiterToTeamLead, getTeamLeads } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { TableSkeleton } from '../components/SkeletonLoaders';
import { formatLastUpdated } from '../utils/export';
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
  Switch,
  Select,
  SelectItem,
  Tooltip
} from '@nextui-org/react';
import { 
  Shield, 
  Search, 
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Users as UsersIcon
} from 'lucide-react';

const PERMISSION_LABELS = {
  can_create_jobs: 'Create Jobs',
  can_delete_jobs: 'Delete Jobs',
  can_activate_jobs: 'Activate/Deactivate Jobs',
  can_assign_jobs: 'Assign Jobs',
  can_self_assign_recruiters: 'Self-Assign Recruiters',
  can_send_interview_invites: 'Send Interview Invites',
  can_export_data: 'Export Data',
  can_manage_users: 'Manage Users',
  can_manage_permissions: 'Manage Permissions'
};

const Permissions = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [savingPermission, setSavingPermission] = useState({});
  const [savingTeamLead, setSavingTeamLead] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, teamLeadsRes] = await Promise.all([
        getUsersWithPermissions(),
        getTeamLeads()
      ]);
      setUsers(usersRes.data);
      setTeamLeads(teamLeadsRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('Failed to fetch users and permissions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchData();
    }
  }, [fetchData, currentUser?.role]);

  const handlePermissionToggle = async (userId, permission, currentValue) => {
    const key = `${userId}-${permission}`;
    setSavingPermission(prev => ({ ...prev, [key]: true }));
    
    try {
      await updateUserPermissions(userId, { [permission]: !currentValue });
      
      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            permissions: { ...u.permissions, [permission]: !currentValue },
            custom_permissions: { ...u.custom_permissions, [permission]: !currentValue }
          };
        }
        return u;
      }));
      
      addToast('Permission updated.', 'success');
    } catch (error) {
      console.error('Error updating permission:', error);
      addToast('Failed to update permission.', 'error');
    } finally {
      setSavingPermission(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleTeamLeadAssignment = async (recruiterId, teamLeadId) => {
    setSavingTeamLead(prev => ({ ...prev, [recruiterId]: true }));
    
    try {
      await assignRecruiterToTeamLead(recruiterId, teamLeadId || null);
      
      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === recruiterId) {
          return { ...u, team_lead_id: teamLeadId || null };
        }
        return u;
      }));
      
      addToast('Team lead assignment updated.', 'success');
    } catch (error) {
      console.error('Error assigning team lead:', error);
      addToast('Failed to assign team lead.', 'error');
    } finally {
      setSavingTeamLead(prev => ({ ...prev, [recruiterId]: false }));
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'team_lead': return 'primary';
      case 'recruiter': return 'success';
      default: return 'default';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldAlert size={14} />;
      case 'team_lead': return <ShieldCheck size={14} />;
      case 'recruiter': return <Shield size={14} />;
      default: return <Shield size={14} />;
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin-dashboard' },
    { label: 'Permissions' }
  ];

  if (currentUser?.role !== 'admin') {
    return (
      <AppShell>
        <div className="p-6">
          <Card>
            <CardBody className="text-center py-8">
              <ShieldAlert className="mx-auto mb-4 text-danger" size={48} />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-default-500 mt-2">Only administrators can access this page.</p>
            </CardBody>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="text-primary" />
              Permissions Management
            </h1>
            <p className="text-default-500 mt-1">
              Manage user permissions and team assignments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-sm text-default-400">
                {formatLastUpdated(lastUpdated)}
              </span>
            )}
            <Tooltip content="Refresh">
              <Button isIconOnly variant="light" onPress={fetchData} isLoading={loading}>
                <RefreshCw size={18} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search users by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<Search size={18} className="text-default-400" />}
          className="max-w-md"
        />

        {/* Users Permissions Table */}
        <Card>
          <CardBody>
            {loading ? (
              <TableSkeleton />
            ) : (
              <Table aria-label="Permissions table" removeWrapper>
                <TableHeader>
                  <TableColumn>USER</TableColumn>
                  <TableColumn>ROLE</TableColumn>
                  <TableColumn>TEAM LEAD</TableColumn>
                  {Object.keys(PERMISSION_LABELS).map(perm => (
                    <TableColumn key={perm} className="text-center">
                      <Tooltip content={PERMISSION_LABELS[perm]}>
                        <span className="text-xs">{PERMISSION_LABELS[perm].split(' ').map(w => w[0]).join('')}</span>
                      </Tooltip>
                    </TableColumn>
                  ))}
                </TableHeader>
                <TableBody emptyContent="No users found">
                  {filteredUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <User
                          name={u.name || 'Unknown'}
                          description={u.email}
                          avatarProps={{
                            name: u.name?.charAt(0) || 'U',
                            size: 'sm'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={getRoleColor(u.role)}
                          variant="flat"
                          size="sm"
                          startContent={getRoleIcon(u.role)}
                        >
                          {u.role === 'team_lead' ? 'Team Lead' : u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {u.role === 'recruiter' ? (
                          <Select
                            placeholder="Assign Team Lead"
                            size="sm"
                            className="max-w-[150px]"
                            selectedKeys={u.team_lead_id ? [u.team_lead_id] : []}
                            onChange={(e) => handleTeamLeadAssignment(u.id, e.target.value)}
                            isLoading={savingTeamLead[u.id]}
                          >
                            {teamLeads.map(tl => (
                              <SelectItem key={tl.id} value={tl.id}>
                                {tl.name || tl.email}
                              </SelectItem>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-default-400 text-sm">—</span>
                        )}
                      </TableCell>
                      {Object.keys(PERMISSION_LABELS).map(perm => (
                        <TableCell key={perm} className="text-center">
                          {u.role === 'admin' ? (
                            <Tooltip content="Admin has all permissions">
                              <span className="text-success">✓</span>
                            </Tooltip>
                          ) : (
                            <Switch
                              size="sm"
                              isSelected={u.permissions?.[perm] ?? false}
                              isDisabled={savingPermission[`${u.id}-${perm}`]}
                              onValueChange={() => handlePermissionToggle(u.id, perm, u.permissions?.[perm] ?? false)}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Legend */}
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UsersIcon size={16} />
              Permission Legend
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs bg-default-100 px-1 rounded">
                    {label.split(' ').map(w => w[0]).join('')}
                  </span>
                  <span className="text-default-600">{label}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
};

export default Permissions;
