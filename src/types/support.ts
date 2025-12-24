export type TicketType = 'bug' | 'suggestion' | 'question' | 'other';
export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

// Interface to mimic Firebase Timestamp for easier migration
export interface DBTimestamp {
  toDate: () => Date;
  toMillis: () => number;
}

export interface TicketContext {
  pageUrl: string;
  pageTitle: string;
  userAgent: string;
  timestamp: DBTimestamp;
  appVersion?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  createdAt: DBTimestamp;
  editedAt?: DBTimestamp; // timestamp when message was last edited
  isAdmin: boolean; // true for admin messages
  isInternal?: boolean; // true for internal admin notes
  attachments?: string[]; // base64 encoded files
  image?: string; // base64 encoded image
  readBy: string[]; // array of user IDs who have read this message
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: TicketType;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string; // admin user ID
  assignedToName?: string;
  context?: TicketContext;
  createdAt: DBTimestamp;
  updatedAt: DBTimestamp;
  lastMessageAt: DBTimestamp;
  messageCount: number;
  unreadCount: number; // unread messages for the user
  adminUnreadCount: number; // unread messages for admins
}

export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  closedTickets: number;
  avgResponseTime: number; // in hours
  ticketsCreatedToday: number;
  messagesExchangedToday: number;
}
