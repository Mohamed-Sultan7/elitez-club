import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supportService } from '@/services/supportService';
import { SupportTicket, SupportMessage, TicketStatus } from '@/types/support';
import MainLayout from '@/components/MainLayout';
import ContextDetailsModal from '@/components/ContextDetailsModal';
import ImageUpload from '@/components/ImageUpload';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import MessageContent from '@/components/MessageContent';
import { 
  Search, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  User,
  Calendar,
  Tag,
  Settings,
  FileText,
  ExternalLink,
  Bug,
  Lightbulb,
  HelpCircle,
  X,
  Edit3,
  Trash2,
  Check,
  X as XIcon,
  Save,
  Sparkles,
  Info,
  Monitor,
  MessageSquare
} from 'lucide-react';
import GoldButton from '@/components/GoldButton';
import { formatDistanceToNow } from 'date-fns';
 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserInfo {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  openTicketsCount: number;
  ticketCount: number;
  unreadCount: number;
}

const CustomerSupport: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, { profilePic?: string; name?: string }>>({});
  const [showChatView, setShowChatView] = useState(false); // New state for controlling view
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTicketConfirmId, setDeleteTicketConfirmId] = useState<string | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextModalTicket, setContextModalTicket] = useState<SupportTicket | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // List of admin emails that can access admin features
  const adminEmails = ['ichrakchraibi5@gmail.com', 'mohamed.sultan.7744@gmail.com', 'elitez.club7@gmail.com
'];
  
  // Check if current user is an admin
  const isAdmin = user && adminEmails.includes(user.email || '');

  const ticketTypes = [
    { value: 'bug' as const, label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'suggestion' as const, label: 'Suggestion', icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'question' as const, label: 'Question', icon: HelpCircle, color: 'text-blue-500' },
    { value: 'other' as const, label: 'Other', icon: FileText, color: 'text-gray-500' }
  ];

  const getTypeIcon = (type: string) => {
    const typeConfig = ticketTypes.find(t => t.value === type);
    if (!typeConfig) return <FileText className="w-4 h-4 text-gray-500" />;
    const Icon = typeConfig.icon;
    return <Icon className={`w-4 h-4 ${typeConfig.color}`} />;
  };

  // Load all users with their ticket counts
  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    
    // Subscribe to real-time user ticket counts
    const unsubscribe = supportService.subscribeToUserTicketCounts((usersWithCounts) => {
      // Convert to UserInfo format
      const userInfos: UserInfo[] = usersWithCounts.map(user => ({
        id: user.userId,
        email: user.userEmail,
        displayName: user.userName,
        name: user.userName,
        openTicketsCount: user.openTickets,
        ticketCount: user.totalTickets,
        unreadCount: user.unreadCount
      }));
      
      setUsers(userInfos);
      
      // Update selectedUser if it exists to keep ticketCount in sync
      if (selectedUser) {
        const updatedSelectedUser = userInfos.find(user => user.id === selectedUser.id);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
        }
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [toast, isAdmin, selectedUser?.id]);

  // Load tickets for selected user with real-time updates
  useEffect(() => {
    if (!selectedUser) {
      setTickets([]);
      setSelectedTicket(null);
      return;
    }

    // Subscribe to real-time ticket updates for the selected user
    const unsubscribe = supportService.subscribeToUserTickets(selectedUser.id, (userTickets) => {
      setTickets(userTickets.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()));
    });

    // Cleanup subscription when user changes or component unmounts
    return () => {
      unsubscribe();
    };
  }, [selectedUser]);

  // Load messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        unsubscribe = await supportService.subscribeToMessages(selectedTicket.id, async (newMessages) => {
          setMessages(newMessages);
          
          // Fetch user profiles for non-admin messages
          const userIds = [...new Set(newMessages.filter(msg => !msg.isAdmin).map(msg => msg.senderId))];
          const profiles: Record<string, { profilePic?: string; name?: string }> = {};
          
          for (const userId of userIds) {
            if (!userProfiles[userId]) {
              const profile = await supportService.getUserProfile(userId);
              if (profile) {
                profiles[userId] = profile;
              }
            }
          }
          
          if (Object.keys(profiles).length > 0) {
            setUserProfiles(prev => ({ ...prev, ...profiles }));
          }
          
          // Mark messages as read by admin
          if (user?.uid) {
            supportService.markMessagesAsRead(selectedTicket.id, user.uid, true);
          }

          // Optimistically clear unread count for this ticket and user aggregate
          const cleared = selectedTicket.adminUnreadCount || 0;
          if (cleared > 0) {
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, adminUnreadCount: 0 } : t));
            setSelectedTicket(prev => prev ? { ...prev, adminUnreadCount: 0 } : null);
            setSelectedUser(prev => prev ? { ...prev, unreadCount: Math.max(0, (prev.unreadCount || 0) - cleared) } : null);
          }

          // Fetch read status for messages (Seen by student)
          try {
            const readMap = await supportService.getStudentReadMap(selectedTicket.id);
            setReadMessageIds(readMap);
          } catch (error) {
            console.error('Error fetching read receipts:', error);
          }
        });
      } catch (error) {
        console.error('Error setting up message subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedTicket, user, userProfiles]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && !selectedImage) || !user) return;

    try {
      setSendingMessage(true);
      await supportService.sendMessage(
        selectedTicket.id, 
        newMessage.trim() || (selectedImage ? '[Image Attachment - Not Supported]' : ''),
        true
      );
      if (newMessage.trim()) {
        const optimisticMessage: SupportMessage = {
          id: `temp-${Date.now()}`,
          ticketId: selectedTicket.id,
          senderId: user.uid,
          content: newMessage.trim(),
          senderName: 'You',
          senderEmail: user.email || '',
          isAdmin: true,
          createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
        } as any;
        setMessages(prev => [...prev, optimisticMessage]);
      }
      setNewMessage('');
      setSelectedImage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await supportService.updateTicketStatus(ticketId, newStatus);
      
      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      toast({
        title: 'Ticket status updated successfully'
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error updating ticket status',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getStatusText = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'Open';
      case 'pending': return 'Pending';
      case 'closed': return 'Closed';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'bug': return 'Bug';
      case 'suggestion': return 'Suggestion';
      case 'question': return 'Question';
      case 'other': return 'Other';
      default: return type;
    }
  };

  // Helper function to convert pathname to readable Arabic page name
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
      '/': 'Home Page',
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
      '/admin': 'Admin Panel',
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
      '/jail': 'Restricted',
      '/index': 'Index'
    };
    
    return routeMap[pathname] || pathname;
  };

  // Determine if ticket is a report (has context) or support ticket (no context)
  const isTicketReport = (ticket: SupportTicket): boolean => {
    return ticket.context !== undefined && ticket.context !== null;
  };

  // Get ticket classification display info
  const getTicketClassification = (ticket: SupportTicket) => {
    if (isTicketReport(ticket)) {
      return {
        type: 'report',
        label: 'Site Report',
        icon: Monitor,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/20'
      };
    } else {
      return {
        type: 'support',
        label: 'Support Ticket',
        icon: MessageSquare,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/20'
      };
    }
  };

  // Handle opening context modal
  const handleOpenContextModal = (ticket: SupportTicket) => {
    setContextModalTicket(ticket);
    setShowContextModal(true);
  };

  // Handle closing context modal
  const handleCloseContextModal = () => {
    setShowContextModal(false);
    setContextModalTicket(null);
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle ticket selection and show chat view
  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowChatView(true);
  };

  // Handle editing a message
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  // Handle saving edited message
  const handleSaveEdit = async (messageId: string) => {
    if (!selectedTicket || !editingContent.trim()) return;

    try {
      await supportService.editMessage(selectedTicket.id, messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent('');
      toast({
        title: 'Message updated',
        description: 'Message updated successfully',
      });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  // Handle deleting a message
  const handleDeleteMessage = async () => {
    if (!selectedTicket || !deleteConfirmId) return;

    try {
      await supportService.deleteMessage(selectedTicket.id, deleteConfirmId);
      toast({
        title: 'Message deleted',
        description: 'Message deleted successfully',
      });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    }
  };

  // Handle deleting a ticket
  const handleDeleteTicket = async () => {
    if (!deleteTicketConfirmId) return;

    try {
      await supportService.deleteTicket(deleteTicketConfirmId);
      
      // Update local state
      setTickets(prev => prev.filter(t => t.id !== deleteTicketConfirmId));
      if (selectedTicket?.id === deleteTicketConfirmId) {
        setSelectedTicket(null);
        setShowChatView(false);
      }
      
      toast({
        title: 'Ticket deleted',
        description: 'Ticket and all messages deleted successfully',
      });
      setDeleteTicketConfirmId(null);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ticket',
        variant: 'destructive',
      });
      setDeleteTicketConfirmId(null);
    }
  };

  // Handle closing chat view
  const handleCloseChatView = () => {
    setSelectedTicket(null);
    setShowChatView(false);
  };

  // Handle user selection - return to ticket list if same user clicked
  const handleUserSelect = (userInfo: UserInfo) => {
    if (selectedUser?.id === userInfo.id && showChatView) {
      // Same user clicked while in chat view - return to ticket list
      setShowChatView(false);
      setSelectedTicket(null);
    } else {
      // Different user or not in chat view - select user normally
      setSelectedUser(userInfo);
      setShowChatView(false);
      setSelectedTicket(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-10rem)] sm:h-[calc(100vh-10rem)]">
        <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
            {/* Sidebar - User List */}
            <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col max-h-[40vh] lg:max-h-none">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-white/10 bg-white/5">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Customer Support</h1>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-gold transition-all text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-gold/30 hover:scrollbar-thumb-gold/50">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <User className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mx-auto mb-3 sm:mb-4" />
                      <p className="text-white/60 text-base sm:text-lg">No users found</p>
                      <p className="text-white/40 text-xs sm:text-sm mt-2">No users match your search</p>
                    </div>
                  ) : (
                    <div className="p-2 sm:p-4">
                      {filteredUsers.map((userInfo) => (
                         <div
                           key={userInfo.id}
                           onClick={() => handleUserSelect(userInfo)}
                           className={`p-3 sm:p-4 border-b border-white/5 cursor-pointer transition-all duration-200 ${
                             selectedUser?.id === userInfo.id
                               ? 'bg-gold/10 border-r-4 border-r-gold'
                               : 'hover:bg-white/5'
                           }`}
                         >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white text-sm sm:text-base truncate">
                                {userInfo.displayName || userInfo.name || 'User'}
                              </h3>
                              <p className="text-white/60 text-xs sm:text-sm truncate">{userInfo.email}</p>
                              <div className="flex items-center gap-2 sm:gap-4 mt-1">
                                <span className="text-xs text-white/40">
                                  {userInfo.ticketCount} tickets
                                </span>
                                {userInfo.unreadCount > 0 && (
                                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    {userInfo.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content - Conditional rendering based on showChatView */}
              {showChatView && selectedTicket ? (
                /* Chat Interface - Full Width */
                <div className="flex-1 flex flex-col bg-white/3 min-h-0">
                  {/* Chat Header */}
                  <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          {getTypeIcon(selectedTicket.type)}
                          <h3 className="text-lg font-semibold text-white">{selectedTicket.subject}</h3>
                          {/* Detail Button for Context */}
                          {selectedTicket.context && (selectedTicket.context.pageUrl || selectedTicket.context.pageTitle) && (
                            <button
                              onClick={() => handleOpenContextModal(selectedTicket)}
                              className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              title="View context details"
                            >
                              <Info className="w-4 h-4 text-white/70" />
                            </button>
                          )}
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed">{selectedTicket.description}</p>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="relative">
                          <select
                            value={selectedTicket.status}
                            onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                            className="appearance-none pr-10 p-4 py-2 bg-black/30 border border-gold/30 rounded-xl text-white text-sm focus:outline-none focus:border-gold focus:bg-black/40 transition-all cursor-pointer hover:bg-black/40 text-left"
                          >
                            <option value="open" className="bg-gray-800 text-white">Open</option>
                            <option value="in_progress" className="bg-gray-800 text-white">In Progress</option>
                            <option value="resolved" className="bg-gray-800 text-white">Resolved</option>
                            <option value="closed" className="bg-gray-800 text-white">Closed</option>
                          </select>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                          <button
                            onClick={() => setDeleteTicketConfirmId(selectedTicket.id)}
                            className="text-red-400/60 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleCloseChatView}
                          className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 custom-scrollbar"
                    ref={messagesEndRef}
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#D4AF37 transparent'
                    }}
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-3 max-w-[70%] ${
                          message.isAdmin 
                            ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                            message.isAdmin 
                              ? 'bg-black-500' 
                              : 'bg-gold'
                          }`}>
                            {message.isAdmin ? (
                              <img 
                                src="/favicon.png" 
                                alt="Elitez Club" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              userProfiles[message.senderId]?.profilePic ? (
                                <img 
                                  src={userProfiles[message.senderId].profilePic} 
                                  alt={message.senderName} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-black" />
                              )
                            )}
                          </div>
                          
                          {/* Message Bubble */}
                          <div className={`relative group ${
                            message.isAdmin 
                              ? 'bg-white/10 text-white' 
                              : 'bg-gold/90 text-black'
                          } rounded-2xl px-4 py-3 shadow-lg`}>
                            {/* Message tail */}
                            <div className={`absolute top-4 w-0 h-0 ${
                              message.isAdmin 
                                ? 'right-[-8px] border-l-0 border-l-[8px] border-r-white/10 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                                : 'left-[-8px] border-r-0 border-r-[8px] border-r-gold/90 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                                
                            }`}></div>
                            
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium text-xs ${
                                message.isAdmin ? 'text-blue-300' : 'text-black/70'
                              }`}>
                                {message.isAdmin ? 'You' : (message.senderName || 'User')}
                              </span>
                              <span className={`text-xs ${
                                message.isAdmin ? 'text-white/60' : 'text-black/50'
                              }`}>
                                {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : 'Unknown'}
                              </span>
                            </div>
                            
                            {editingMessageId === message.id ? (
                              <div className="space-y-3 mt-2">
                                <div className="relative">
                                  <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full p-3 text-sm bg-white/95 text-gray-800 rounded-lg border-2 border-white/20 focus:border-blue-400 focus:outline-none resize-none shadow-inner transition-all duration-200"
                                    rows={3}
                                    placeholder="Type your message here..."
                                  />
                                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                                    {editingContent.length}/500
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-gray-300 transition-all duration-200 text-xs border border-gray-400/30 hover:border-gray-400/50 shadow-sm hover:shadow-md transform hover:scale-105"
                                    title="Cancel Edit"
                                  >
                                    <XIcon size={12} />
                                    <span>Cancel</span>
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(message.id)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold hover:text-gold/90 transition-all duration-200 text-xs border border-gold/30 hover:border-gold/50 shadow-sm hover:shadow-md transform hover:scale-105"
                                    title="Save Changes"
                                  >
                                    <Save size={12} />
                                    <span>Save</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {/* Message Content */}
                                {message.content && (
                                  <MessageContent 
                                    content={message.content}
                                    className="text-sm leading-relaxed mb-2"
                                  />
                                )}
                                
                                {/* Image Display */}
                                {message.image && (
                                  <div className="mt-2">
                                    <img 
                                      src={message.image} 
                                      alt="Uploaded image" 
                                      className="max-w-full max-h-64 rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => {
                                        setPreviewImageUrl(message.image);
                                        setShowImagePreview(true);
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {message.editedAt && (
                                  <div className={`flex items-center gap-1 text-xs mt-2 italic ${
                                    message.isAdmin ? 'text-white/50' : 'text-black/50'
                                  }`}>
                                    <Edit3 size={10} />
                                    <span>Edited</span>
                                  </div>
                                )}
                                {isAdmin && message.isAdmin && (
                                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <button
                                      onClick={() => handleEditMessage(message.id, message.content)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold hover:text-gold/90 transition-all duration-200 text-xs border border-gold/30 hover:border-gold/50 shadow-sm hover:shadow-md transform hover:scale-105"
                                      title="Edit Message"
                                    >
                                      <Edit3 size={12} />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(message.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 text-xs border border-red-400/30 hover:border-red-400/50 shadow-sm hover:shadow-md transform hover:scale-105"
                                      title="Delete Message"
                                    >
                                      <Trash2 size={12} />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="flex-shrink-0 p-6 border-t border-white/10 bg-white/5">
                    {/* Image Upload Area */}
                    {selectedImage && (
                      <div className="mb-4">
                        <ImageUpload
                          selectedImage={selectedImage}
                          onImageSelect={() => {}}
                          onRemove={() => setSelectedImage('')}
                          className="mb-2"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-4">
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type your response here..."
                          className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold focus:bg-white/15 transition-all"
                        />
                        {!selectedImage && (
                          <ImageUpload
                            onImageSelect={(base64) => setSelectedImage(base64)}
                            className="flex-shrink-0"
                            mode="modal"
                          />
                        )}
                      </div>
                      <GoldButton
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !selectedImage) || sendingMessage}
                        className="px-5 py-3 rounded-xl"
                      >
                        {sendingMessage ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </GoldButton>
                    </div>
                  </div>
                </div>
              ) : (
                /* Ticket List View */
                <div className="flex-1 flex flex-col min-h-0">
                  {selectedUser ? (
                    <>
                      {/* User Header */}
                      <div className="p-4 sm:p-6 border-b border-white/10 bg-white/5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="hidden lg:flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
                              <User className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-lg sm:text-xl font-semibold text-white truncate">{selectedUser.name}</h2>
                              <p className="text-white/60 text-sm mt-1 truncate">{selectedUser.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-center sm:text-left flex gap-4 items-center">
                              <span className="text-xs sm:text-sm text-white/60 block">Total Tickets</span>
                              <span className="text-base sm:text-lg font-semibold text-white">{selectedUser.ticketCount}</span>
                            </div>
                            {selectedUser.unreadCount > 0 && (
                              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl whitespace-nowrap">
                                {selectedUser.unreadCount} Unread
                              </div>
                            )}
                            <button
                              onClick={() => setSelectedUser(null)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 text-white/60 hover:text-white"
                              title="Close Ticket List"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tickets List */}
                      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-gold/30 hover:scrollbar-thumb-gold/50">
                        {tickets.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center p-6 sm:p-8">
                              <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 text-white/30 mx-auto mb-4 sm:mb-6" />
                              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">No tickets</h3>
                              <p className="text-white/60 text-sm sm:text-base">This user has not created any support tickets</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                            {tickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                onClick={() => handleTicketSelect(ticket)}
                                className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all duration-200 ${
                                  selectedTicket?.id === ticket.id
                                    ? 'border-gold bg-gold/10 shadow-lg'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3 gap-3">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {getTypeIcon(ticket.type)}
                                    <h3 className="font-medium text-white text-sm sm:text-base truncate">{ticket.subject}</h3>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {ticket.adminUnreadCount > 0 && (
                                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                        {ticket.adminUnreadCount}
                                      </span>
                                    )}
                                    {getStatusIcon(ticket.status)}
                                  </div>
                                </div>

                                {/* Ticket Classification */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const classification = getTicketClassification(ticket);
                                      const IconComponent = classification.icon;
                                      return (
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${classification.bgColor} ${classification.color}`}>
                                          <IconComponent className="w-3 h-3" />
                                          <span>{classification.label}</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  {isTicketReport(ticket) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenContextModal(ticket);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs"
                                    >
                                      <Info className="w-3 h-3" />
                                      <span>Details</span>
                                    </button>
                                  )}
                                </div>
                                
                                <p className="text-white/60 text-xs sm:text-sm mb-3 line-clamp-2">{ticket.description}</p>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-white/40">
                                  <span className="truncate">{ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : 'Unknown'}</span>
                                  <span className={`px-2 py-1 rounded-full whitespace-nowrap ${
                                    ticket.status === 'open' ? 'bg-green-500/20 text-green-400' :
                                    ticket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                    ticket.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {ticket.status === 'open' ? 'Open' :
                                     ticket.status === 'in_progress' ? 'In Progress' :
                                     ticket.status === 'resolved' ? 'Resolved' : 'Closed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-white/2">
                      <div className="text-center p-8 sm:p-12">
                        <User className="w-16 h-16 sm:w-20 sm:h-20 text-white/30 mx-auto mb-4 sm:mb-6" />
                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">Select a user to start</h3>
                        <p className="text-white/60 text-sm sm:text-lg">Select a user from the sidebar to view their support tickets</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-black/90 backdrop-blur-sm border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => setDeleteConfirmId(null)}
              className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMessage}
              className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ticket Delete Confirmation Modal */}
      <AlertDialog open={!!deleteTicketConfirmId} onOpenChange={() => setDeleteTicketConfirmId(null)}>
        <AlertDialogContent className="bg-black/90 backdrop-blur-sm border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete this ticket? This will permanently delete the ticket and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => setDeleteTicketConfirmId(null)}
              className="bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTicket}
              className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white"
            >
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Context Details Modal */}
      <ContextDetailsModal
        ticket={contextModalTicket}
        isOpen={showContextModal}
        onClose={handleCloseContextModal}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={previewImageUrl}
        imageName="chat-image"
      />
    </MainLayout>
  );
};

export default CustomerSupport;
