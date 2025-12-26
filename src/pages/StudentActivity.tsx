import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/MainLayout';
import { useToast } from "@/components/ui/use-toast";
import GlassmorphicCard from '@/components/GlassmorphicCard';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Filter, 
  Download,
  Activity,
  Clock,
  Globe,
  MapPin,
  Smartphone,
  Trash2,
  LogIn,
  LogOut,
  MousePointer,
  UserCog,
  MessageSquarePlus,
  Edit3,
  Play,
  BookOpen,
  FolderOpen,
  Settings,
  CreditCard,
  Handshake,
  Zap,
  Home,
  GraduationCap,
  FileText,
  ExternalLink,
  Monitor,
  Headphones
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { listUserActivity } from '@/db/activity';
import { 
  ActivityLog, 
  getActivityDescription, 
  getActivityIcon, 
  getActivityColor 
} from '@/lib/activityLogger';

interface Student {
  uid: string;
  name: string;
  email: string;
  profilePic: string;
  subscriptionDate: string;
  membershipType: string;
  renewIntervalDays?: number;
}

interface ActivityLogWithId extends ActivityLog {
  id: string;
}

// Helper function to render activity icon
const renderActivityIcon = (iconName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    LogIn,
    LogOut,
    MousePointer,
    UserCog,
    MessageSquarePlus,
    Edit3,
    Trash2,
    Play,
    BookOpen,
    FolderOpen,
    Settings,
    CreditCard,
    Handshake,
    Zap,
    Home,
    GraduationCap,
    FileText,
    Headphones
  };

  const IconComponent = iconMap[iconName] || FileText;
  return <IconComponent className="w-5 h-5" />;
};

// Function to parse user agent and return readable device info
const parseUserAgent = (userAgent: string): string => {
  if (!userAgent) return 'Undefined';
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Microsoft Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  } else if (userAgent.includes('Samsung')) {
    browser = 'Samsung Internet';
  }
  
  // Detect operating system
  let os = 'Unknown OS';
  if (userAgent.includes('Windows NT 10.0')) {
    os = 'Windows 10/11';
  } else if (userAgent.includes('Windows NT 6.3')) {
    os = 'Windows 8.1';
  } else if (userAgent.includes('Windows NT 6.2')) {
    os = 'Windows 8';
  } else if (userAgent.includes('Windows NT 6.1')) {
    os = 'Windows 7';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    const macMatch = userAgent.match(/Mac OS X (\d+_\d+)/);
    if (macMatch) {
      const version = macMatch[1].replace('_', '.');
      os = `macOS ${version}`;
    } else {
      os = 'macOS';
    }
  } else if (userAgent.includes('iPhone')) {
    os = 'iOS (iPhone)';
  } else if (userAgent.includes('iPad')) {
    os = 'iOS (iPad)';
  } else if (userAgent.includes('Android')) {
    const androidMatch = userAgent.match(/Android (\d+\.?\d*)/);
    if (androidMatch) {
      os = `Android ${androidMatch[1]}`;
    } else {
      os = 'Android';
    }
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }
  
  // Detect device type
  let deviceType = '';
  if (userAgent.includes('Mobile') && !userAgent.includes('iPad')) {
    deviceType = ' (Mobile)';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceType = ' (Tablet)';
  }
  
  return `${browser} on ${os}${deviceType}`;
};

// Function to get appropriate device icon based on user agent
const getDeviceIcon = (userAgent: string) => {
  if (!userAgent) return Smartphone;
  
  // Check for mobile devices
  if (userAgent.includes('Mobile') && !userAgent.includes('iPad')) {
    return Smartphone;
  }
  
  // Check for tablets
  if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return Smartphone; // Using Smartphone icon for tablets as well
  }
  
  // Default to desktop/monitor for everything else
  return Monitor;
};

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

