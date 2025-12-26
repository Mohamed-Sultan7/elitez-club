import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfileById, updateProfileById, disableUser } from '@/db/profiles';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GoldButton from '@/components/GoldButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Save, Loader2, Upload, Trash2 } from 'lucide-react';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const EditUser = () => {
  const { userId } = useParams();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    bio: '',
    disabled: false,
    membershipType: 'TOP G - Monthly',
    password: '••••••••', // Placeholder for password (not editable)
    profilePic: '',
    renewIntervalDays: 30,
    subscriptionDate: '',
    addedBy: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com'];
  
  // Protect the admin page - only accessible by admins
  useEffect(() => {
    if (!user) {
      // If not logged in, redirect to login
      navigate('/login', { replace: true });
    } else if (!adminEmails.includes(user.email)) {
      // If logged in but not admin, redirect to home
      navigate('/home', { replace: true });
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  // Function to map legacy membership types to new ones
  const mapLegacyMembershipType = (membershipType, renewIntervalDays) => {
    // Handle legacy membership types
    if (membershipType === 'TOP G') {
      // Determine if it's monthly or annually based on renewIntervalDays
      if (renewIntervalDays === 365) {
        return 'TOP G - Annually';
      } else {
        return 'TOP G - Monthly';
      }
    }
    
    // Handle other legacy types
    if (membershipType === 'WAR ROOM' || membershipType === 'THE REAL WORLD') {
      return 'TOP G - Monthly';
    }
    
    // If it's already a new membership type, return as is
    if (['Free Trial', 'TOP G - Monthly', 'TOP G - Annually'].includes(membershipType)) {
      return membershipType;
    }
    
    // Default fallback
    return 'TOP G - Monthly';
  };

  // Fetch user data from profiles
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async () => {
      if (!userId || !user || !adminEmails.includes(user.email)) return;
      
      try {
        setLoading(true);
        console.log('[EditUser] Fetching profile for:', userId);
        const data = await getProfileById(userId);
        if (!isMounted) return;
        
        if (data) {
          const renewIntervalDays = data.renewIntervalDays || 30;
          const mappedMembershipType = mapLegacyMembershipType(data.membershipType || 'TOP G', renewIntervalDays);
          
          setUserData({
            name: data.name || '',
            email: data.email || 'Email not available', // Use email from profile or placeholder
            bio: data.bio || '',
            disabled: !!data.disabled,
            membershipType: mappedMembershipType,
            password: '••••••••', // Placeholder for password (not editable)
            profilePic: data.avatarUrl || '',
            renewIntervalDays: renewIntervalDays,
            subscriptionDate: data.subscriptionDate ? new Date(data.subscriptionDate).toISOString().split('T')[0] : '',
            addedBy: ''
          });
          
          // Set image preview if profile pic exists
          if (data.avatarUrl) {
            setImagePreview(data.avatarUrl);
          }
        } else {
          if (isMounted) {
            toast({
              title: "Error",
              description: "User data not found",
              variant: "destructive",
            });
            navigate('/admin/manage-students');
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching user data:', error);
          toast({
            title: "Error",
            description: "An error occurred while fetching user data",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();
    
    return () => {
      isMounted = false;
    };
  }, [userId]); // Only depend on userId since it's the main trigger for data fetching

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserData({
      ...userData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle select changes
  const handleSelectChange = (name, value) => {
    setUserData({
      ...userData,
      [name]: value
    });
  };

  // Handle membership type change with automatic renewIntervalDays update
  const handleMembershipTypeChange = (membershipType) => {
    let renewIntervalDays;
    
    switch (membershipType) {
      case 'Free Trial':
        renewIntervalDays = 1;
        break;
      case 'TOP G - Monthly':
        renewIntervalDays = 30;
        break;
      case 'TOP G - Annually':
        renewIntervalDays = 365;
        break;
      default:
        renewIntervalDays = 30;
    }
    
    setUserData({
      ...userData,
      membershipType,
      renewIntervalDays
    });
  };

  // Handle image upload
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (500KB limit)
      if (file.size > 500 * 1024) {
        toast({
          title: "File size error",
          description: "Image size must be less than 500KB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setProfileImage(reader.result.toString());
          setImagePreview(reader.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!userId) return;
    
    try {
      setDeleting(true);
      
      await disableUser(userId, true);
      
      toast({
        title: "Account Disabled",
        description: "User account disabled successfully",
        variant: "default",
      });
      
      // Close the dialog and navigate back to manage users page
      setIsDeleteDialogOpen(false);
      navigate('/admin/manage-students');
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "An error occurred while disabling user account",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId) return;
    
    try {
      setSaving(true);
      
      // Prepare data for update
      const updateData = {
        name: userData.name,
        bio: userData.bio,
        disabled: userData.disabled,
        membershipType: userData.membershipType,
        renewIntervalDays: parseInt(userData.renewIntervalDays),
        subscriptionDate: userData.subscriptionDate
      };
      
      // Determine avatarUrl
      let avatarUrl = undefined;
      if (profileImage) {
        avatarUrl = profileImage;
      } else if (userData.profilePic === null) {
        avatarUrl = null;
      }

      await updateProfileById(userId, {
        name: updateData.name,
        bio: updateData.bio,
        disabled: updateData.disabled,
        membershipType: updateData.membershipType,
        renewIntervalDays: updateData.renewIntervalDays,
        subscriptionDate: updateData.subscriptionDate,
        avatarUrl: avatarUrl,
      });
      
      toast({
        title: "Updated",
        description: "User data updated successfully",
        variant: "default",
      });
      
      // Navigate back to manage users page
      navigate('/admin/manage-students');
      
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating user data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/admin/manage-students" className="flex items-center text-white/60 hover:text-gold transition-colors">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span>Back to Student Management</span>
          </Link>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Edit User Data</h1>
          {/*
          <GoldButton 
            type="button" 
            variant="destructive"
            className="flex items-center justify-center bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
            onClick={() => setIsDeleteDialogOpen(true)}
            loading={deleting}
            disabled={saving || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="ml-2 h-4 w-4" />
                Delete Account
              </>
            )}
          </GoldButton>
          */}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="mr-2">Loading data...</span>
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : (
          <GlassmorphicCard>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture */}
                <div className="space-y-2">
                  <Label htmlFor="profilePic">Profile Picture</Label>
                  <div 
                    className="flex flex-col md:flex-row items-center gap-4"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageChange({ target: { files: [file] } });
                    }}
                  >
                    <div className="relative">
                      <div 
                        className="w-32 h-32 rounded-full overflow-hidden bg-black/20 border border-white/10 flex items-center justify-center cursor-pointer hover:border-gold transition-colors duration-200"
                        onClick={() => document.getElementById('profilePic').click()}
                      >
                        {imagePreview ? (
                          <img src={imagePreview} alt="User Picture" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-2">
                            <Upload className="w-6 h-6 text-white/50 mb-1" />
                            <span className="text-white/50 text-xs">Drag or click</span>
                          </div>
                        )}
                      </div>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            setProfileImage(null);
                            setUserData(prev => ({ ...prev, profilePic: null }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors duration-200"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Email and Name - Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Read-only)</Label>
                    <Input
                      id="email"
                      name="email"
                      value={userData.email}
                      readOnly
                      className="border-white/10 bg-black/40 focus:border-gold text-white text-left opacity-70"
                    />
                  </div>
                  
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={userData.name}
                    onChange={handleChange}
                    placeholder="Enter username"
                    className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                  />
                </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={userData.bio}
                    onChange={handleChange}
                    placeholder="Enter user bio"
                    className="min-h-20 border-white/10 bg-black/40 focus:border-gold text-white text-left"
                  />
                </div>

                {/* Subscription Date and Renew Interval Days - Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subscription Date */}
                  <div className="space-y-2">
                    <Label htmlFor="subscriptionDate">Subscription Date</Label>
                    <Input
                      id="subscriptionDate"
                      name="subscriptionDate"
                      type="date"
                      value={userData.subscriptionDate}
                      onChange={handleChange}
                      className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    />
                  </div>

                  {/* Renew Interval Days */}
                  <div className="space-y-2">
                    <Label htmlFor="renewIntervalDays">Subscription Duration (Days)</Label>
                    <Input
                      id="renewIntervalDays"
                      name="renewIntervalDays"
                      type="number"
                      value={userData.renewIntervalDays}
                      onChange={handleChange}
                      min="0"
                      className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    />
                  </div>
                </div>

                {/* Membership Type */}
                <div className="space-y-2">
                  <Label htmlFor="membershipType">Membership Type</Label>
                  <Select 
                    value={userData.membershipType} 
                    onValueChange={(value) => handleMembershipTypeChange(value)}
                  >
                    <SelectTrigger className="border-white/10 bg-black/40 focus:border-gold text-white text-left">
                      <SelectValue placeholder="Select Membership Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Free Trial">Free Trial</SelectItem>
                      <SelectItem value="Elitez Club - Monthly">Elitez Club - Monthly</SelectItem>
                      <SelectItem value="Elitez Club - Annually">Elitez Club - Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Disabled Status */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disabled"
                    name="disabled"
                    checked={userData.disabled}
                    onCheckedChange={(checked) => handleChange({
                      target: { name: 'disabled', type: 'checkbox', checked }
                    })}
                    className="border-white/10 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
                  />
                  <Label htmlFor="disabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Disable Account
                  </Label>
                </div>

                {/* Added By (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="addedBy">Added By (Read-only)</Label>
                  <Input
                    id="addedBy"
                    name="addedBy"
                    value={userData.addedBy || 'N/A'}
                    readOnly
                    className="border-white/10 bg-black/40 focus:border-gold text-white text-left opacity-70"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex space-x-2 pt-4">
                  <GoldButton 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate('/admin/manage-students')}
                    disabled={saving}
                  >
                    Cancel
                  </GoldButton>
                  <GoldButton 
                    type="submit" 
                    className="w-full md:w-auto flex items-center justify-center"
                    loading={saving}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </GoldButton>
                </div>
              </form>
            </div>
          </GlassmorphicCard>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All user data will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 ml-2"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default EditUser;
