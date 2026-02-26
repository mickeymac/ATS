import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { 
  Card, 
  CardBody,
  Avatar,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip
} from '@nextui-org/react';
import { Mail, Shield, Calendar, MapPin, Briefcase, User, Edit3 } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [formState, setFormState] = useState({ name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

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
    { label: 'Joined Date', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-', icon: Calendar },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name: formState.name };
      if (formState.password) {
        payload.password = formState.password;
      }
      const response = await api.put('/users/me', payload);
      setProfile(response.data);
      addToast('Profile updated successfully.', 'success');
      onClose();
      setFormState({ name: response.data.name || '', password: '' });
    } catch (error) {
      addToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-default-900">My Profile</h1>
          <p className="text-default-600">Manage your personal information and account preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="border border-divider">
            <CardBody className="p-6 text-center">
              <Avatar
                className="mx-auto mb-4 w-24 h-24"
                color="primary"
                name={(profile?.email || user.email).charAt(0).toUpperCase()}
                size="lg"
                classNames={{
                  base: "w-24 h-24",
                  name: "text-3xl font-bold"
                }}
              />
              <h2 className="text-xl font-bold text-default-900">
                {profile?.name || (profile?.email || user.email).split('@')[0]}
              </h2>
              <Chip size="sm" variant="flat" color="primary" className="mt-2 capitalize">
                {profile?.role || user.role}
              </Chip>
              
              <Button
                color="primary"
                startContent={<Edit3 size={16} />}
                className="mt-6 w-full"
                onPress={onOpen}
              >
                Edit Profile
              </Button>
            </CardBody>
          </Card>

          {/* Info Card */}
          <Card className="md:col-span-2 border border-divider">
            <CardBody className="p-6">
              <h3 className="mb-6 text-lg font-bold text-default-900">Personal Information</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {profileData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-default-400">
                      {item.label}
                    </p>
                    <div className="flex items-center gap-2 text-default-900">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-default-100">
                        <item.icon size={16} className="text-default-500" />
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-divider pt-8">
                <h3 className="mb-4 text-lg font-bold text-default-900">Bio</h3>
                <p className="text-sm leading-relaxed text-default-600">
                  Experienced professional with a background in {user.role === 'hr' ? 'talent acquisition and HR strategy' : user.role === 'admin' ? 'systems administration and operational excellence' : 'software development and technical problem solving'}. 
                  Passionate about building efficient teams and leveraging AI to improve workplace productivity.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateProfile}>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-default-900">Edit Profile</h2>
                <p className="text-sm font-normal text-default-500">Update your name or password.</p>
              </ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  label="Name"
                  placeholder="Your name"
                  value={formState.name}
                  onValueChange={(v) => setFormState({ ...formState, name: v })}
                />
                <Input
                  type="password"
                  label="New Password"
                  placeholder="Leave blank to keep current"
                  value={formState.password}
                  onValueChange={(v) => setFormState({ ...formState, password: v })}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={loading}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={loading}>
                  Save Changes
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
};

export default Profile;
