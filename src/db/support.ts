import { supabase } from '@/lib/supabaseClient';
import { SupportTicket, SupportMessage, TicketStatus, DBTimestamp } from '@/types/support';

// Helper to mimic Firebase Timestamp
const toDBTimestamp = (dateStr: string | null): DBTimestamp => {
  const date = dateStr ? new Date(dateStr) : new Date();
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
};

// Mapper for Ticket
const toTicket = (row: any): SupportTicket => ({
  id: row.id,
  userId: row.user_id,
  subject: row.subject,
  status: row.status as TicketStatus,
  type: row.type,
  description: row.description,
  priority: row.priority,
  userName: row.user_name,
  userEmail: row.user_email,
  context: row.context,
  lastMessageAt: toDBTimestamp(row.last_message_at),
  createdAt: toDBTimestamp(row.created_at),
  updatedAt: toDBTimestamp(row.updated_at),
  messageCount: row.message_count,
  unreadCount: row.unread_count,
  adminUnreadCount: row.admin_unread_count,
  assignedTo: row.assigned_to,
  assignedToName: row.assigned_to_name,
});

// Mapper for Message
const toMessage = (row: any): SupportMessage => ({
  id: row.id,
  ticketId: row.ticket_id,
  senderId: row.sender_id,
  content: row.body, // Mapping body -> content to match UI type
  senderName: row.sender_name,
  senderEmail: row.sender_email,
  isAdmin: row.is_admin,
  createdAt: toDBTimestamp(row.created_at),
  editedAt: row.edited_at ? toDBTimestamp(row.edited_at) : undefined,
  image: row.image,
  readBy: row.read_by || [],
});

export async function listMyTickets(): Promise<SupportTicket[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toTicket);
}

export async function listAllTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toTicket);
}

export async function listUserTickets(userId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toTicket);
}

export async function createTicket(
  userId: string,
  userName: string,
  userEmail: string,
  type: string,
  subject: string,
  description: string,
  initialMessage: string,
  context: any
): Promise<string> {
  // 1. Create Ticket
  const ticketPayload = {
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    type,
    subject,
    description,
    priority: 'medium',
    context: context || {},
    status: 'open',
    last_message_at: new Date().toISOString(),
    message_count: 1,
    unread_count: 0,
    admin_unread_count: 1,
  };

  const { data: ticketData, error: ticketError } = await supabase
    .from('support_tickets')
    .insert([ticketPayload])
    .select()
    .single();

  if (ticketError) throw new Error(ticketError.message);

  // 2. Create Initial Message
  const messagePayload = {
    ticket_id: ticketData.id,
    sender_id: userId,
    sender_name: userName,
    sender_email: userEmail,
    body: initialMessage,
    is_admin: false
    // read_by: [userId] // Removed as column doesn't exist
  };

  const { error: msgError } = await supabase
    .from('support_messages')
    .insert([messagePayload]);

  if (msgError) {
    console.error('Error creating initial message:', msgError);
    // Continue anyway as ticket is created
  }

  return ticketData.id;
}

export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (error) throw new Error(error.message);
  return data ? toTicket(data) : null;
}

export async function listMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(toMessage);
}

export async function sendMessage(
  ticketId: string, 
  body: string,
  isAdmin: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch profile for sender details
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const senderName = isAdmin ? 'Support Team' : (profile?.name || user.user_metadata?.name || 'User');
  const senderEmail = user.email || '';

  // 1. Insert message
  const { error: msgError } = await supabase
    .from('support_messages')
    .insert([{
      ticket_id: ticketId,
      sender_id: user.id,
      body: body,
      sender_name: senderName,
      sender_email: senderEmail,
      is_admin: isAdmin
    }]);

  if (msgError) throw new Error(msgError.message);

  // 2. Update ticket stats
  // We need to fetch current counts to increment them safely
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('message_count, unread_count, admin_unread_count')
    .eq('id', ticketId)
    .single();
    
  if (ticketError) throw new Error(ticketError.message);

  const updates: any = {
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: (ticket.message_count || 0) + 1
  };

  if (isAdmin) {
    updates.unread_count = (ticket.unread_count || 0) + 1;
  } else {
    updates.admin_unread_count = (ticket.admin_unread_count || 0) + 1;
  }

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);

  if (updateError) throw new Error(updateError.message);
}

export async function markAsRead(ticketId: string, userId: string, isAdmin: boolean): Promise<void> {
  const updates: any = {};
  
  if (isAdmin) {
    updates.admin_unread_count = 0;
  } else {
    updates.unread_count = 0;
  }

  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);

  if (error) throw new Error(error.message);
  
  // Mark messages as read in support_message_reads
  // If isAdmin (Admin reading), we read Student messages (is_admin = false)
  // If !isAdmin (Student reading), we read Admin messages (is_admin = true)
  const targetIsAdmin = !isAdmin;
  
  const { data: messages } = await supabase
    .from('support_messages')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('is_admin', targetIsAdmin);
    
  if (messages && messages.length > 0) {
    const readsToInsert = messages.map(msg => ({
      message_id: msg.id,
      ticket_id: ticketId,
      user_id: userId,
      read_at: new Date().toISOString()
    }));
    
    await supabase
      .from('support_message_reads')
      .upsert(readsToInsert, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
  }
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) throw new Error(error.message);
}

