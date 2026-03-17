import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { AppShell } from '../components/AppShell';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProfileSkeleton } from '../components/SkeletonLoaders';
import { 
  Card, 
  CardBody,
  CardHeader,
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
  Textarea,
  Divider,
  Progress
} from '@nextui-org/react';
import { Mail, Shield, Calendar, Briefcase, User, Edit3, Phone, Users, Camera, TrendingUp, Clock } from 'lucide-react';

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
      } catch {
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

  // Show skeleton while loading profile
  if (!profile) {
    return (
      <AppShell>
        <Breadcrumbs />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-default-900">My Profile</h1>
            <p className="text-default-600">Loading your profile...</p>
          </div>
          <ProfileSkeleton />
        </div>
      </AppShell>
    );
  }

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
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
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
    } catch {
      addToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Breadcrumbs />
      <div className="flex flex-col gap-8 max-w-[1200px] mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-default-900">Account Settings</h1>
          <p className="text-default-500 text-lg">Manage your personal information, security, and profile preferences.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Profile Overview */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/20 to-secondary/20 w-full" />
              <CardBody className="p-8 flex flex-col items-center -mt-12">
                <div className="relative group">
                  <Avatar
                    isBordered
                    color="primary"
                    src={imagePreview || profile?.profile_image || user.profile_image || undefined} 
                    name={(profile?.name || profile?.email || user.email).charAt(0).toUpperCase()}
                    className="w-32 h-32 text-4xl font-black bg-background shadow-xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={onOpen}>
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <h2 className="text-2xl font-black text-default-900 leading-tight">
                    {profile?.name || (profile?.email || user.email).split('@')[0]}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Chip 
                      size="sm" 
                      variant="flat" 
                      color="primary" 
                      className="capitalize font-bold px-3 py-1 h-auto"
                    >
                      {profile?.role || user.role}
                    </Chip>
                    <Chip 
                      size="sm" 
                      variant="flat" 
                      color="secondary" 
                      className="capitalize font-bold px-3 py-1 h-auto"
                    >
                      {profile?.department || defaultDepartment}
                    </Chip>
                  </div>
                </div>

                <Divider className="my-8 opacity-50" />

                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-default-500 font-medium">Profile Completion</span>
                    <span className="text-primary font-bold">85%</span>
                  </div>
                  <Progress size="sm" value={85} color="primary" className="h-1.5" />
                  <p className="text-[10px] text-default-400 leading-relaxed text-center italic">
                    Complete your profile to help recruiters find you more easily.
                  </p>
                </div>

                <Button
                  color="primary"
                  variant="shadow"
                  startContent={<Edit3 size={18} />}
                  className="mt-8 w-full font-bold shadow-primary-200 h-11"
                  onPress={onOpen}
                >
                  Update Profile
                </Button>
              </CardBody>
            </Card>

            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20">
              <CardBody className="p-6">
                <h4 className="text-xs font-black text-default-400 uppercase tracking-widest mb-4">Quick Links</h4>
                <div className="flex flex-col gap-2">
                  <Button as={Link} to="/dashboard" variant="flat" className="justify-start font-bold h-11 bg-default-100 dark:bg-default-100/50 hover:bg-primary/10 hover:text-primary transition-all">
                    <TrendingUp size={18} className="mr-2" /> View Analytics
                  </Button>
                  <Button as={Link} to="/applications" variant="flat" className="justify-start font-bold h-11 bg-default-100 dark:bg-default-100/50 hover:bg-secondary/10 hover:text-secondary transition-all">
                    <Users size={18} className="mr-2" /> My Applications
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Detailed Information */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20">
              <CardHeader className="px-8 pt-8 pb-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-black text-default-900 uppercase tracking-tight">Detailed Information</h3>
                  <p className="text-xs text-default-500 font-medium uppercase tracking-widest">Your public and private account data</p>
                </div>
              </CardHeader>
              <CardBody className="px-8 pb-8">
                <div className="grid gap-8 sm:grid-cols-2">
                  {profileData.map((item, idx) => (
                    <div key={idx} className="group p-4 rounded-2xl bg-default-50 dark:bg-default-100/30 border border-divider/50 hover:bg-default-100 dark:hover:bg-default-100/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-white dark:bg-default-50 border border-divider shadow-sm text-primary group-hover:scale-110 transition-transform">
                          <item.icon size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-default-400 dark:text-default-500 uppercase tracking-widest leading-none mb-1.5">{item.label}</span>
                          <span className="text-sm font-bold text-default-900 capitalize">{item.value}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 p-6 rounded-2xl bg-primary-50 dark:bg-primary-50/30 border border-primary-100">
                  <h3 className="mb-4 text-sm font-black text-primary-700 uppercase tracking-widest flex items-center gap-2">
                    <User size={18} />
                    Professional Bio
                  </h3>
                  <p className="text-sm leading-relaxed text-primary-800 font-medium italic">
                    &quot;{profile?.bio || defaultBio}&quot;
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card className="border border-divider shadow-sm bg-content1 dark:bg-default-50/20">
              <CardHeader className="px-8 pt-8 pb-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-black text-default-900 uppercase tracking-tight">System Access</h3>
                  <p className="text-xs text-default-500 font-medium uppercase tracking-widest">Platform permissions and security</p>
                </div>
              </CardHeader>
              <CardBody className="px-8 pb-8">
                <div className="flex flex-wrap gap-3">
                  <Chip 
                    variant="shadow" 
                    color="primary" 
                    className="font-black h-10 px-6 uppercase tracking-widest shadow-primary-200 dark:shadow-none"
                    startContent={<Shield size={16} className="mr-1" />}
                  >
                    Level {user.role === 'admin' ? '3' : user.role === 'team_lead' ? '2' : '1'} Access
                  </Chip>
                  <Chip 
                    variant="flat" 
                    className="bg-default-100 dark:bg-default-100/50 font-bold h-10 px-6 uppercase tracking-widest"
                    startContent={<Clock size={16} className="mr-1" />}
                  >
                    Member since {profile.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear()}
                  </Chip>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-default-900">Edit Profile</h2>
                <p className="text-sm font-normal text-default-500">Update your personal information</p>
              </ModalHeader>
              <ModalBody className="gap-6 py-4">
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
                      className="absolute bottom-0 right-0 rounded-full shadow-md"
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
                  <p className="text-xs text-default-500 font-medium">Click to upload profile photo</p>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full Name"
                    labelPlacement="outside"
                    placeholder="Your name"
                    value={formState.name}
                    onValueChange={(v) => setFormState({ ...formState, name: v })}
                    startContent={<User size={16} className="text-default-400" />}
                    classNames={{
                      label: "font-bold text-default-700",
                      inputWrapper: "bg-default-100/50"
                    }}
                  />
                  <Input
                    label="Email Address"
                    labelPlacement="outside"
                    placeholder="your.email@example.com"
                    type="email"
                    value={formState.email}
                    onValueChange={(v) => setFormState({ ...formState, email: v })}
                    startContent={<Mail size={16} className="text-default-400" />}
                    classNames={{
                      label: "font-bold text-default-700",
                      inputWrapper: "bg-default-100/50"
                    }}
                  />
                  <Input
                    label="Phone Number"
                    labelPlacement="outside"
                    placeholder="+1 (555) 123-4567"
                    value={formState.phone}
                    onValueChange={(v) => setFormState({ ...formState, phone: v })}
                    startContent={<Phone size={16} className="text-default-400" />}
                    className="sm:col-span-2"
                    classNames={{
                      label: "font-bold text-default-700",
                      inputWrapper: "bg-default-100/50"
                    }}
                  />
                </div>
                
                <Textarea
                  label="Bio"
                  labelPlacement="outside"
                  placeholder="Tell us about yourself..."
                  value={formState.bio}
                  onValueChange={(v) => setFormState({ ...formState, bio: v })}
                  minRows={3}
                  maxRows={5}
                  classNames={{
                    label: "font-bold text-default-700",
                    input: "bg-transparent",
                    inputWrapper: "bg-default-100/50"
                  }}
                />
                
                <Input
                  type="password"
                  label="New Password"
                  labelPlacement="outside"
                  placeholder="Leave blank to keep current"
                  value={formState.password}
                  onValueChange={(v) => setFormState({ ...formState, password: v })}
                  description="Only fill this if you want to change your password"
                  classNames={{
                    label: "font-bold text-default-700",
                    inputWrapper: "bg-default-100/50"
                  }}
                />
              </ModalBody>
              <ModalFooter className="border-t border-divider">
                <Button variant="light" onPress={onClose} isDisabled={loading} className="font-bold">
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={(e) => handleUpdateProfile(e)} 
                  isLoading={loading}
                  className="font-bold px-8 shadow-md shadow-primary-200"
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
  );
};

export default Profile;
