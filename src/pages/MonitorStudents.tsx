import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { Search, Activity, ArrowLeft, User, Calendar, Eye, MessageCircle, Filter } from 'lucide-react';
import { listProfiles } from '@/db/profiles';
import { supabase } from '@/lib/supabaseClient';

// Function to calculate days remaining in membership
const calculateDaysRemaining = (subscriptionDate: string, renewIntervalDays: number = 30): number => {
  if (!subscriptionDate) return 0;
  
  try {
    const startDate = new Date(subscriptionDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + renewIntervalDays);
    
    const today = new Date();
    const timeDiff = endDate.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    
    return daysLeft;
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
};

interface Student {
  uid: string;
  name: string;
  email: string;
  profilePic: string;
  subscriptionDate: string;
  membershipType: string;
  renewIntervalDays?: number;
  lastActivity?: Date;
}

const MonitorStudents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [membershipFilter, setMembershipFilter] = useState<'active' | 'expired' | 'freetrial' | 'all'>('active');

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];

  // Protect the admin page - only accessible by admins
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!adminEmails.includes(user.email)) {
      navigate('/home', { replace: true });
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  // Fetch students data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const profiles = await listProfiles();
        // Exclude admins from list
        const { data: adminUsers } = await supabase.from('admin_users').select('user_id');
        const adminSet = new Set<string>((adminUsers || []).map((r: any) => r.user_id));
        if (adminSet.size === 0) {
          const fallbackAdmins = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'toparabg@gmail.com'];
          profiles.forEach(p => {
            if (fallbackAdmins.includes(p.email || '')) adminSet.add(p.id);
          });
        }
        const studentsData: Student[] = [];
        for (const p of profiles) {
          if (adminSet.has(p.id)) continue;
          const studentData: Student = {
            uid: p.id,
            name: p.name || 'Undefined User',
            email: p.email || '',
            profilePic: p.avatarUrl || '',
            subscriptionDate: p.subscriptionDate || '',
            membershipType: p.membershipType || 'TOP G',
            renewIntervalDays: p.renewIntervalDays || 30,
            lastActivity: undefined, // activity logs migration out of scope
          };
          studentsData.push(studentData);
        }

        // Sort by last activity (most recent first)
        studentsData.sort((a, b) => {
          if (!a.lastActivity && !b.lastActivity) return 0;
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        });

        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching students data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && adminEmails.includes(user.email)) {
      fetchStudents();
    }
  }, [user, toast]);

  // Filter students based on search term and membership status
  useEffect(() => {
    let filtered = students;

    // Filter by membership status
    if (membershipFilter === 'active') {
      filtered = filtered.filter(student => {
        const daysRemaining = calculateDaysRemaining(student.subscriptionDate, student.renewIntervalDays);
        return daysRemaining > 0;
      });
    } else if (membershipFilter === 'expired') {
      filtered = filtered.filter(student => {
        const daysRemaining = calculateDaysRemaining(student.subscriptionDate, student.renewIntervalDays);
        return daysRemaining <= 0 && student.membershipType !== 'Free Trial';
      });
    } else if (membershipFilter === 'freetrial') {
      filtered = filtered.filter(student => student.membershipType === 'Free Trial');
    }
    // 'all' shows all students, so no additional filtering needed

    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }, [searchTerm, students, membershipFilter]);

  // Format date for display
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Undefined';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      const englishMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const day = dateObj.getDate();
      const month = englishMonths[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch {
      return 'Undefined';
    }
  };

  // Get time ago string
  const getTimeAgo = (date: Date | undefined): string => {
    if (!date) return 'Never logged in';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date);
  };

  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-2xl font-bold text-gold">Loading student data...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link 
              to="/admin" 
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-gold" />
            <h1 className="text-3xl font-bold text-white">Monitor Students</h1>
          </div>
          <p className="text-white/60">View and monitor student activities and engagement history</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for a student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-10 py-3 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 focus:bg-white/15 transition-all"
            />
          </div>
        </div>

        {/* Membership Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gold" />
            <span className="text-white font-medium">Filter by membership:</span>
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
        </div>

        {/* Students Count */}
        <div className="mb-6">
          <p className="text-white/60">
            {membershipFilter === 'active' && 'Students with active memberships: '}
            {membershipFilter === 'expired' && 'Students with expired memberships: '}
            {membershipFilter === 'freetrial' && 'Free Trial students: '}
            {membershipFilter === 'all' && 'All students: '}
            <span className="text-gold font-bold"> {filteredStudents.length} </span>
            {(searchTerm || membershipFilter !== 'all') && (
              <span className="mr-2">
                (out of {students.length} students)
              </span>
            )}
          </p>
        </div>

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <GlassmorphicCard className="text-center py-12">
            <User className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {searchTerm ? 'No results' : 'No students'}
            </h3>
            <p className="text-white/60">
              {searchTerm ? 'Try searching with different words' : 'No students found in the system'}
            </p>
          </GlassmorphicCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <GlassmorphicCard key={student.uid} className="hover:border-gold/50 transition-all">
                <div className="p-6">
                  {/* Student Avatar and Info */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center">
                      {student.profilePic ? (
                        <img 
                          src={student.profilePic} 
                          alt={student.name}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                            if (sibling) sibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <User 
                        className={`w-6 h-6 text-white ${student.profilePic ? 'hidden' : 'block'}`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{student.name}</h3>
                        {student.membershipType === 'Free Trial' && (
                          <span className="bg-gradient-to-r from-gold to-yellow-600 text-black text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                            Free Trial
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm truncate">{student.email}</p>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gold" />
                      <span className="text-white/60">Subscribed:</span>
                      <span className="text-white">
                        {formatDate(student.subscriptionDate)}
                        {student.subscriptionDate && (
                          <>
                            <span className="text-white/40 mx-2">•</span>
                            {calculateDaysRemaining(student.subscriptionDate, student.renewIntervalDays) > 0 ? (
                               <span className="text-gold">
                                 {calculateDaysRemaining(student.subscriptionDate, student.renewIntervalDays)} days left
                               </span>
                             ) : (
                               <span className="text-red-400">Expired</span>
                             )}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-gold" />
                      <span className="text-white/60">Last Activity:</span>
                      <span className="text-white">{getTimeAgo(student.lastActivity)}</span>
                    </div>
                  </div>

                  {/* View Activity Button */}
                  <Link 
                    to={`/admin/monitor-students/${student.uid}`}
                    className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black font-bold py-2 px-4 rounded-lg hover:from-yellow-600 hover:to-gold transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Activity
                  </Link>
                </div>
              </GlassmorphicCard>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MonitorStudents;
