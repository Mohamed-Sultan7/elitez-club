import React from 'react';
import { X, ExternalLink, Monitor, Clock, Globe, Smartphone } from 'lucide-react';
import { SupportTicket } from '@/types/support';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ContextDetailsModalProps {
  ticket: SupportTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

const ContextDetailsModal: React.FC<ContextDetailsModalProps> = ({ ticket, isOpen, onClose }) => {
  if (!isOpen || !ticket || !ticket.context) return null;

  const { context } = ticket;

  const getSafePathname = (url: string): string => {
    if (!url) return '/';
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname || '/';
    } catch {
      return url.startsWith('/') ? url : '/';
    }
  };

  const toDateSafe = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const getPageName = (pathname: string): string => {
    // Handle dynamic routes
    if (pathname.startsWith('/course/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length === 2) return 'Course Modules';
      if (parts.length === 4) return 'Module Lessons';
      if (parts.length === 6) return 'Watch Lesson';
    }
    
    // Handle static routes
    const routeMap: { [key: string]: string } = {
      '/': 'Home',
      '/home': 'Home',
      '/dashboard': 'Dashboard',
      '/courses': 'Courses',
      '/profile': 'Profile',
      '/settings': 'Settings',
      '/support': 'Technical Support',
      '/customer-support': 'Customer Support',
      '/subscription': 'Subscription',
      '/about': 'About Us',
      '/contact': 'Contact Us',
      '/privacy': 'Privacy Policy',
      '/terms': 'Terms of Use',
      '/admin': 'Admin Dashboard',
      '/add-course': 'Add Course',
      '/add-lesson': 'Add Lesson',
      '/add-module': 'Add Module',
      '/add-user': 'Add User',
      '/edit-course': 'Edit Course',
      '/edit-lesson': 'Edit Lesson',
      '/edit-module': 'Edit Module',
      '/edit-user': 'Edit User',
      '/manage-users': 'Manage Users',
      '/managing-content': 'Manage Content',
      '/monitor-students': 'Monitor Students',
      '/student-activity': 'Student Activity',
      '/profit-dashboard': 'Profit Dashboard',
      '/add-profit': 'Add Profit',
      '/edit-profit': 'Edit Profit',
      '/daily-motivation': 'Daily Motivation',
      '/add-daily-motivation': 'Add Daily Motivation',
      '/all-comments': 'All Comments',
      '/affiliate': 'Affiliate',
      '/launcher': 'Launcher',
      '/login': 'Login',
      '/jail': 'Jail',
      '/index': 'Index'
    };
    
    return routeMap[pathname] || pathname;
  };

  const formatUserAgent = (userAgent: string): { browser: string; os: string; device: string } => {
    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';

    // OS detection
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios')) os = 'iOS';

    // Device detection
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android')) device = 'Mobile';
    else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';

    return { browser, os, device };
  };

  const userAgentInfo = context.userAgent ? formatUserAgent(context.userAgent) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Monitor className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ticket Details</h2>
              <p className="text-white/60 text-sm">Context & Environment Info</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Page Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Page Information
            </h3>
            
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Page Name:</span>
                <span className="text-white font-medium">
                  {getPageName(getSafePathname(context.pageUrl))}
                </span>
              </div>
              
              <div className="space-y-2">
                <span className="text-white/60 block">Page URL:</span>
                <a
                  href={context.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group"
                >
                  <span className="break-all text-sm leading-relaxed flex-1 min-w-0">
                    {context.pageUrl}
                  </span>
                  <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          {/* Technical Information */}
          {userAgentInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-green-400" />
                Technical Information
              </h3>
              
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Browser:</span>
                  <span className="text-white font-medium">{userAgentInfo.browser}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/60">OS:</span>
                  <span className="text-white font-medium">{userAgentInfo.os}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Device Type:</span>
                  <span className="text-white font-medium">{userAgentInfo.device}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Timing Information
            </h3>
            
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Ticket Created At:</span>
                  <span className="text-white font-medium">
                  {toDateSafe(ticket.createdAt) ? formatDistanceToNow(toDateSafe(ticket.createdAt) as Date, { addSuffix: true }) : 'Unknown'}
                  </span>
                </div>
                
              {toDateSafe(context.timestamp) && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Context Time:</span>
                  <span className="text-white font-medium">
                    {formatDistanceToNow(toDateSafe(context.timestamp) as Date, { addSuffix: true })}
                  </span>
                </div>
              )}
              
              {context.appVersion && (
                <div className="flex items-center justify-between">
                  <span className="text-white/60">App Version:</span>
                  <span className="text-white font-medium">{context.appVersion}</span>
                </div>
              )}
            </div>
          </div>

          {/* Raw User Agent (for debugging) */}
          {context.userAgent && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">User Agent (For Developers)</h3>
              <div className="bg-white/5 rounded-xl p-4">
                <code className="text-xs text-white/80 break-all font-mono">
                  {context.userAgent}
                </code>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ContextDetailsModal;
