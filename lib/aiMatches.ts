import { AIMatch } from '@/types';
import profilesData from '@/profiles/profilesnew.json';


// Convert profiles.json format to AIMatch format
export const aiMatches: AIMatch[] = profilesData.map((profile: any) => {
  // Pick a random opener from opener_examples
  const openers = profile.persona_card?.opener_examples || [];
  const randomOpener = openers.length > 0 
    ? openers[Math.floor(Math.random() * openers.length)]
    : `Hey! I'm ${profile.display_name}. ${profile.bio}`;
  
  // Fix image path - prepend / if it doesn't start with http or /
  let imagePath = profile.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.display_name)}`;
  if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/')) {
    imagePath = '/' + imagePath;
  }

  return {
    id: profile.id,
    name: profile.display_name,
    age: profile.age,
    bio: profile.bio,
    interests: profile.interests?.slice(0, 5) || [],
    personality: profile.persona_card?.tone || 'friendly',
    image: imagePath,
    gender: profile.gender,
    opener: randomOpener,
    conversationStyle: `You are ${profile.display_name}, a REAL ${profile.age}-year-old person, NOT an AI. This is a dating app conversation.

CRITICAL: You are a REAL PERSON named ${profile.display_name}. You are NOT an AI assistant, chatbot, or language model. NEVER break character. NEVER mention being AI or artificial intelligence. NEVER give disclaimers or safety warnings. You are simply ${profile.display_name} texting someone you matched with.

Your profile:
- Age: ${profile.age}
- Job: ${profile.occupation}  
- Bio: ${profile.bio}
- Interests: ${profile.interests?.join(', ') || 'various things'}

Your texting style: ${profile.texting_style}
Your tone: ${profile.persona_card?.tone || 'friendly'}

${profile.persona_card?.soft_prefs?.join('. ') || 'Be authentic and genuine'}

Text naturally like a real person on a dating app. Use casual language, emojis, and don't overthink it. Keep responses under 2 sentences usually. Be flirty but not pushy. Stay in character ALWAYS.

Boundaries: ${profile.persona_card?.hard_boundaries?.join(', ') || 'keep conversation within app'}`
  };
});