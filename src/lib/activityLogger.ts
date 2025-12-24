export interface ActivityLog {
  type: 'LOGIN' | 'LOGOUT' | 'PAGE_VISIT' | 'UPDATE_PROFILE' | 'ADD_COMMENT' | 'EDIT_COMMENT' | 'DELETE_COMMENT' | 'WATCH_LESSON' | 'COURSE_ACCESS' | 'MODULE_ACCESS' | 'SETTINGS_UPDATE' | 'SUBSCRIPTION_VIEW' | 'AFFILIATE_VIEW' | 'DAILY_MOTIVATION_VIEW' | 'HOME_VIEW' | 'COURSES_VIEW' | 'SETTINGS_VIEW' | 'SUPPORT_VIEW';
  timestamp: any; // serverTimestamp
  details?: {
    page?: string;
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
    courseName?: string;
    moduleName?: string;
    lessonName?: string;
    previousPage?: string;
    [key: string]: any;
  };
  userAgent: string;
  ip?: string;
  location?: string;
}

// Function to get user's IP address and location
export const getUserIPAndLocation = async (): Promise<{ ip: string; location: string }> => {
  try {
    // Try ipapi.co first as it provides both IP and location
    try {
      const response = await fetch('https://ipapi.co/json/', { 
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        const ip = data.ip;
        const city = data.city || '';
        const region = data.region || '';
        const country = data.country_name || '';
        
        let location = '';
        if (city && country) {
          location = region ? `${city}, ${region}, ${country}` : `${city}, ${country}`;
        } else if (country) {
          location = country;
        } else {
          location = 'Unknown';
        }
        
        if (ip && typeof ip === 'string') {
          return { ip, location };
        }
      }
    } catch (error) {
      console.warn('Failed to get IP and location from ipapi.co:', error);
    }

    // Fallback to IP-only services
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://api.ip.sb/jsonip'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, { 
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const ip = data.ip || data.query || data.IPv4;
          if (ip && typeof ip === 'string') {
            return { ip, location: 'Unknown' };
          }
        }
      } catch (error) {
        console.warn(`Failed to get IP from ${service}:`, error);
        continue;
      }
    }
    
    return { ip: 'Unknown', location: 'Unknown' };
  } catch (error) {
    console.warn('Failed to get user IP and location:', error);
    return { ip: 'Unknown', location: 'Unknown' };
  }
};

// Helper function to remove undefined values from an object
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return obj;
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        const cleanedValue = removeUndefinedValues(value);
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// Helper function to get readable activity description
export const getActivityDescription = (log: ActivityLog): string => {
  const { type, details } = log;
  
  switch (type) {
    case 'LOGIN':
      return 'Login';
    case 'LOGOUT':
      return 'Logout';
    case 'PAGE_VISIT':
      return `Page Visit: ${details?.page || 'Undefined'}`;
    case 'UPDATE_PROFILE':
      return 'Profile Update';
    case 'ADD_COMMENT':
      return 'Add Comment';
    case 'EDIT_COMMENT':
      return 'Edit Comment';
    case 'DELETE_COMMENT':
      return 'Delete Comment';
    case 'WATCH_LESSON':
      return `Watch Lesson: ${details?.lessonName || 'Undefined'}`;
    case 'COURSE_ACCESS':
      return `Course Access: ${details?.courseName || 'Undefined'}`;
    case 'MODULE_ACCESS':
      return `Module Access: ${details?.moduleName || 'Undefined'}`;
    case 'SETTINGS_UPDATE':
      return 'Settings Update';
    case 'SUBSCRIPTION_VIEW':
      return 'View Subscription Page';
    case 'AFFILIATE_VIEW':
      return 'View Affiliate Page';
    case 'DAILY_MOTIVATION_VIEW':
      return 'View Daily Motivation';
    case 'HOME_VIEW':
      return 'Home Page Visit';
    case 'COURSES_VIEW':
      return 'Courses Page Visit';
    case 'SETTINGS_VIEW':
      return 'Settings Page Visit';
    case 'SUPPORT_VIEW':
      return 'Support Page Visit';
    default:
      return `Activity: ${type}`;
  }
};

// Helper function to get activity icon (returns icon name for Lucide React)
export const getActivityIcon = (type: ActivityLog['type']): string => {
  switch (type) {
    case 'LOGIN':
      return 'LogIn';
    case 'LOGOUT':
      return 'LogOut';
    case 'PAGE_VISIT':
      return 'MousePointer';
    case 'UPDATE_PROFILE':
      return 'UserCog';
    case 'ADD_COMMENT':
      return 'MessageSquarePlus';
    case 'EDIT_COMMENT':
      return 'Edit3';
    case 'DELETE_COMMENT':
      return 'Trash2';
    case 'WATCH_LESSON':
      return 'Play';
    case 'COURSE_ACCESS':
      return 'BookOpen';
    case 'MODULE_ACCESS':
      return 'FolderOpen';
    case 'SETTINGS_UPDATE':
      return 'Settings';
    case 'SUBSCRIPTION_VIEW':
      return 'CreditCard';
    case 'AFFILIATE_VIEW':
      return 'Handshake';
    case 'DAILY_MOTIVATION_VIEW':
      return 'Zap';
    case 'HOME_VIEW':
      return 'Home';
    case 'COURSES_VIEW':
      return 'GraduationCap';
    case 'SETTINGS_VIEW':
      return 'Settings';
    case 'SUPPORT_VIEW':
      return 'Headphones';
    default:
      return 'FileText';
  }
};

// Helper function to get activity color
export const getActivityColor = (type: ActivityLog['type']): string => {
  switch (type) {
    case 'LOGIN':
      return 'text-green-400';
    case 'LOGOUT':
      return 'text-red-400';
    case 'PAGE_VISIT':
      return 'text-blue-400';
    case 'UPDATE_PROFILE':
      return 'text-yellow-400';
    case 'ADD_COMMENT':
      return 'text-gold';
    case 'EDIT_COMMENT':
      return 'text-orange-400';
    case 'DELETE_COMMENT':
      return 'text-red-400';
    case 'WATCH_LESSON':
      return 'text-gold';
    case 'COURSE_ACCESS':
      return 'text-gold';
    case 'MODULE_ACCESS':
      return 'text-orange-400';
    case 'SETTINGS_UPDATE':
      return 'text-gray-400';
    case 'SUBSCRIPTION_VIEW':
      return 'text-pink-400';
    case 'AFFILIATE_VIEW':
      return 'text-cyan-400';
    case 'DAILY_MOTIVATION_VIEW':
      return 'text-emerald-400';
    case 'HOME_VIEW':
      return 'text-blue-400';
    case 'COURSES_VIEW':
      return 'text-gold';
    case 'SETTINGS_VIEW':
      return 'text-gray-400';
    case 'SUPPORT_VIEW':
      return 'text-purple-400';
    default:
      return 'text-white';
  }
};
