import { useState } from 'react';
import { Lock, User, Phone, Mail, Save, Shield, CheckCircle, Clock, Sun, Moon, Check } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import useAuthStore from '../../stores/authStore';
import useThemeStore from '../../stores/themeStore';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const AVATARS = [
  { id: 'dark',          src: '/avatars/avatar-dark.svg',         label: 'Male · Dark',  description: 'Male — Dark skin'  },
  { id: 'fair',          src: '/avatars/avatar-fair.svg',         label: 'Male · Fair',  description: 'Male — Fair skin'  },
  { id: 'female-dark',   src: '/avatars/avatar-female-dark.svg',  label: 'Female · Dark', description: 'Female — Dark skin' },
  { id: 'female-fair',   src: '/avatars/avatar-female-fair.svg',  label: 'Female · Fair', description: 'Female — Fair skin' },
];

const Settings = () => {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem('pdd_avatar') || 'dark'
  );

  const handleAvatarSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    localStorage.setItem('pdd_avatar', avatarId);
    window.dispatchEvent(new Event('pdd_avatar_changed'));
    toast.success('Avatar updated!');
  };

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/profile-update', profileData);
      const d = response.data || response;
      if (response.success || d.user) {
        setUser(d.user);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const p = passwordData.new_password;
    if (p.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(p)) { toast.error('Password must contain at least one uppercase letter'); return; }
    if (!/[a-z]/.test(p)) { toast.error('Password must contain at least one lowercase letter'); return; }
    if (!/[0-9]/.test(p)) { toast.error('Password must contain at least one number'); return; }
    if (p !== passwordData.confirm_password) { toast.error('Passwords do not match'); return; }
    if (passwordData.current_password === p) { toast.error('New password must be different from current'); return; }
    setPasswordLoading(true);
    try {
      const response = await api.post('/password-change', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      if (response.success) {
        toast.success('Password changed successfully!');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 text-sm mt-0.5">Manage your account settings and preferences</p>
      </div>

      {/* Avatar Selection */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Profile Avatar</h3>
        <div className="flex gap-4 flex-wrap">
          {AVATARS.map((av) => (
            <button
              key={av.id}
              onClick={() => handleAvatarSelect(av.id)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                selectedAvatar === av.id
                  ? 'border-primary-600 bg-primary-600/8 shadow-lg shadow-primary-600/20'
                  : 'border-dark-700 bg-dark-800/40 hover:border-dark-600'
              }`}
            >
              <img
                src={av.src}
                alt={av.label}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <span className="text-xs font-medium text-dark-300">{av.description}</span>
              {selectedAvatar === av.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center shadow">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {selectedAvatar === av.id && (
                <span className="text-[10px] text-primary-400 font-semibold">Active</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-dark-500 text-xs mt-3">Your avatar appears in the sidebar and across the app.</p>
      </div>

      {/* Account Info Card */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={AVATARS.find(a => a.id === selectedAvatar)?.src || '/avatars/avatar-dark.svg'}
            alt="avatar"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <h3 className="text-white font-semibold">{user?.full_name}</h3>
            <p className="text-dark-500 text-xs">{user?.email}</p>
          </div>
          <Badge variant={user?.is_admin ? 'danger' : 'primary'} size="sm" className="ml-auto">
            {user?.is_admin ? 'Admin' : 'Customer'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-dark-800/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-3.5 h-3.5 text-dark-500" />
              <span className="text-dark-500 text-[11px] uppercase tracking-wide">Email</span>
            </div>
            <p className="text-white text-sm font-medium truncate">{user?.email}</p>
          </div>
          <div className="bg-dark-800/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-dark-500" />
              <span className="text-dark-500 text-[11px] uppercase tracking-wide">Member Since</span>
            </div>
            <p className="text-white text-sm font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-600/10 rounded-lg flex items-center justify-center">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-purple-500" /> : <Sun className="w-4 h-4 text-purple-500" />}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Appearance</h3>
            <p className="text-dark-500 text-xs">Choose your preferred theme</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-primary-500 bg-primary-600/10'
                : 'border-dark-700/50 bg-primary-600/5 hover:border-dark-600'
            }`}
          >
            <div className="w-10 h-10 bg-dark-800 border border-dark-700 rounded-lg flex items-center justify-center">
              <Moon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-white text-sm font-medium">Dark</span>
            {theme === 'dark' && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="w-4 h-4 text-primary-500" />
              </div>
            )}
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-primary-500 bg-primary-600/10'
                : 'border-dark-700/50 bg-primary-600/5 hover:border-dark-600'
            }`}
          >
            <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-center">
              <Sun className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-white text-sm font-medium">Light</span>
            {theme === 'light' && (
              <div className="absolute top-2 right-2">
                <CheckCircle className="w-4 h-4 text-primary-500" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-600/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary-500" />
          </div>
          <h3 className="text-white font-semibold text-sm">Profile Settings</h3>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name</label>
              <Input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Enter your full name"
                icon={User}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone Number</label>
              <Input
                type="tel"
                value={profileData.phone_number}
                onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                placeholder="0XX XXX XXXX"
                icon={Phone}
              />
            </div>
          </div>
          <div>
            <Button type="submit" loading={loading} size="sm" fullWidth>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-600/10 rounded-lg flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary-500" />
          </div>
          <h3 className="text-white font-semibold text-sm">Change Password</h3>
        </div>

        <p className="text-dark-500 text-xs mb-4">Min 8 characters. Include uppercase, lowercase, and numbers.</p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Current Password</label>
            <Input
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              placeholder="Enter current password"
              icon={Lock}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">New Password</label>
              <Input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Enter new password"
                icon={Lock}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirm Password</label>
              <Input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
                icon={Lock}
                required
                minLength={8}
              />
            </div>
          </div>
          <div>
            <Button type="submit" loading={passwordLoading} size="sm" fullWidth>
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Change Password
            </Button>
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-4 py-3 flex items-center gap-3">
        <Shield className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        <p className="text-dark-400 text-xs">
          <strong className="text-yellow-400">Security:</strong> Never share your password. Our staff will never ask for it.
        </p>
      </div>
    </div>
  );
};

export default Settings;
