import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserProfile {
  id?: string;
  preferred_gender?: 'male' | 'female' | 'both';
  display_name?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Match {
  id?: string;
  user_id?: string;
  profile_id: number;
  profile_name: string;
  profile_age?: number;
  profile_gender?: string;
  profile_bio?: string;
  profile_image?: string;
  profile_interests?: string[];
  is_active?: boolean;
  matched_at?: string;
  last_message_at?: string; // For sorting by conversation activity
  last_message?: string; // Preview of last message
}

/**
 * Get or create user profile
 */
export async function getOrCreateUserProfile(
  userId: string
): Promise<{ data: UserProfile | null; error: any }> {
  // Try to get existing profile
  const { data: existing, error: fetchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create new profile with default preferences
  const { data: newProfile, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      preferred_gender: 'both',
    })
    .select()
    .single();

  return { data: newProfile, error: createError };
}

/**
 * Update user profile preferences
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: any }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}

/**
 * Update user's preferred gender
 */
export async function updatePreferredGender(
  userId: string,
  preferredGender: 'male' | 'female' | 'both'
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ preferred_gender: preferredGender })
    .eq('id', userId);

  return { error };
}

/**
 * Get user's preferred gender
 */
export async function getPreferredGender(
  userId: string
): Promise<{ data: 'male' | 'female' | 'both'; error: any }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('preferred_gender')
    .eq('id', userId)
    .single();

  return { data: data?.preferred_gender || 'both', error };
}

/**
 * Create a new match
 */
export async function createMatch(
  userId: string,
  profileId: number,
  profileName: string,
  profileAge?: number,
  profileGender?: string,
  profileBio?: string,
  profileImage?: string,
  profileInterests?: string[]
): Promise<{ data: Match | null; error: any }> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      user_id: userId,
      profile_id: profileId,
      profile_name: profileName,
      profile_age: profileAge,
      profile_gender: profileGender,
      profile_bio: profileBio,
      profile_image: profileImage,
      profile_interests: profileInterests,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get all matches for a user
 */
export async function getUserMatches(
  userId: string
): Promise<{ data: Match[] | null; error: any }> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', userId)
    .order('matched_at', { ascending: false });

  return { data, error };
}

/**
 * Get active matches for a user
 */
export async function getActiveMatches(
  userId: string
): Promise<{ data: Match[] | null; error: any }> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('matched_at', { ascending: false });

  return { data, error };
}

/**
 * Get active matches for a user, sorted by most recent conversation activity
 */
export async function getActiveMatchesSortedByActivity(
  userId: string
): Promise<{ data: Match[] | null; error: any }> {
  // Get all active matches
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (matchError || !matches) {
    return { data: null, error: matchError };
  }

  // Get the most recent active conversation for each match
  const matchesWithActivity = await Promise.all(
    matches.map(async (match) => {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, last_message_at')
        .eq('user_id', userId)
        .eq('profile_id', match.profile_id)
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();

      let lastMessage = '';
      if (conversation?.id) {
        // Get the most recent message from this conversation
        const { data: message } = await supabase
          .from('messages')
          .select('content, role')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (message) {
          // Truncate long messages and add prefix for role
          const prefix = message.role === 'user' ? 'You: ' : '';
          const content = message.content.length > 50 
            ? message.content.substring(0, 50) + '...' 
            : message.content;
          lastMessage = prefix + content;
        }
      }

      return {
        ...match,
        last_message_at: conversation?.last_message_at || match.matched_at,
        last_message: lastMessage,
      };
    })
  );

  // Sort by last_message_at, most recent first
  matchesWithActivity.sort((a, b) => {
    const dateA = new Date(a.last_message_at || 0).getTime();
    const dateB = new Date(b.last_message_at || 0).getTime();
    return dateB - dateA;
  });

  return { data: matchesWithActivity, error: null };
}

/**
 * Check if user has already matched with a profile
 */
export async function hasMatched(
  userId: string,
  profileId: number
): Promise<{ matched: boolean; error: any }> {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .single();

  return { matched: !!data, error: error?.code === 'PGRST116' ? null : error };
}

/**
 * Unmatch (deactivate a match)
 */
export async function unmatchProfile(
  userId: string,
  profileId: number
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('matches')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('profile_id', profileId);

  return { error };
}

/**
 * Delete a match completely
 */
export async function deleteMatch(
  userId: string,
  profileId: number
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('user_id', userId)
    .eq('profile_id', profileId);

  return { error };
}

/**
 * Get match count for user
 */
export async function getMatchCount(
  userId: string,
  activeOnly: boolean = false
): Promise<{ count: number; error: any }> {
  let query = supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { count, error } = await query;

  return { count: count || 0, error };
}
