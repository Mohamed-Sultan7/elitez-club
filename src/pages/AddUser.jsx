import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { updateProfileById } from '@/db/profiles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GoldButton from '@/components/GoldButton';
import ParticleBackground from '@/components/ParticleBackground';
import { UserPlus, ChevronDown, ChevronUp, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const AddUser = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [membershipType, setMembershipType] = useState('TOP G - Monthly');
  const [bio, setBio] = useState('Entrepreneur, Investor, Future Billionaire');
  const [profilePic, setProfilePic] = useState(null);
  const [subscriptionDate, setSubscriptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [renewIntervalDays, setRenewIntervalDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { user, createUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];

  // Handle membership type change and set default days
   const handleMembershipTypeChange = (value) => {
     setMembershipType(value);
     // Set default days based on membership type
     switch (value) {
       case 'Free Trial':
         setRenewIntervalDays(1);
         break;
       case 'TOP G - Monthly':
         setRenewIntervalDays(30);
         break;
       case 'TOP G - Annually':
         setRenewIntervalDays(365);
         break;
       default:
         setRenewIntervalDays(30);
     }
   };
  
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create auth user (uses existing AuthContext flow)
      await createUser(email, password, {
        name: fullName,
        membershipType: membershipType,
        bio: bio,
        profilePic: profilePic,
        subscriptionDate: subscriptionDate,
        renewIntervalDays: parseInt(renewIntervalDays)
      });
      // Note: In a real admin user creation flow, you'd need a service-role to create
      // auth users and then write profiles by id. Here we rely on the AuthContext
      // signUp and ensureMyProfileExists to initialize the profile for the created user.

      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setMembershipType('TOP G - Monthly');
      setBio('');
      setProfilePic('');
      setSubscriptionDate('');
      setRenewIntervalDays(30);
    } catch (error) {
      console.error('Error creating user:', error);
      // Error is already handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-background">
      <ParticleBackground />
      
      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Elitez Club" className="h-20 mx-auto mb-4 animate-pulse-slow" />
          <h1 className="font-size-2rem font-bold text-white mb-1rem">Elitez Club Academy</h1>
          <p className="text-muted-foreground">Add New Student</p>
        </div>

        <div className="glass rounded-lg p-8 border border-white/10 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Essential fields - always visible */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/10 bg-black/40 focus:border-gold text-white text-left pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="membershipType">Membership Type</Label>
              <Select value={membershipType} onValueChange={handleMembershipTypeChange}>
                <SelectTrigger className="border-white/10 bg-black/40 focus:border-gold text-white text-left">
                  <SelectValue placeholder="Select Membership Type" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                   <SelectItem value="Free Trial" className="text-white hover:bg-white/10">
                     Free Trial (1 day)
                   </SelectItem>
                   <SelectItem value="TOP G - Monthly" className="text-white hover:bg-white/10">
                     Elitez Club - Monthly (30 days)
                   </SelectItem>
                   <SelectItem value="TOP G - Annually" className="text-white hover:bg-white/10">
                     Elitez Club - Annually (365 days)
                   </SelectItem>
                 </SelectContent>
              </Select>
            </div>

            {/* Toggle button for additional fields */}
            <button 
              type="button" 
              onClick={() => setShowAdditionalFields(!showAdditionalFields)}
              className="flex items-center justify-center w-full py-2 text-gold hover:text-white transition-colors duration-200 focus:outline-none"
            >
              {showAdditionalFields ? (
                <>
                  <ChevronUp className="mr-2" size={18} />
                  <span>Hide Additional Info</span>
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2" size={18} />
                  <span>Add Additional Info</span>
                </>
              )}
            </button>

            {/* Additional fields - conditionally visible */}
            {showAdditionalFields && (
              <div className="space-y-4 animate-fade-in border-t border-white/10 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    type="text"
                    placeholder="Enter bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profilePic">Profile Pic URL (Optional)</Label>
                  <Input
                    id="profilePic"
                    type="url"
                    placeholder="Enter profile pic URL"
                    value={profilePic}
                    onChange={(e) => setProfilePic(e.target.value)}
                    className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                  />
                </div>

            <div className="space-y-2">
              <Label htmlFor="membershipDays">Membership Days</Label>
              <Input
                id="membershipDays"
                type="number"
                placeholder="30"
                value={renewIntervalDays}
                onChange={(e) => setRenewIntervalDays(parseInt(e.target.value))}
                className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                required
                min="1"
              />
            </div>
            
                <div className="space-y-2">
                  <Label htmlFor="subscriptionDate">Subscription Start Date</Label>
                  <Input
                    id="subscriptionDate"
                    type="date"
                    value={subscriptionDate}
                    onChange={(e) => setSubscriptionDate(e.target.value)}
                    className="border-white/10 bg-black/40 focus:border-gold text-white text-left"
                    required
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <GoldButton
                type="submit"
                className="w-full text-lg py-6"
                loading={loading || authLoading}
              >
                <UserPlus className="mr-2" />
                Add Student
              </GoldButton>
            </div>
            
            <div className="pt-4">
              <GoldButton
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin/manage-students')}
              >
                <ArrowLeft className="mr-2" />
                Back to Student Management
              </GoldButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
