import React, { useState } from 'react';
import { MessageCircle, Bug, Lightbulb, HelpCircle, FileText, X, Send, Paperclip } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supportService } from '@/services/supportService';
import { TicketType } from '@/types/support';
import { useLocation } from 'react-router-dom';

interface SupportReportButtonProps {
  className?: string;
}

const SupportReportButton: React.FC<SupportReportButtonProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<TicketType>('question');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  // Helper function to get readable page name from pathname
  const getPageName = (pathname: string): string => {
    const pathMap: { [key: string]: string } = {
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

    // Check for exact matches first
    if (pathMap[pathname]) {
      return pathMap[pathname];
    }

    // Handle dynamic routes
    if (pathname.startsWith('/course/')) {
      const parts = pathname.split('/');
      if (parts.length === 3) {
        return 'Course Modules';
      } else if (parts.length === 5 && parts[3] === 'module') {
        return 'Module Lessons';
      } else if (parts.length === 7 && parts[5] === 'lesson') {
        return 'Watch Lesson';
      }
    }

    if (pathname.startsWith('/admin/')) {
      return 'Admin Dashboard';
    }

    // Fallback to pathname if no match found
    return pathname;
  };

  const ticketTypes = [
    { value: 'bug' as TicketType, label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'suggestion' as TicketType, label: 'Suggestion', icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'question' as TicketType, label: 'Question', icon: HelpCircle, color: 'text-blue-500' },
    { value: 'other' as TicketType, label: 'Other', icon: FileText, color: 'text-gray-500' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'File too large',
          description: 'File size must be less than 5MB',
          variant: 'destructive'
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachments(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getPageContext = () => {
    return {
      pageUrl: window.location.href,
      pageTitle: document.title || 'Unknown Page',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString() as any
    };
  };

  const handleSubmit = async () => {
    if (!user || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const context = getPageContext();
      const arabicPageName = getPageName(location.pathname);
      const subject = `${ticketTypes.find(t => t.value === selectedType)?.label} - ${arabicPageName}`;
      
      const ticketId = await supportService.createTicket(
        user.uid,
        user.name,
        user.email,
        selectedType,
        subject,
        message.trim(),
        message.trim(),
        context
      );

      // If there are attachments, send them as a follow-up message
      if (attachments.length > 0) {
        await supportService.sendMessage(ticketId, `Additional Attachments: ${attachments.length} files attached.`);
        // Note: The current sendMessage implementation only supports string content. 
        // Attachments support needs to be added to the backend/service if required.
      }

      toast({
        title: 'Ticket Sent Successfully',
        description: (
          <div>
            <p>Support ticket has been created successfully</p>
          </div>
        )
      });

      // Reset form
      setMessage('');
      setAttachments([]);
      setSelectedType('question');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: 'Error Sending Ticket',
        description: 'An error occurred while sending the support ticket. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 ${className}`}
        title="Technical Support & Reporting"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white text-center flex-1">Technical Support & Reporting</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Ticket Type Selection */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Ticket Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ticketTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`p-4 rounded-xl border transition-all ${
                          selectedType === type.value
                            ? 'border-gold bg-gold/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-2 ${
                          selectedType === type.value ? 'text-gold' : type.color
                        }`} />
                        <span className="text-sm text-white">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full h-32 px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold focus:bg-black/40 resize-none transition-all backdrop-blur-sm"
                  maxLength={1000}
                />
                <div className="text-xs text-white/40 mt-1">
                  {message.length}/1000 characters
                </div>
              </div>

              {/* Context Info */}
              <div className="bg-black/20 border border-white/10 p-3 rounded-xl">
                <h4 className="text-sm font-medium text-white/80 mb-2">Context Info</h4>
                <div className="text-xs text-white/60 space-y-1">
                  <div>Page: {getPageName(location.pathname)}</div>
                  <div>URL: {location.pathname}</div>
                  <div>Browser: {navigator.userAgent.split(' ')[0]}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportReportButton;