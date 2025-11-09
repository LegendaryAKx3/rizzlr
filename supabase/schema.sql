-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table: stores user preferences and settings
-- Using TEXT for id to support Clerk user IDs (user_xxxxx format)
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY, -- Clerk user ID
    
    -- User preferences
    preferred_gender TEXT CHECK (preferred_gender IN ('male', 'female', 'both')) DEFAULT 'both',
    
    -- Profile settings
    display_name TEXT,
    bio TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table: stores which AI profiles a user has matched with
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Clerk user ID
    profile_id INTEGER NOT NULL, -- References the AI profile (not stored in Supabase)
    
    -- Match metadata
    profile_name TEXT NOT NULL,
    profile_age INTEGER,
    profile_gender TEXT,
    profile_bio TEXT,
    profile_image TEXT,
    profile_interests TEXT[],
    
    -- Match state
    is_active BOOLEAN DEFAULT true,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, profile_id)
);

-- Conversations table: stores each conversation between a user and an AI profile
-- Updated to support multiple conversation attempts (history)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Clerk user ID
    profile_id INTEGER NOT NULL, -- References the AI profile (not stored in Supabase)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata about the conversation
    profile_name TEXT NOT NULL,
    profile_age INTEGER,
    profile_gender TEXT,
    
    -- Conversation state
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false, -- For conversation history
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Conversation grading/scoring
    score INTEGER, -- 0-100
    grade TEXT, -- 'S', 'A', 'B', 'C', 'D', 'F'
    grade_feedback TEXT,
    grade_breakdown JSONB, -- { engagement, flow, chemistry, timing }
    graded_at TIMESTAMP WITH TIME ZONE
    
    -- Removed UNIQUE constraint to allow multiple conversation attempts per user-profile pair
);

-- Messages table: stores individual messages in conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_gender ON user_profiles(preferred_gender);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_profile_id ON matches(profile_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_active ON matches(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_profile_id ON conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_active ON conversations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_user_archived ON conversations(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversations_user_profile_active ON conversations(user_id, profile_id, is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_score ON conversations(score DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Enable Row Level Security (Disabled for Clerk auth - using application-level security)
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are commented out because we're using Clerk for authentication
-- instead of Supabase auth. Security is enforced at the application level by
-- ensuring all queries include the user_id from Clerk's authenticated session.

/*
-- RLS Policies for user_profiles
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT
    USING (id = auth.jwt() ->> 'sub');

-- Users can create their own profile
CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT
    WITH CHECK (id = auth.jwt() ->> 'sub');

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE
    USING (id = auth.jwt() ->> 'sub');

-- RLS Policies for matches
-- Users can view their own matches
CREATE POLICY "Users can view their own matches" ON matches
    FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');

-- Users can create their own matches
CREATE POLICY "Users can create their own matches" ON matches
    FOR INSERT
    WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Users can update their own matches
CREATE POLICY "Users can update their own matches" ON matches
    FOR UPDATE
    USING (user_id = auth.jwt() ->> 'sub');

-- Users can delete their own matches
CREATE POLICY "Users can delete their own matches" ON matches
    FOR DELETE
    USING (user_id = auth.jwt() ->> 'sub');

-- RLS Policies for conversations
-- Users can only see their own conversations
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');

-- Users can create their own conversations
CREATE POLICY "Users can create their own conversations" ON conversations
    FOR INSERT
    WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Users can update their own conversations
CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE
    USING (user_id = auth.jwt() ->> 'sub');

-- Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations" ON conversations
    FOR DELETE
    USING (user_id = auth.jwt() ->> 'sub');

-- RLS Policies for messages
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.jwt() ->> 'sub'
        )
    );

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in their conversations" ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.jwt() ->> 'sub'
        )
    );

-- Users can update messages in their conversations
CREATE POLICY "Users can update messages in their conversations" ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.jwt() ->> 'sub'
        )
    );

-- Users can delete messages in their conversations
CREATE POLICY "Users can delete messages in their conversations" ON messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.jwt() ->> 'sub'
        )
    );
*/

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        updated_at = NOW(),
        last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation timestamp when message is added
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function to update updated_at on conversations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for conversations updated_at
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_profiles IS 'Stores user preferences and profile settings';
COMMENT ON TABLE matches IS 'Stores AI profiles that users have matched with';
COMMENT ON TABLE conversations IS 'Stores conversations between users and AI profiles';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON COLUMN user_profiles.preferred_gender IS 'User preference for AI profile gender: male, female, or both';
COMMENT ON COLUMN matches.profile_id IS 'References AI profile ID (profiles are not stored in Supabase)';
COMMENT ON COLUMN conversations.profile_id IS 'References AI profile ID (profiles are not stored in Supabase)';
COMMENT ON COLUMN messages.role IS 'Message sender: user or assistant (AI)';
