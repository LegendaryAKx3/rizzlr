import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Message {
  id?: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id?: string;
  user_id?: string;
  profile_id: number;
  profile_name: string;
  profile_age?: number;
  profile_gender?: string;
  is_active?: boolean;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  score?: number;
  grade?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  grade_feedback?: string;
  grade_breakdown?: {
    engagement: number;
    flow: number;
    chemistry: number;
    timing: number;
  };
  graded_at?: string;
}

/**
 * Get or create a conversation between user and AI profile
 * Now returns the active conversation or creates a new one
 */
export async function getOrCreateConversation(
  userId: string,
  profileId: number,
  profileName: string,
  profileAge?: number,
  profileGender?: string
): Promise<{ data: Conversation | null; error: any }> {
  // First, try to get existing ACTIVE conversation
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // If no existing active conversation, create one
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      profile_id: profileId,
      profile_name: profileName,
      profile_age: profileAge,
      profile_gender: profileGender,
      is_active: true,
      is_archived: false,
    })
    .select()
    .single();

  return { data: newConversation, error: createError };
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, any>
): Promise<{ data: Message | null; error: any }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || {},
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Save multiple messages in batch (e.g., user message + AI response)
 */
export async function saveMessages(
  conversationId: string,
  messages: Omit<Message, 'id' | 'conversation_id' | 'created_at'>[]
): Promise<{ data: Message[] | null; error: any }> {
  const messagesToInsert = messages.map((msg) => ({
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
    metadata: msg.metadata || {},
  }));

  const { data, error } = await supabase
    .from('messages')
    .insert(messagesToInsert)
    .select();

  return { data, error };
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<{ data: Message[] | null; error: any }> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string
): Promise<{ data: Conversation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });

  return { data, error };
}

/**
 * Get active conversations for a user
 */
export async function getActiveConversations(
  userId: string
): Promise<{ data: Conversation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false });

  return { data, error };
}

/**
 * Mark a conversation as inactive/archived
 */
export async function archiveConversation(
  conversationId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('conversations')
    .update({ is_active: false })
    .eq('id', conversationId);

  return { error };
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ error: any }> {
  // Messages will be cascade deleted automatically
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  return { error };
}

/**
 * Get the most recent message in a conversation
 */
export async function getLatestMessage(
  conversationId: string
): Promise<{ data: Message | null; error: any }> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return { data, error };
}

/**
 * Get message count for a conversation
 */
export async function getMessageCount(
  conversationId: string
): Promise<{ count: number; error: any }> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  return { count: count || 0, error };
}

/**
 * Archive current conversation and allow starting a new one
 * Moves current conversation to history with its grade
 */
export async function archiveAndResetConversation(
  conversationId: string,
  score?: number,
  grade?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F',
  feedback?: string,
  breakdown?: { engagement: number; flow: number; chemistry: number; timing: number }
): Promise<{ error: any }> {
  const updateData: any = {
    is_active: false,
    is_archived: true,
  };

  if (score !== undefined) {
    updateData.score = score;
  }
  if (grade) {
    updateData.grade = grade;
  }
  if (feedback) {
    updateData.grade_feedback = feedback;
  }
  if (breakdown) {
    updateData.grade_breakdown = breakdown;
  }
  if (score !== undefined || grade) {
    updateData.graded_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversationId);

  return { error };
}

/**
 * Get conversation history for a user with a specific profile
 * Returns archived conversations with their scores
 */
export async function getConversationHistory(
  userId: string,
  profileId: number
): Promise<{ data: Conversation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .eq('is_archived', true)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Get all archived conversations with message counts
 */
export async function getArchivedConversationsWithCounts(
  userId: string,
  profileId: number
): Promise<{ data: Array<Conversation & { message_count: number }> | null; error: any }> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages:messages(count)
    `)
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .eq('is_archived', true)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return { data: null, error };
  }

  // Transform the data to include message_count
  const transformed = data.map((conv: any) => ({
    ...conv,
    message_count: conv.messages?.[0]?.count || 0,
    messages: undefined, // Remove the nested messages object
  }));

  return { data: transformed, error: null };
}