export async function editMessage(ticketId: string, messageId: string, newContent: string): Promise<void> {
  const { error } = await supabase
    .from('support_messages')
    .update({ body: newContent, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('ticket_id', ticketId); // Safety check

  if (error) throw new Error(error.message);
}

export async function deleteMessage(ticketId: string, messageId: string): Promise<void> {
  const { error } = await supabase
    .from('support_messages')
    .delete()
    .eq('id', messageId)
    .eq('ticket_id', ticketId);

  if (error) throw new Error(error.message);
  
  // Decrement message count
   const { data: ticket } = await supabase
    .from('support_tickets')
    .select('message_count')
    .eq('id', ticketId)
    .single();
    
  if (ticket) {
     await supabase
      .from('support_tickets')
      .update({ message_count: Math.max(0, (ticket.message_count || 1) - 1) })
      .eq('id', ticketId);
  }
}

export async function deleteTicket(ticketId: string): Promise<void> {
  // 1. Delete all messages for this ticket
  const { error: msgError } = await supabase
    .from('support_messages')
    .delete()
    .eq('ticket_id', ticketId);

  if (msgError) throw new Error(msgError.message);

  // 2. Delete the ticket itself
  const { error: ticketError } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', ticketId);

  if (ticketError) throw new Error(ticketError.message);
}

export async function markTicketReadByStudent(ticketId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Get all admin messages for this ticket that are not yet read by this user
  // Since we can't easily do a NOT EXISTS in one query with the JS client without a stored proc or raw SQL,
  // we'll fetch admin messages and check locally or use ignoreDuplicates if supported on insert.
  // Actually, inserting into support_message_reads with conflict ignore is best.
  
  const { data: adminMessages } = await supabase
    .from('support_messages')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('is_admin', true);

  if (adminMessages && adminMessages.length > 0) {
    const readsToInsert = adminMessages.map(msg => ({
      message_id: msg.id,
      ticket_id: ticketId,
      user_id: user.id,
      read_at: new Date().toISOString()
    }));

    // Perform upsert/insert with ignore on conflict
    const { error: readError } = await supabase
      .from('support_message_reads')
      .upsert(readsToInsert, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
      
    if (readError) console.error('Error marking messages read:', readError);
  }

  // 2. Reset ticket unread count
  const { error } = await supabase
    .from('support_tickets')
    .update({ unread_count: 0 })
    .eq('id', ticketId);

  if (error) throw new Error(error.message);
}

export async function markTicketReadByAdmin(ticketId: string): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ admin_unread_count: 0 })
    .eq('id', ticketId);

  if (error) throw new Error(error.message);
}

export async function getStudentReadMap(ticketId: string): Promise<Set<string>> {
  // Fetch message_ids that have been read by the ticket owner (student)
  // First get ticket owner
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('user_id')
    .eq('id', ticketId)
    .single();
    
  if (!ticket) return new Set();

  const { data: reads } = await supabase
    .from('support_message_reads')
    .select('message_id')
    .eq('ticket_id', ticketId)
    .eq('user_id', ticket.user_id);

  const readSet = new Set<string>();
  if (reads) {
    reads.forEach((r: any) => readSet.add(r.message_id));
  }
  return readSet;
}

export async function getAdminReadMap(ticketId: string): Promise<Set<string>> {
  // Fetch message_ids that have been read by any admin (where user_id is NOT the ticket owner)
  // OR we can just check if there is ANY read record by an admin?
  // Since we don't have an easy "is_admin" flag on the reads table, we can assume:
  // - If the user_id in support_message_reads is NOT the ticket owner, it's an admin.
  // - OR better, we can check if the message itself is NOT an admin message (is_admin=false) 
  //   and has a read record. Wait, if I am a student, I want to know if MY message (is_admin=false) was read.
  //   If my message (is_admin=false) has a record in support_message_reads, it must be read by an admin 
  //   (since students don't need to "read" their own messages).
  
  const { data: reads } = await supabase
    .from('support_message_reads')
    .select('message_id, support_messages!inner(is_admin)')
    .eq('ticket_id', ticketId)
    .eq('support_messages.is_admin', false); // Only care about student messages being read

  const readSet = new Set<string>();
  if (reads) {
    reads.forEach((r: any) => readSet.add(r.message_id));
  }
  return readSet;
}

export async function getStudentUnreadTotal(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('support_tickets')
    .select('unread_count')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching student unread total:', error);
    return 0;
  }

  return (data || []).reduce((sum, t) => sum + (t.unread_count || 0), 0);
}

export async function getAdminUnreadTotal(): Promise<number> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('admin_unread_count');

  if (error) {
    console.error('Error fetching admin unread total:', error);
    return 0;
  }

  return (data || []).reduce((sum, t) => sum + (t.admin_unread_count || 0), 0);
}

export async function getUserProfile(userId: string): Promise<{ profilePic?: string; name?: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, avatar_url') // Assuming avatar_url is the column name in Supabase profiles
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    name: data.name,
    profilePic: data.avatar_url
  };
}
