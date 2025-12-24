import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import GoldButton from '@/components/GoldButton';
import { useAuth } from '@/context/AuthContext';
import { getMyProfile, upsertMyProfile } from '@/db/profiles';
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  Upload, 
  Save, 
  Eye, 
  EyeOff,
  CircleX,
  CircleCheck,
  UploadCloud,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';

const recentDevices = [
  { id: 1, device: "iPhone 13 Pro", location: "Dubai, UAE", ip: "192.168.1.1", lastActive: "Today, 2:34 PM" },
  { id: 2, device: "MacBook Pro", location: "Dubai, UAE", ip: "192.168.1.2", lastActive: "Today, 10:15 AM" },
  { id: 3, device: "Chrome on Windows", location: "Abu Dhabi, UAE", ip: "192.168.1.3", lastActive: "Yesterday, 8:22 PM" }
];

const activityLogs = [
  { id: 1, action: "Logged in successfully", device: "iPhone 13 Pro", time: "Today, 2:34 PM" },
  { id: 2, action: "Password changed", device: "MacBook Pro", time: "April 22, 2025, 3:12 PM" },
  { id: 3, action: "Course completed: Wealth Generation", device: "Chrome on Windows", time: "April 20, 2025, 1:45 PM" }
];

const Settings = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio ||'Entrepreneur, Investor, Future Billionaire');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const [profileImage, setProfileImage] = useState(user?.profilePic || (null));
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // New state for active tab

  // Log activity when user visits the settings page
  useEffect(() => {
    if (user && !hasLoggedActivity.current) {
      logActivity('SETTINGS_VIEW');
      hasLoggedActivity.current = true;
    }
    const loadProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (profile) {
          setName(profile.name || user?.name || '');
          setBio(profile.bio || user?.bio || '');
          setProfileImage(profile.avatarUrl || user?.profilePic || null);
        }
      } catch {}
    };
    loadProfile();
  }, [user]);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };
  
  const handleFile = (file: File) => {
    // Check file size (300KB limit)
    if (file.size > 300 * 1024) {
      toast({
        title: "File size error",
        description: "Image size must be less than 300KB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setProfileImage(reader.result.toString());
      }
    };
    reader.readAsDataURL(file);
  };
  
  const [isUpdating, setIsUpdating] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsUpdating(true);
      await upsertMyProfile({
        name,
        bio,
        avatarUrl: profileImage
      });
      
      // Log profile update activity with detailed changes
      const changes: any = {};
      if (name !== user.name) {
        changes.name = { old: user.name, new: name };
      }
      if (bio !== user.bio) {
        changes.bio = { old: user.bio, new: bio };
      }
      if (profileImage !== user.profilePic) {
        changes.profilePic = { changed: true };
      }
      
      logActivity('UPDATE_PROFILE', {
        changes
      });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password Updated",
      description: "Your password has been updated successfully.",
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };
  
  const toggleTwoFactor = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    toast({
      title: twoFactorEnabled ? "Two-Factor Auth Disabled" : "Two-Factor Auth Enabled",
      description: twoFactorEnabled 
        ? "Two-Factor Authentication has been disabled." 
        : "Two-Factor Authentication has been enabled for your account.",
    });
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <GlassmorphicCard className="mb-6 animate-fade-in">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 relative">
                  <div className="relative">
                    {profileImage && profileImage !== "null" ? (
                      <>
                        <img 
                          src={profileImage} 
                          alt="Profile Picture" 
                          className="h-32 w-32 rounded-full object-cover border-2 border-gold"
                        />
                        <button
                          type="button"
                          onClick={() => setProfileImage(null)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          title="Remove Profile Picture"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-gold/20 flex items-center justify-center">
                        <User className="h-16 w-16 text-gold/60" />
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{name}</h3>
                <p className="text-white/60 mb-6">{email}</p>
                <div className="w-full bg-gold/20 rounded-full px-4 py-2 text-center mb-4">
                  <span className="text-gold font-bold">Member {user?.membershipType}</span>
                </div>
              </div>
            </GlassmorphicCard>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-black/40 border border-white/10">

                {/* 
                <TabsTrigger value="notifications" className="flex-1">
                  Notifications
                  <Bell className="h-4 w-4 mr-2" />
                </TabsTrigger>
                <TabsTrigger value="security" className="flex-1">
                  Security
                  <Shield className="h-4 w-4 mr-2" />
                </TabsTrigger>
                */}

                <TabsTrigger value="profile" className="flex-1">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="profile">
                <GlassmorphicCard className="animate-fade-in">
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
                      
                      <div className="space-y-6">
                        <div>
                          <Label htmlFor="profile-name">Full Name</Label>
                          <Input 
                            id="profile-name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="bg-black/40 border-white/10 focus:border-gold"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="profile-email">Email Address</Label>
                          <Input 
                            id="profile-email" 
                            type="email" 
                            value={email} 
                            disabled
                            onChange={(e) => setEmail(e.target.value)} 
                            className="bg-black/40 border-white/10 focus:border-gold"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="profile-bio">Bio</Label>
                          <Textarea 
                            id="profile-bio" 
                            value={bio} 
                            onChange={(e) => setBio(e.target.value)} 
                            className="bg-black/40 border-white/10 focus:border-gold h-24"
                          />
                        </div>
                        
                        <div>
                          <Label>Profile Picture</Label>
                          <div 
                            className={`
                              mt-1 flex justify-center rounded-lg border-2 border-dashed px-6 py-10
                              ${dragActive ? 'border-gold bg-gold/5' : 'border-white/20 bg-black/40'}
                            `}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                          >
                            <div className="text-center">
                              <UploadCloud className="mx-auto h-12 w-12 text-white/40" />
                              <div className="mt-4 flex">
                                <label
                                  htmlFor="file-upload"
                                  className="cursor-pointer text-gold hover:text-gold/80"
                                >
                                  <span>Upload File</span>
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                  />
                                </label>
                                <p className="pr-1 text-white/60">or drag and drop</p>
                              </div>
                              <p className="text-xs text-white/60 mt-2">PNG, JPG, GIF up to 10MB</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <GoldButton type="submit" loading={isUpdating}>
                      <Save className="mr-2 h-4 w-4" /> 
                        Save Changes  
                      </GoldButton>
                    </div>
                  </form>
                </GlassmorphicCard>
              </TabsContent>
              
              <TabsContent value="security">
                {/* Password Change */}
                <GlassmorphicCard className="mb-8 animate-fade-in">
                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-6">Change Password</h2>
                      
                      <div className="space-y-6">
                        <div>
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input 
                              id="current-password" 
                              type={showPassword ? "text" : "password"} 
                              value={currentPassword} 
                              onChange={(e) => setCurrentPassword(e.target.value)} 
                              className="bg-black/40 border-white/10 focus:border-gold pr-10"
                            />
                            <button 
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center pr-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-white/60" />
                              ) : (
                                <Eye className="h-4 w-4 text-white/60" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Input 
                              id="new-password" 
                              type={showPassword ? "text" : "password"} 
                              value={newPassword} 
                              onChange={(e) => setNewPassword(e.target.value)} 
                              className="bg-black/40 border-white/10 focus:border-gold pr-10"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <div className="relative">
                            <Input 
                              id="confirm-password" 
                              type={showPassword ? "text" : "password"} 
                              value={confirmPassword} 
                              onChange={(e) => setConfirmPassword(e.target.value)} 
                              className="bg-black/40 border-white/10 focus:border-gold pr-10"
                            />
                          </div>
                          {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <GoldButton 
                        type="submit" 
                        disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                      >
                        <Lock className="mr-2 h-4 w-4" /> Update Password 
                      </GoldButton>
                    </div>
                  </form>
                </GlassmorphicCard>
                
                {/* Two-Factor Authentication */}
                <GlassmorphicCard className="mb-8 animate-fade-in delay-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Two-Factor Authentication</h3>
                      <p className="text-white/60 mb-4 md:mb-0">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="flex items-center">
                      <Switch 
                        checked={twoFactorEnabled} 
                        onCheckedChange={toggleTwoFactor} 
                        className={twoFactorEnabled ? "animate-pulse-gold" : ""}
                      />
                      <span className="ml-2 text-sm">
                        {twoFactorEnabled ? (
                          <span className="text-gold">Enabled</span>
                        ) : (
                          <span className="text-white/60">Disabled</span>
                        )}
                      </span>
                    </div>
                  </div>
                </GlassmorphicCard>
                
                {/* Recent Devices */}
                <GlassmorphicCard className="mb-8 animate-fade-in delay-200">
                  <h3 className="text-xl font-bold mb-6">Recent Devices</h3>
                  
                  <div className="space-y-4">
                    {recentDevices.map((device) => (
                      <div key={device.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div>
                          <p className="font-medium">{device.device}</p>
                          <div className="flex items-center text-white/60 text-sm">
                            <span>{device.location}</span>
                            <span className="mx-2">•</span>
                            <span>{device.ip}</span>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-white/80 text-sm">{device.lastActive}</p>
                          {device.id === 1 && (
                            <p className="text-gold text-xs">Current Device</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassmorphicCard>
                
                {/* Activity Log */}
                <GlassmorphicCard className="mb-8 animate-fade-in delay-300">
                  <h3 className="text-xl font-bold mb-6">Account Activity</h3>
                  
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-white/60 text-sm">{log.device}</p>
                        </div>
                        <p className="text-white/60 text-sm">{log.time}</p>
                      </div>
                    ))}
                  </div>
                </GlassmorphicCard>
                
                {/* Danger Zone */}
                <GlassmorphicCard className="border-red-900/30 animate-fade-in delay-400">
                  <h3 className="text-xl font-bold mb-6 text-red-500">Danger Zone</h3>
                  
                  <div className="p-4 rounded-lg bg-red-900/10 border border-red-900/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold mb-2">Delete Account</h4>
                        <p className="text-white/60 text-sm mb-0">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                      </div>
                      <button 
                        className="bg-red-900/30 text-red-500 border border-red-900/50 px-4 py-2 rounded-md hover:bg-red-900/50 transition-colors"
                        disabled
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </GlassmorphicCard>
              </TabsContent>
              
              <TabsContent value="notifications">
                <GlassmorphicCard className="animate-fade-in">
                  <h2 className="text-2xl font-bold mb-6">Notification Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-white/60 text-sm">Receive updates, offers, and news</p>
                      </div>
                      <Switch 
                        checked={notificationsEnabled} 
                        onCheckedChange={setNotificationsEnabled}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Course Updates</h4>
                        <p className="text-white/60 text-sm">Receive notifications when new content is available</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Affiliate Activity</h4>
                        <p className="text-white/60 text-sm">Notifications for new referrals and commissions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Security Alerts</h4>
                        <p className="text-white/60 text-sm">Important security-related notifications</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Marketing</h4>
                        <p className="text-white/60 text-sm">Promotions and discounts</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex justify-end">
                      <GoldButton>
                      <Save className="mr-2 h-4 w-4" /> Save Preferences   
                      </GoldButton>
                    </div>
                  </div>
                </GlassmorphicCard>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
