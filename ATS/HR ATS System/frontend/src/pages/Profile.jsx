import { useEffect, useState, useRef } from 'react';
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
  Chip,
  Textarea
} from '@nextui-org/react';
import { Mail, Shield, Calendar, Briefcase, User, Edit3, Phone, Users, Camera } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [formState, setFormState] = useState({ 
    name: '', 
    email: '',
    phone: '',
    department: '',
    bio: '',
    password: '',
    profile_image: ''
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/users/me');
        setProfile(response.data);
        setFormState({ 
          name: response.data.name || '', 
          email: response.data.email || '',
          phone: response.data.phone || '',
          department: response.data.department || '',
          bio: response.data.bio || '',
          password: '',
          profile_image: response.data.profile_image || ''
        });
        if (response.data.profile_image) {
          setImagePreview(response.data.profile_image);
        }
      } catch (error) {
        addToast('Failed to load profile.', 'error');
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, addToast]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormState({ ...formState, profile_image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) return null;

  const defaultDepartment = user.role === 'team_lead' ? 'Recruitment - Team Lead' : user.role === 'recruiter' ? 'Recruitment' : user.role === 'admin' ? 'Operations' : 'Engineering';
  const defaultBio = `Experienced professional with a background in ${user.role === 'team_lead' ? 'talent acquisition and team leadership' : user.role === 'recruiter' ? 'talent acquisition and recruitment' : user.role === 'admin' ? 'systems administration and operational excellence' : 'software development and technical problem solving'}. Passionate about building efficient teams and leveraging AI to improve workplace productivity.`;

  const profileData = [
    { label: 'Email Address', value: profile?.email || user.email, icon: Mail },
    { label: 'Account Role', value: profile?.role || user.role, icon: Shield },
    { label: 'Phone Number', value: profile?.phone || 'Not provided', icon: Phone },
    { label: 'Department', value: profile?.department || defaultDepartment, icon: Briefcase },
    { label: 'Team Lead', value: profile?.team_lead || 'Not assigned', icon: Users },
    { label: 'Joined Date', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-', icon: Calendar },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        department: formState.department,
        bio: formState.bio,
        profile_image: formState.profile_image
      };
      if (formState.password) {
        payload.password = formState.password;
      }
      const response = await api.put('/users/me', payload);
      setProfile(response.data);
      // Update image preview with saved data
      if (response.data.profile_image) {
        setImagePreview(response.data.profile_image);
      }
      if (updateUser) {
        updateUser(response.data);
      }
      addToast('Profile updated successfully.', 'success');
      onClose();
      setFormState({ 
        name: response.data.name || '', 
        email: response.data.email || '',
        phone: response.data.phone || '',
        department: response.data.department || '',
        bio: response.data.bio || '',
        password: '',
        profile_image: response.data.profile_image || ''
      });
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
              <div className="relative inline-block mx-auto mb-4">
                <Avatar
                  className="w-24 h-24"
                  color="primary"
                  src={imagePreview || profile?.profile_image || user.profile_image || undefined} 
                  name={(profile?.name || profile?.email || user.email).charAt(0).toUpperCase()}
                  size="lg"
                  classNames={{
                    base: "w-24 h-24",
                    name: "text-3xl font-bold"
                  }}
                  isBordered
                />
              </div>
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
                      <span className="font-medium capitalize">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-divider pt-8">
                <h3 className="mb-4 text-lg font-bold text-default-900">Bio</h3>
                <p className="text-sm leading-relaxed text-default-600">
                  {profile?.bio || defaultBio}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateProfile}>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-default-900">Edit Profile</h2>
                <p className="text-sm font-normal text-default-500">Update your personal information</p>
              </ModalHeader>
              <ModalBody className="gap-4">
                {/* Profile Image Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Avatar
                      className="w-20 h-20"
                      color="primary"
                      src={imagePreview || formState.profile_image}
                      name={(formState.name || formState.email || 'U').charAt(0).toUpperCase()}
                      size="lg"
                      classNames={{
                        base: "w-20 h-20",
                        name: "text-2xl font-bold"
                      }}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      color="primary"
                      className="absolute bottom-0 right-0 rounded-full"
                      onPress={() => fileInputRef.current?.click()}
                    >
                      <Camera size={14} />
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                  <p className="text-xs text-default-500">Click to upload profile photo</p>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full Name"
                    placeholder="Your name"
                    value={formState.name}
                    onValueChange={(v) => setFormState({ ...formState, name: v })}
                    startContent={<User size={16} className="text-default-400" />}
                  />
                  <Input
                    label="Email Address"
                    placeholder="your.email@example.com"
                    type="email"
                    value={formState.email}
                    onValueChange={(v) => setFormState({ ...formState, email: v })}
                    startContent={<Mail size={16} className="text-default-400" />}
                  />
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 123-4567"
                    value={formState.phone}
                    onValueChange={(v) => setFormState({ ...formState, phone: v })}
                    startContent={<Phone size={16} className="text-default-400" />}
                    className="sm:col-span-2"
                  />
                </div>
                
                <Textarea
                  label="Bio"
                  placeholder="Tell us about yourself..."
                  value={formState.bio}
                  onValueChange={(v) => setFormState({ ...formState, bio: v })}
                  minRows={3}
                  maxRows={5}
                />
                
                <Input
                  type="password"
                  label="New Password"
                  placeholder="Leave blank to keep current"
                  value={formState.password}
                  onValueChange={(v) => setFormState({ ...formState, password: v })}
                  description="Only fill this if you want to change your password"
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