const StudentActivity = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [activities, setActivities] = useState<ActivityLogWithId[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLogWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // List of admin emails that can access this page
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com'];

  // Protect the admin page - only accessible by admins
  useEffect(() => {
    if (!user) {
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

  // Fetch student data and activities (skip admins)
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        if (!userId) return;
        // Exclude admins
        const { data: adminCheck } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
        if (adminCheck) {
          toast({
            title: "Not Allowed",
            description: "Admin users are excluded from activity view",
            variant: "destructive",
          });
          navigate('/admin/monitor-students');
          return;
        }
        const { data: studentData } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, subscription_date, membership_type, renew_interval_days')
          .eq('id', userId)
          .single();
        if (!studentData) {
          toast({
            title: "Error",
            description: "Student not found",
            variant: "destructive",
          });
          navigate('/admin/monitor-students');
          return;
        }
        setStudent({
          uid: userId,
          name: studentData.name || 'Undefined User',
          email: studentData.email || '',
          profilePic: studentData.avatar_url || '',
          subscriptionDate: studentData.subscription_date || '',
          membershipType: studentData.membership_type || 'TOP G',
          renewIntervalDays: studentData.renew_interval_days || 30
        });
        const logs = await listUserActivity(userId, 100);
        const mapped: ActivityLogWithId[] = logs.map((l: any) => ({
          ...l,
          id: l.id || `${l.type}-${l.timestamp?.toMillis?.() || Date.now()}`
        }));
        setActivities(mapped);
        setFilteredActivities(mapped);
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast({
          title: "Error",
          description: "An error occurred while fetching student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    if (user && adminEmails.includes(user.email) && userId) {
      fetchStudentData();
    }
  }, [user, userId, navigate, toast]);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];

    // Filter by activity type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(activity => {
        if (!activity.timestamp) return false;
        const activityDate = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
        return activityDate >= startDate;
      });
    }

    setFilteredActivities(filtered);
  }, [activities, filterType, dateFilter]);

  // Format timestamp
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Undefined';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      const englishMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const day = date.getDate();
      const month = englishMonths[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
    } catch {
      return 'Undefined';
    }
  };

  // Get unique activity types for filter
  const activityTypes = Array.from(new Set(activities.map(a => a.type)));

  const buildActivityPath = (activity: ActivityLogWithId): string | null => {
    const d: any = activity.details || {};
    switch (activity.type) {
      case 'WATCH_LESSON':
      case 'ADD_COMMENT':
      case 'EDIT_COMMENT':
      case 'DELETE_COMMENT':
        if (d.courseId && d.moduleId && d.lessonId) {
          return `/course/${d.courseId}/module/${d.moduleId}/lesson/${d.lessonId}`;
        }
        return null;
      case 'MODULE_ACCESS':
        if (d.courseId && d.moduleId) {
          return `/course/${d.courseId}/module/${d.moduleId}`;
        }
        return null;
      case 'COURSE_ACCESS':
        if (d.courseId) {
          return `/course/${d.courseId}`;
        }
        return null;
      case 'PAGE_VISIT':
        return typeof d.page === 'string' ? d.page : null;
      case 'SETTINGS_VIEW':
      case 'SETTINGS_UPDATE':
        return '/settings';
      case 'SUBSCRIPTION_VIEW':
        return '/subscription';
      case 'AFFILIATE_VIEW':
        return '/affiliate';
      case 'DAILY_MOTIVATION_VIEW':
        return '/daily-motivation';
      case 'HOME_VIEW':
        return '/home';
      case 'COURSES_VIEW':
        return '/courses';
      case 'SUPPORT_VIEW':
        return '/support';
      case 'LOGIN':
        return '/home';
      case 'LOGOUT':
        return '/login';
      default:
        return null;
    }
  };

  // Reset user activity function
  const handleResetActivity = async () => {
    if (!userId) return;
    setIsResetting(true);
    try {
      await supabase.from('activity_logs').delete().eq('user_id', userId);
      setActivities([]);
      setFilteredActivities([]);
      setShowResetConfirm(false);
      toast({
        title: "Success",
        description: `All activities for ${student?.name} have been deleted (${activities.length} activities)`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error resetting user activity:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting activities",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!user || !adminEmails.includes(user.email)) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-2xl font-bold text-gold">Loading activity data...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!student) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Student not found</h2>
            <Link 
              to="/admin/monitor-students"
              className="text-gold hover:text-yellow-400 transition-colors"
            >
              Back to Students List
            </Link>
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
          <div className="flex items-center gap-4 mb-4">
            <Link 
              to="/admin/monitor-students" 
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Students List
            </Link>
          </div>
          
          {/* Student Info Card */}
          <GlassmorphicCard className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center">
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
                    className={`w-8 h-8 text-white ${student.profilePic ? 'hidden' : 'block'}`} 
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-1">{student.name}</h1>
                  <p className="text-white/60 mb-2">{student.email}</p>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gold" />
                      <span className="text-white/60">Subscribed:</span>
                      <span className="text-white">
                        {student.subscriptionDate ? (() => {
                          try {
                            const date = new Date(student.subscriptionDate);
                            const englishMonths = [
                              'January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'
                            ];
                            const day = date.getDate();
                            const month = englishMonths[date.getMonth()];
                            const year = date.getFullYear();
                            return `${day} ${month} ${year}`;
                          } catch {
                            return student.subscriptionDate;
                          }
                        })() : 'Undefined'}
                      </span>
                      {student.subscriptionDate && (
                        <>
                          <span className="text-white/40">•</span>
                          {(() => {
                            const daysLeft = calculateDaysRemaining(student.subscriptionDate, student.renewIntervalDays);
                            return daysLeft > 0 ? (
                              <span className="text-gold font-medium">
                                {daysLeft} days left
                              </span>
                            ) : (
                              <span className="text-red-400 font-medium">
                                Expired
                              </span>
                            );
                          })()}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gold" />
                      <span className="text-white/60">Total Activities:</span>
                      <span className="text-gold font-bold">{activities.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassmorphicCard>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <GlassmorphicCard>
            <div className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gold" />
                  <span className="text-white font-medium">Filters:</span>
                </div>
                
                {/* Activity Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    width: '200px',
                  }}
                >
                  <option value="all" className="bg-gray-800 text-white">All Activities</option>
                  {activityTypes.map(type => (
                    <option key={type} value={type} className="bg-gray-800 text-white">
                      {getActivityDescription({ type, timestamp: null, userAgent: '', details: {} } as ActivityLog)}
                    </option>
                  ))}
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    width: '200px',
                  }}
                >
                  <option value="all" className="bg-gray-800 text-white">All Dates</option>
                  <option value="today" className="bg-gray-800 text-white">Today</option>
                  <option value="week" className="bg-gray-800 text-white">Last Week</option>
                  <option value="month" className="bg-gray-800 text-white">Last Month</option>
                </select>

                <div className="mr-auto flex items-center gap-4">
                  <span className="text-white/60 text-sm">
                    Showing {filteredActivities.length} of {activities.length} activities
                  </span>
                  
                  {/* Reset Activity Button */}
                  {activities.length > 0 && (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isResetting}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isResetting ? 'Deleting...' : 'Delete All Activities'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </GlassmorphicCard>
        </div>

        {/* Activities Timeline */}
        {filteredActivities.length === 0 ? (
          <GlassmorphicCard className="text-center py-12">
            <Activity className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No activities</h3>
            <p className="text-white/60">
              {filterType !== 'all' || dateFilter !== 'all' 
                ? 'Try changing filters to show more activities'
                : 'This student has no activities yet'
              }
            </p>
          </GlassmorphicCard>
        ) : (
          <div className="space-y-6">
            {filteredActivities.map((activity, index) => (
              <GlassmorphicCard key={activity.id} className="hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300 group">
                <div className="p-6">
                  <div className="flex items-start gap-5">
                    {/* Activity Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center ${getActivityColor(activity.type)} shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                        {renderActivityIcon(getActivityIcon(activity.type))}
                      </div>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className={`text-lg font-bold ${getActivityColor(activity.type)} group-hover:text-gold transition-colors duration-300`}>
                            {getActivityDescription(activity)}
                          </h3>
                          <div className="h-1 w-1 rounded-full bg-white/30"></div>
                          <div className="flex items-center gap-2 text-white/60 text-sm bg-white/5 px-3 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(activity.timestamp)}
                          </div>
                          {(() => {
                            const path = buildActivityPath(activity);
                            if (!path) return null;
                            return (
                              <Link
                                to={path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-white/80 text-sm bg-gold/20 hover:bg-gold/30 border border-gold/30 hover:border-gold/50 px-3 py-1 rounded-full transition-colors"
                                title="Open Page"
                              >
                                <ExternalLink className="w-3 h-3 text-gold" />
                                <span className="text-white">Open Page</span>
                              </Link>
                            );
                          })()}
                        </div>
                      </div>

                      {activity.type === 'WATCH_LESSON' && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {activity.details?.courseName && (
                            <div className="inline-flex items-center gap-2 bg-white/5 text-white/80 text-sm px-3 py-1 rounded-full border border-white/10">
                              <BookOpen className="w-4 h-4 text-gold" />
                              <span className="font-medium">Course:</span>
                              <span className="text-white">{activity.details.courseName}</span>
                            </div>
                          )}
                          {activity.details?.moduleName && (
                            <div className="inline-flex items-center gap-2 bg-white/5 text-white/80 text-sm px-3 py-1 rounded-full border border-white/10">
                              <FolderOpen className="w-4 h-4 text-orange-400" />
                              <span className="font-medium">Module:</span>
                              <span className="text-white">{activity.details.moduleName}</span>
                            </div>
                          )}
                          {activity.details?.lessonName && (
                            <div className="inline-flex items-center gap-2 bg-white/5 text-white/80 text-sm px-3 py-1 rounded-full border border-white/10">
                              <Play className="w-4 h-4 text-gold" />
                              <span className="font-medium">Lesson:</span>
                              <span className="text-white">{activity.details.lessonName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      

                       <div className="bg-gradient-to-r from-white/5 to-white/3 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                          <h4 className="text-white font-medium text-sm">Technical Info</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                            {(() => {
                              const DeviceIcon = getDeviceIcon(activity.userAgent);
                              return <DeviceIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />;
                            })()}
                            <div className="min-w-0">
                              <div className="text-white/60 text-xs">Device</div>
                              <div className="text-white text-sm font-medium truncate">
                                {parseUserAgent(activity.userAgent)}
                              </div>
                            </div>
                          </div>
                          {activity.ip && (
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-white/60 text-xs">IP Address</div>
                                <div className="text-white text-sm font-medium font-mono">{activity.ip}</div>
                                <a
                                  href={activity.details?.ipLookupUrl || `https://whatismyipaddress.com/ip/${activity.ip}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-xs mt-1 inline-flex items-center gap-1 transition-colors"
                                >
                                  Check Location
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                          {activity.location && activity.location && (
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                              <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-white/60 text-xs">Location</div>
                                <div className="text-white text-sm font-medium truncate">{activity.location}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassmorphicCard>
            ))}
          </div>
        )}

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <GlassmorphicCard className="max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Confirm Activity Deletion</h3>
                    <p className="text-white/60 text-sm">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-white/80 mb-2">
                    Are you sure you want to delete all activities for <span className="font-bold text-gold">{student?.name}</span>?
                  </p>
                  <p className="text-white/60 text-sm">
                    <span className="font-bold text-red-400">{activities.length}</span> activities will be permanently deleted from the database.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isResetting}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg text-white font-medium transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetActivity}
                    disabled={isResetting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-500 hover:border-red-600 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResetting ? 'Deleting...' : 'Delete Activities'}
                  </button>
                </div>
              </div>
            </GlassmorphicCard>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default StudentActivity;
