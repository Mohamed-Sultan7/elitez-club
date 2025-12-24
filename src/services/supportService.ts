import { supabase } from '@/lib/supabaseClient';
import { SupportTicket, SupportMessage, TicketStatus } from '@/types/support';
import * as db from '@/db/support';

export class SupportService {
  
  // Create a new support ticket
  async createTicket(
    userId: string,
    userName: string,
    userEmail: string,
    type: string,
    subject: string,
    description: string,
    initialMessage: string,
    context?: any,
    priority: string = 'medium'
  ): Promise<string> {
    return db.createTicket(
      userId, 
      userName, 
      userEmail, 
      type, 
      subject, 
      description, 
      initialMessage, 
      context
    );
  }

  // Send a message to a ticket
  async sendMessage(
    ticketId: string,
    body: string,
    isAdmin: boolean = false
  ): Promise<void> {
    return db.sendMessage(ticketId, body, isAdmin);
  }

  // Get user profile data
  async getUserProfile(userId: string): Promise<{ profilePic?: string; name?: string } | null> {
    return db.getUserProfile(userId);
  }

  // Get a single ticket by id
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    return db.getTicket(ticketId);
  }

  // Mark messages as read
  async markMessagesAsRead(ticketId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    return db.markAsRead(ticketId, userId, isAdmin);
  }

  // Update ticket status
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    return db.updateTicketStatus(ticketId, status);
  }

  // Edit a message
  async editMessage(ticketId: string, messageId: string, newContent: string): Promise<void> {
    return db.editMessage(ticketId, messageId, newContent);
  }

  // Delete a message
  async deleteMessage(ticketId: string, messageId: string): Promise<void> {
    return db.deleteMessage(ticketId, messageId);
  }

  // Delete a ticket and its messages
  async deleteTicket(ticketId: string): Promise<void> {
    return db.deleteTicket(ticketId);
  }

  // Mark ticket as read by student
  async markTicketReadByStudent(ticketId: string): Promise<void> {
    return db.markTicketReadByStudent(ticketId);
  }

  // Mark ticket as read by admin
  async markTicketReadByAdmin(ticketId: string): Promise<void> {
    return db.markTicketReadByAdmin(ticketId);
  }

  // Get map of messages read by student
  async getStudentReadMap(ticketId: string): Promise<Set<string>> {
    return db.getStudentReadMap(ticketId);
  }

  // Get map of messages read by admin
  async getAdminReadMap(ticketId: string): Promise<Set<string>> {
    return db.getAdminReadMap(ticketId);
  }

  // Subscribe to global unread count
  subscribeToGlobalUnread(userId: string, isAdmin: boolean, callback: (count: number) => void): () => void {
    const fetchCount = async () => {
      try {
        const count = isAdmin ? await db.getAdminUnreadTotal() : await db.getStudentUnreadTotal();
        callback(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchCount();

    // Polling every 7 seconds
    const intervalId = setInterval(fetchCount, 7000);

    return () => {
      clearInterval(intervalId);
    };
  }

  // Subscribe to real-time updates for a user's tickets (or all for admin)
  subscribeToTickets(userId: string | null, callback: (tickets: SupportTicket[]) => void): () => void {
    const fetchTickets = async () => {
      try {
        const tickets = userId ? await db.listUserTickets(userId) : await db.listAllTickets();
        callback(tickets);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      }
    };

    // Initial fetch
    fetchTickets();

    // Subscribe to changes
    const channel = supabase
      .channel('public:support_tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          ...(userId ? { filter: `user_id=eq.${userId}` } : {})
        },
        (payload) => {
          console.log('Realtime ticket event:', payload);
          fetchTickets();
        }
      )
      .subscribe((status) => {
        console.log('Ticket subscription status:', status);
      });

    // Fallback polling every 5s
    const intervalId = setInterval(fetchTickets, 5000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to messages for a ticket
  async subscribeToMessages(
    ticketId: string, 
    callback: (messages: SupportMessage[]) => void, 
    userId?: string
  ): Promise<() => void> {
    const fetchMessages = async () => {
      try {
        const messages = await db.listMessages(ticketId);
        callback(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    // Initial fetch
    fetchMessages();

    // Subscribe to changes
    const channel = supabase
      .channel(`public:support_messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload: any) => {
          console.log('Realtime message event:', payload);
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log(`Message subscription status for ${ticketId}:`, status);
      });

    // Fallback polling every 3s
    const intervalId = setInterval(fetchMessages, 3000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to user ticket counts (Admin Dashboard)
  subscribeToUserTicketCounts(callback: (users: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    openTickets: number;
    totalTickets: number;
    unreadCount: number;
  }>) => void): () => void {
    
    const fetchAndAggregate = async () => {
      try {
        const tickets = await db.listAllTickets();
        
        const userTicketCounts: Record<string, {
          userId: string;
          userName: string;
          userEmail: string;
          openTickets: number;
          totalTickets: number;
          unreadCount: number;
        }> = {};

        tickets.forEach(ticket => {
          if (!userTicketCounts[ticket.userId]) {
            userTicketCounts[ticket.userId] = {
              userId: ticket.userId,
              userName: ticket.userName,
              userEmail: ticket.userEmail,
              openTickets: 0,
              totalTickets: 0,
              unreadCount: 0
            };
          }
          
          userTicketCounts[ticket.userId].totalTickets++;
          if (ticket.status === 'open' || ticket.status === 'in_progress') {
            userTicketCounts[ticket.userId].openTickets++;
          }
          userTicketCounts[ticket.userId].unreadCount += (ticket.adminUnreadCount || 0);
        });

        const sortedUsers = Object.values(userTicketCounts).sort((a, b) => {
          // Sort by unread count first, then open tickets
          if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
          return b.openTickets - a.openTickets;
        });
        callback(sortedUsers);
      } catch (error) {
        console.error('Error fetching ticket counts:', error);
      }
    };

    // Initial fetch
    fetchAndAggregate();

    // Subscribe to changes on support_tickets
    const channel = supabase
      .channel('public:support_tickets_counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('Realtime ticket counts event:', payload);
          fetchAndAggregate();
        }
      )
      .subscribe();

    // Fallback polling every 10s
    const intervalId = setInterval(fetchAndAggregate, 10000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to tickets for a specific user (Admin view of user)
  subscribeToUserTickets(userId: string, callback: (tickets: SupportTicket[]) => void): () => void {
    const fetchTickets = async () => {
      try {
        const tickets = await db.listUserTickets(userId);
        callback(tickets);
      } catch (error) {
        console.error('Error fetching user tickets:', error);
      }
    };

    fetchTickets();

    const channel = supabase
      .channel(`public:support_tickets:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Realtime user tickets event:', payload);
          fetchTickets();
        }
      )
      .subscribe();

    // Fallback polling every 5s
    const intervalId = setInterval(fetchTickets, 5000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }
}

export const supportService = new SupportService();
