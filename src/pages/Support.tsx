import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supportService } from '@/services/supportService';
import { SupportTicket, SupportMessage, TicketStatus } from '@/types/support';
import MainLayout from '@/components/MainLayout';
import ContextDetailsModal from '@/components/ContextDetailsModal';
import ImageUpload from '@/components/ImageUpload';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import GoldButton from '@/components/GoldButton';
import MessageContent from '@/components/MessageContent';
import { 
  MessageCircle, 
  Plus, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  ArrowLeft,
  Bug,
  Lightbulb,
  HelpCircle,
  FileText,
  Paperclip,
  RotateCcw,
  User,
  ExternalLink,
  Info,
  Monitor,
  MessageSquare,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Support: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const hasLoggedActivity = useRef(false);
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextModalTicket, setContextModalTicket] = useState<SupportTicket | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, { profilePic?: string; name?: string }>>({});
  const [showMobileChatView, setShowMobileChatView] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New ticket form state
  const [newTicketType, setNewTicketType] = useState<'question' | 'bug' | 'suggestion' | 'other'>('question');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');

  const ticketTypes = [
    { value: 'bug' as const, label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'suggestion' as const, label: 'Suggestion', icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'question' as const, label: 'Question', icon: HelpCircle, color: 'text-blue-500' },
    { value: 'other' as const, label: 'Other', icon: FileText, color: 'text-gray-500' }
  ];

  const statusOptions = [
    { value: 'all' as const, label: 'All Tickets', icon: MessageCircle, color: 'text-gray-500' },
    { value: 'open' as const, label: 'Open', icon: Clock, color: 'text-blue-500' },
    { value: 'pending' as const, label: 'Pending', icon: Clock, color: 'text-yellow-500' },
    { value: 'closed' as const, label: 'Closed', icon: CheckCircle, color: 'text-green-500' }
  ];

  // Load tickets
  useEffect(() => {
    if (!user) return;

    // Log support page view only once
    if (!hasLoggedActivity.current) {
      logActivity('SUPPORT_VIEW');
      hasLoggedActivity.current = true;
    }

    const unsubscribe = supportService.subscribeToTickets(user.uid, (updatedTickets) => {
      setTickets(updatedTickets);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Load messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    // Mark as read immediately when opening
    if (selectedTicket.unreadCount > 0) {
      supportService.markTicketReadByStudent(selectedTicket.id).catch(console.error);
      // Optimistically update local state to remove badge
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? { ...t, unreadCount: 0 } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, unreadCount: 0 } : null);
    }

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        unsubscribe = await supportService.subscribeToMessages(
          selectedTicket.id,
          async (updatedMessages) => {
            setMessages(updatedMessages);
            
            // Fetch user profiles for admin messages (since this is user view)
            const adminIds = [...new Set(updatedMessages.filter(msg => msg.isAdmin).map(msg => msg.senderId))];
            const profiles: Record<string, { profilePic?: string; name?: string }> = {};
            
            for (const adminId of adminIds) {
              if (!userProfiles[adminId]) {
                const profile = await supportService.getUserProfile(adminId);
                if (profile) {
                  profiles[adminId] = profile;
                }
              }
            }
            
            if (Object.keys(profiles).length > 0) {
              setUserProfiles(prev => ({ ...prev, ...profiles }));
            }

            // Fetch read receipts (Admin reads)
            try {
              const readMap = await supportService.getAdminReadMap(selectedTicket.id);
              setReadMessageIds(readMap);
            } catch (error) {
              console.error('Error fetching read receipts:', error);
            }
            
            // Mark messages as read
            if (user) {
              supportService.markMessagesAsRead(selectedTicket.id, user.uid, false);
            }
          },
          user?.uid // Pass the current user's ID to avoid collection group queries
        );
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
  }, [selectedTicket, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredTickets = tickets.filter(ticket => 
    statusFilter === 'all' || ticket.status === statusFilter
  );

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || (!newMessage.trim() && !selectedImage)) return;

    setSendingMessage(true);
    try {
      await supportService.sendMessage(
        selectedTicket.id, 
        newMessage.trim() || (selectedImage ? '[Image Attachment - Not Supported]' : ''),
        false
      );
      if (newMessage.trim()) {
        const optimisticMessage: SupportMessage = {
          id: `temp-${Date.now()}`,
          ticketId: selectedTicket.id,
          senderId: user.uid,
          content: newMessage.trim(),
          senderName: user.name || 'You',
          senderEmail: user.email || '',
          isAdmin: false,
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
        description: 'An error occurred while sending the message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateNewTicket = async () => {
    if (!user || !newTicketSubject.trim() || !newTicketMessage.trim()) return;

    try {
      const ticketId = await supportService.createTicket(
        user.uid,
        user.name,
        user.email,
        newTicketType,
        newTicketSubject.trim(),
        newTicketMessage.trim(),
        newTicketMessage.trim(),
        null // Explicitly pass null for context when creating from support page
      );

      toast({
        title: 'Ticket created successfully',
        description: 'A new support ticket has been created'
      });

      // Reset form
      setNewTicketSubject('');
      setNewTicketMessage('');
      setNewTicketType('question');
      setShowNewTicketModal(false);

      const created = await supportService.getTicket(ticketId);
      if (created) {
        setTickets(prev => [created, ...prev]);
        setSelectedTicket(created);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error creating ticket',
        description: 'An error occurred while creating the ticket. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    try {
      await supportService.updateTicketStatus(ticketId, 'open');
      toast({
        title: 'Ticket reopened',
        description: 'Ticket reopened successfully'
      });
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast({
        title: 'Error reopening ticket',
        description: 'An error occurred while reopening the ticket.',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = ticketTypes.find(t => t.value === type);
    if (!typeConfig) return <FileText className="w-4 h-4 text-gray-500" />;
    const Icon = typeConfig.icon;
    return <Icon className={`w-4 h-4 ${typeConfig.color}`} />;
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

  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Please Login</h2>
            <p className="text-gray-400">You must be logged in to access technical support</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-10rem)] sm:h-[calc(100vh-10rem)]">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Sidebar - Ticket List */}
            <div className={`w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/20 ${
              showMobileChatView ? 'hidden lg:flex lg:max-h-none' : 'flex h-full lg:max-h-none'
            }`}>
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-white/10 bg-black/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Technical Support</h1>
                    <GoldButton
                      onClick={() => setShowNewTicketModal(true)}
                      size="sm"
                      className="px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Ticket
                    </GoldButton>
                  </div>
                </div>

                {/* Tickets List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gold/30 hover:scrollbar-thumb-gold/50 scrollbar-track-rounded-full scrollbar-thumb-rounded-full">
                  {filteredTickets.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mx-auto mb-4 sm:mb-6" />
                      <p className="text-white/60 text-base sm:text-lg mb-2">No tickets</p>
                      <p className="text-white/40 text-xs sm:text-sm">Start by creating a new ticket</p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowMobileChatView(true);
                        }}
                        className={`p-3 sm:p-5 border-b border-white/5 cursor-pointer transition-all duration-200 ${
                          selectedTicket?.id === ticket.id 
                            ? 'bg-gold/10 border-r-4 border-r-gold' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            {getTypeIcon(ticket.type)}
                            <span className="font-medium text-white text-xs sm:text-sm truncate">{ticket.subject}</span>
                            {ticket.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                {ticket.unreadCount}
                              </span>
                            )}
                          </div>
                          {getStatusIcon(ticket.status)}
                        </div>

                        {/* Ticket Classification */}
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
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

                        <p className="text-white/60 text-xs mb-2 sm:mb-3 line-clamp-2 leading-relaxed">{ticket.description}</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-white/40">
                          <span className="truncate">{ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : 'Unknown'}</span>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
                    ))
                  )}
                </div>
              </div>

              {/* Main Content - Chat */}
              <div className={`flex-1 flex flex-col lg:rounded-r-xl ${
                showMobileChatView 
                  ? 'fixed inset-0 z-50 bg-gray-900 lg:relative lg:inset-auto lg:z-auto lg:bg-black/10' 
                  : 'bg-black/10 hidden lg:flex'
              }`}>
                {selectedTicket ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 sm:p-6 border-b border-white/10 bg-black/20">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Mobile Close Button */}
                        {showMobileChatView && (
                          <button
                            onClick={() => setShowMobileChatView(false)}
                            className="lg:hidden absolute top-4 left-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
                            title="Close Chat"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            {getTypeIcon(selectedTicket.type)}
                            <h2 className="text-lg sm:text-xl font-semibold text-white truncate">{selectedTicket.subject}</h2>
                            {/* Detail Button for Context */}
                            {selectedTicket.context && (
                              <button
                                onClick={() => handleOpenContextModal(selectedTicket)}
                                className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                title="View context details"
                              >
                                <Info className="w-4 h-4 text-white/70" />
                              </button>
                            )}
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed line-clamp-2">{selectedTicket.description}</p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto lg:ml-4">
                          {selectedTicket.status === 'resolved' && (
                            <GoldButton
                              onClick={() => handleReopenTicket(selectedTicket.id)}
                              variant="outline"
                              size="sm"
                              className="flex-1 lg:flex-none"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reopen
                            </GoldButton>
                          )}
                          {selectedTicket.status === 'closed' && (
                            <GoldButton
                              onClick={() => setShowNewTicketModal(true)}
                              variant="outline"
                              size="sm"
                              className="flex-1 lg:flex-none"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              New Ticket
                            </GoldButton>
                          )}
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                            selectedTicket.status === 'open' ? 'bg-green-500/20 text-green-400' :
                            selectedTicket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            selectedTicket.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {selectedTicket.status === 'open' ? 'Open' :
                             selectedTicket.status === 'in_progress' ? 'In Progress' :
                             selectedTicket.status === 'resolved' ? 'Resolved' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div 
                      className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[calc(100vh-20rem)] custom-scrollbar" 
                      ref={messagesEndRef}
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#D4AF37 transparent'
                      }}
                    >
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'} mb-4 group`}
                        >
                          <div className={`flex items-end gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${
                            message.senderId === user.uid ? 'flex-row-reverse' : 'flex-row'
                          }`}>
                            {/* Avatar */}
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
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
                                user?.profilePic ? (
                                  <img 
                                    src={user.profilePic} 
                                    alt={user.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
                                )
                              )}
                            </div>
                            
                            {/* Message Bubble */}
                            <div className={`relative ${
                              message.isAdmin 
                                ? 'bg-white/10 text-white' 
                                : 'bg-gold/90 text-black'
                            } rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-lg`}>
                              {/* Message tail */}
                              <div className={`absolute top-3 sm:top-4 w-0 h-0 ${
                                message.isAdmin 
                                  ? 'left-[-6px] sm:left-[-8px] border-l-0 border-r-[6px] sm:border-r-[8px] border-r-white/10 border-t-[6px] sm:border-t-[8px] border-t-transparent border-b-[6px] sm:border-b-[8px] border-b-transparent'
                                  : 'right-[-6px] sm:right-[-8px] border-r-0 border-l-[6px] sm:border-l-[8px] border-l-gold/90 border-t-[6px] sm:border-t-[8px] border-t-transparent border-b-[6px] sm:border-b-[8px] border-b-transparent'
                              }`}></div>
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 mb-1">
                                <span className={`font-medium text-xs ${
                                  message.isAdmin ? 'text-blue-300' : 'text-black/70'
                                }`}>
                                  {message.isAdmin ? 'Support Team' : 'You'}
                                </span>
                                <span className={`text-xs ${
                                  message.isAdmin ? 'text-white/60' : 'text-black/50'
                                }`}>
                                  {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : 'Unknown'}
                                </span>
                                {!message.isAdmin && (
                                  <span className="ml-1" title={readMessageIds.has(message.id) ? "Seen" : "Sent"}>
                                    {readMessageIds.has(message.id) ? (
                                      <div className="flex">
                                        <CheckCircle className="w-3 h-3 text-blue-500" />
                                      </div>
                                    ) : (
                                      <CheckCircle className="w-3 h-3 text-black/30" />
                                    )}
                                  </span>
                                )}
                              </div>
                              
                              {/* Message Content */}
                              {message.content && (
                                <MessageContent 
                                  content={message.content}
                                  className="text-xs sm:text-sm leading-relaxed break-words mb-2"
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' ? (
                      <div className="p-3 sm:p-6 border-t border-white/10 bg-black/20">
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
                        
                        <div className="flex gap-2 sm:gap-4">
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                              placeholder="Type your message here..."
                              className="flex-1 px-3 sm:px-5 py-2 sm:py-3 bg-black/30 border border-white/20 rounded-lg sm:rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold focus:bg-black/40 transition-all text-sm sm:text-base backdrop-blur-sm"
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
                            className="px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl flex-shrink-0"
                          >
                            {sendingMessage ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </GoldButton>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 sm:p-6 border-t border-white/10 bg-black/20">
                        <div className="flex items-center justify-center py-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              {selectedTicket.status === 'resolved' ? (
                                <CheckCircle className="w-5 h-5 text-blue-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-400" />
                              )}
                              <span className="text-white/60 text-sm">
                                {selectedTicket.status === 'resolved' 
                                  ? 'This ticket is resolved' 
                                  : 'This ticket is closed'
                                }
                              </span>
                            </div>
                            <p className="text-white/40 text-xs">
                               {selectedTicket.status === 'resolved' 
                                 ? 'Cannot send new messages. You can reopen the ticket to continue.' 
                                 : 'Cannot send new messages. You can create a new ticket if you need help.'
                               }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-black/5 hidden lg:flex">
                    <div className="text-center p-6 sm:p-12">
                      <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 text-white/30 mx-auto mb-4 sm:mb-6" />
                      <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-4">Select a ticket to start</h3>
                      <p className="text-white/60 text-base sm:text-lg">Select a ticket from the sidebar to view the conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          
        </div>

        {/* New Ticket Modal */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-center text-white">Create New Ticket</h3>
                
                <div className="space-y-6">
                  {/* Type Selection */}
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
                            onClick={() => setNewTicketType(type.value)}
                            className={`p-4 rounded-xl border transition-all ${
                              newTicketType === type.value
                                ? 'border-gold bg-gold/10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mx-auto mb-2 ${type.color}`} />
                            <span className="text-sm text-white">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={newTicketSubject}
                      onChange={(e) => setNewTicketSubject(e.target.value)}
                      placeholder="Ticket subject..."
                      className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold focus:bg-black/40 transition-all backdrop-blur-sm"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Message
                    </label>
                    <textarea
                      value={newTicketMessage}
                      onChange={(e) => setNewTicketMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="w-full h-32 px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold focus:bg-black/40 resize-none transition-all backdrop-blur-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 mt-8">
                  <button
                    onClick={() => setShowNewTicketModal(false)}
                    className="px-6 py-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <GoldButton
                    onClick={handleCreateNewTicket}
                    disabled={!newTicketSubject.trim() || !newTicketMessage.trim()}
                    className="px-6 py-2 rounded-xl"
                  >
                    Create Ticket
                  </GoldButton>
                </div>
              </div>
            </div>
        )}

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
    </MainLayout>);
};

export default Support;
