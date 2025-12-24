import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listProfiles, disableUser, updateProfileById } from '@/db/profiles';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GoldButton from '@/components/GoldButton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Search, UserCog, UserCheck, UserX, UserPlus, Ban, RefreshCw, Edit, Filter } from 'lucide-react';
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { Badge } from '@/components/ui/badge';

// Custom scrollbar styles
const customScrollbarStyles = `
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(255, 215, 0, 0.8); /* Gold color */
    border-radius: 10px;
  }
  ::-webkit-scrollbar-track {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

// Apply custom scrollbar styles
const ManageUsers = () => {
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = customScrollbarStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);
  const [membershipFilter, setMembershipFilter] = useState('active');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];
  
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

  // Fetch users from Supabase profiles
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !adminEmails.includes(user.email)) return;
      
      try {
        setLoading(true);
        console.log('[ManageUsers] Fetching profiles...');
        const profiles = await listProfiles();
        console.log('[ManageUsers] Profiles fetched:', profiles.length);

        const usersList = profiles.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email || 'Email not available', // Use email from profile if available, otherwise placeholder
          subscriptionDate: p.subscriptionDate,
          renewIntervalDays: p.renewIntervalDays,
          membershipType: p.membershipType,
          disabled: !!p.disabled,
        }));
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    // Only run this effect when the component mounts or when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle disabling/enabling user account
  const handleDisableAccount = async (userId, currentStatus) => {
    if (!userId) return;
    
    try {
      setActionLoading(true);
      setActionUserId(userId);
      
      await disableUser(userId, !currentStatus);
      
      // Update the local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, disabled: !currentStatus };
        }
        return user;
      }));
      
      toast({
        title: !currentStatus ? "Account Disabled" : "Account Enabled",
        description: !currentStatus ? "User account disabled successfully" : "User account enabled successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating account status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setActionUserId(null);
    }
  };
  
  // Handle renewing subscription
  const handleRenewSubscription = async (userId) => {
    if (!userId) return;
    
    try {
      setActionLoading(true);
      setActionUserId(userId);
      
      // Find the user
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');
      
      // Calculate new end date by adding 30 days
      let endDate;
      if (user.subscriptionDate) {
        const startDate = new Date(user.subscriptionDate);
        const currentRenewDays = user.renewIntervalDays || 0;
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + currentRenewDays + 30); // Add 30 more days
      } else {
        // If no subscription date exists, use today as start
        const today = new Date();
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);
      }
      
      await updateProfileById(userId, { renewIntervalDays: (user.renewIntervalDays || 0) + 30 });
      
      // Update the local state
      setUsers(users.map(u => {
        if (u.id === userId) {
          return { ...u, renewIntervalDays: (u.renewIntervalDays || 0) + 30 };
        }
        return u;
      }));
      
      toast({
        title: "Subscription Renewed",
        description: "User subscription extended for 30 days",
        variant: "default",
      });
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast({
        title: "Error",
        description: "An error occurred while renewing subscription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setActionUserId(null);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Undefined';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };

  // Calculate subscription status
  const getSubscriptionStatus = (subscriptionDate, renewIntervalDays) => {
    if (!subscriptionDate || !renewIntervalDays) return { status: 'Undefined', active: false };
    
    const startDate = new Date(subscriptionDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + renewIntervalDays);
    
    const today = new Date();
    const isActive = today <= endDate;
    
    return { 
      status: isActive ? 'Active' : 'Expired',
      active: isActive,
      endDate: endDate.toLocaleDateString('en-US')
    };
  };

  // Sort and filter users (exclude admins from students table)
  const filteredUsers = users
    .filter(user => {
      // Exclude admin users from the students table
      if (adminEmails.includes(user.email)) {
        return false;
      }
      
      // Filter by membership status
      const subscription = getSubscriptionStatus(user.subscriptionDate, user.renewIntervalDays);
      if (membershipFilter === 'active' && (!subscription.active || user.membershipType === 'Free Trial')) {
        return false;
      }
      if (membershipFilter === 'expired' && (subscription.active || user.membershipType === 'Free Trial')) {
        return false;
      }
      if (membershipFilter === 'freetrial' && user.membershipType !== 'Free Trial') {
        return false;
      }
      // 'all' shows all users, so no additional filtering needed
      
      const searchLower = searchTerm.toLowerCase();
      return (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by subscription date (newest first)
      const dateA = a.subscriptionDate ? new Date(a.subscriptionDate) : new Date(0);
      const dateB = b.subscriptionDate ? new Date(b.subscriptionDate) : new Date(0);
      return dateB - dateA; // Newest first
    });

  // If user is not loaded yet or not admin, show nothing
  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <UserCog className="w-8 h-8 text-gold" />
              <h1 className="text-4xl font-bold text-center mb-2">Student Management</h1>
            </div>
            <p className="text-white/70">
              {membershipFilter === 'active' && 'Active Memberships: '}
              {membershipFilter === 'expired' && 'Expired Memberships: '}
              {membershipFilter === 'freetrial' && 'Free Trial Students: '}
              {membershipFilter === 'all' && 'All Students: '}
              <span className="text-gold font-bold"> {filteredUsers.length} </span>
              {(searchTerm || membershipFilter !== 'all') && (
                <span className="mr-2">
                  (out of {users.filter(u => !adminEmails.includes(u.email)).length} students)
                </span>
              )}
            </p>
          </div>
          <GoldButton onClick={() => navigate('/admin/add-student')} className="flex items-center">
            <UserPlus className="mr-2" />
            Add New Student
          </GoldButton>
        </div>
        
        <GlassmorphicCard className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 focus:border-gold text-white"
            />
          </div>
        </GlassmorphicCard>

        {/* Membership Filter */}
        <GlassmorphicCard className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gold" />
            <span className="text-white font-medium">Filter by Membership:</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setMembershipFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                membershipFilter === 'active'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Active Memberships
            </button>
            <button
              onClick={() => setMembershipFilter('expired')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                membershipFilter === 'expired'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Expired Memberships
            </button>
            <button
              onClick={() => setMembershipFilter('freetrial')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                membershipFilter === 'freetrial'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Free Trial
            </button>
            <button
              onClick={() => setMembershipFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                membershipFilter === 'all'
                  ? 'bg-gradient-to-r from-gold to-yellow-600 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All Students
            </button>
          </div>
        </GlassmorphicCard>

        <GlassmorphicCard className="overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-white/70">Loading student data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              <div className="relative">
              <Table>
                <TableCaption className="sticky bottom-0 z-10 bg-black/90 backdrop-blur-sm py-3">Elitez Club Academy Student List</TableCaption>
                <TableHeader className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm shadow-md border-b border-gold/30">
                  <TableRow>
                    <TableHead className="text-left">#</TableHead>
                    <TableHead className="text-left">Name</TableHead>
                    <TableHead className="text-left">Email</TableHead>
                    <TableHead className="text-left">Subscription Date</TableHead>
                    <TableHead className="text-left">Duration</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-left">End Date</TableHead>
                    <TableHead className="text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        No students matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userData, index) => {
                      const subscription = getSubscriptionStatus(userData.subscriptionDate, userData.renewIntervalDays);
                      return (
                        <TableRow key={userData.id}>
                          <TableCell className="text-left">{index + 1}</TableCell>
                          <TableCell className="font-medium text-left">{userData.name || 'N/A'}</TableCell>
                          <TableCell className="text-left">
                            {userData.email || 'N/A'}
                          </TableCell>

                          <TableCell className="text-left">
                            {formatDate(userData.subscriptionDate)}
                          </TableCell>
                          
                          <TableCell className="text-left">
                            {userData.renewIntervalDays || 'N/A'} Days
                          </TableCell>

                          <TableCell className="text-left">
                            <Badge className={`${subscription.active ? 'bg-gold' : 'bg-red-500'} text-white`}>
                              {subscription.active ? (
                                <><UserCheck className="w-4 h-4 mr-1" /> {subscription.status}</>
                              ) : (
                                <><UserX className="w-4 h-4 mr-1" /> {subscription.status}</>
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-left">
                            {subscription.endDate || 'N/A'}
                          </TableCell>

                          <TableCell className="text-left">
                            <div className="flex justify-start items-center gap-2">
                              <GoldButton 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRenewSubscription(userData.id)}
                                loading={actionLoading && actionUserId === userData.id}
                                disabled={actionLoading}
                              >
                                <RefreshCw className="mr-1 w-4 h-4" />
                                Renew (30 Days)
                              </GoldButton>

                              <GoldButton 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDisableAccount(userData.id, userData.disabled)}
                                loading={actionLoading && actionUserId === userData.id}
                                disabled={actionLoading}
                                className={userData.disabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                              >
                                {userData.disabled ? (
                                  <>
                                    <UserCheck className="mr-1 w-4 h-4" />
                                    Enable Account
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-1 w-4 h-4" />
                                    Disable Account
                                  </>
                                )}
                              </GoldButton>

                              <GoldButton 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/admin/edit-user/${userData.id}`)}
                                disabled={actionLoading}
                              >
                                <Edit className="w-4 h-4" />
                              </GoldButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </GlassmorphicCard>
      </div>
    </MainLayout>
  );
};

export default ManageUsers;
