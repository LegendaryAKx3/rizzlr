import { sendMessageToAI } from './groqClient';

interface GradingResult {
  score: number; // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  feedback: string;
  breakdown: {
    engagement: number;
    flow: number;
    chemistry: number;
    timing: number;
  };
}

export async function gradeConversation(
  messages: { role: string; content: string; timestamp?: Date }[],
  userMessages: string[]
): Promise<GradingResult> {
  // Filter to only user messages for analysis
  const recentUserMessages = userMessages.slice(-5); // Last 5 messages
  
  if (recentUserMessages.length === 0) {
    return {
      score: 0,
      grade: 'F',
      feedback: 'Start the conversation!',
      breakdown: { engagement: 0, flow: 0, chemistry: 0, timing: 0 }
    };
  }

  // Use LLM to analyze the conversation
  const conversationText = messages
    .slice(-10) // Last 10 messages for context
    .map(m => `${m.role === 'user' ? 'User' : 'Match'}: ${m.content}`)
    .join('\n');

  const gradingPrompt = `You are an expert dating coach analyzing a conversation. Grade the user's conversation skills on a dating app.

Conversation:
${conversationText}

Analyze ONLY the User's messages and rate them 0-100 on these criteria:

1. ENGAGEMENT (0-100): Are they asking questions? Showing genuine interest? Messages too short or too long?
2. FLOW (0-100): Do they maintain good conversation rhythm? Natural back-and-forth?
3. CHEMISTRY (0-100): Are they flirty, playful, confident? Using humor? Building attraction?
4. TIMING (0-100): Appropriate message length and frequency?

Respond ONLY in this exact JSON format (no other text):
{
  "engagement": <number>,
  "flow": <number>,
  "chemistry": <number>,
  "timing": <number>,
  "feedback": "<one short sentence of advice>"
}`;

  try {
    const response = await sendMessageToAI(
      [{ role: 'user', content: gradingPrompt }],
      'You are a dating coach expert. Respond only with valid JSON, no other text.'
    );

    // Parse LLM response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Calculate weighted score
    const score = Math.round(
      analysis.engagement * 0.35 +
      analysis.flow * 0.25 +
      analysis.chemistry * 0.25 +
      analysis.timing * 0.15
    );

    const grade = getGrade(score);
    const feedback = getFeedback(score, analysis.feedback);

    return {
      score,
      grade,
      feedback,
      breakdown: {
        engagement: Math.round(analysis.engagement),
        flow: Math.round(analysis.flow),
        chemistry: Math.round(analysis.chemistry),
        timing: Math.round(analysis.timing)
      }
    };
  } catch (error) {
    console.error('Error grading with LLM:', error);
    // Fallback to basic grading if LLM fails
    return fallbackGrading(messages, recentUserMessages);
  }
}

function fallbackGrading(
  messages: any[],
  recentUserMessages: string[]
): GradingResult {
  // Simple fallback grading
  const engagement = calculateEngagement(recentUserMessages);
  const flow = calculateFlow(messages);
  const chemistry = calculateChemistry(recentUserMessages);
  const timing = calculateTiming(messages);

  const score = Math.round(
    engagement * 0.35 +
    flow * 0.25 +
    chemistry * 0.25 +
    timing * 0.15
  );

  return {
    score,
    grade: getGrade(score),
    feedback: getFeedback(score, ''),
    breakdown: { engagement, flow, chemistry, timing }
  };
}

function calculateEngagement(messages: string[]): number {
  let score = 50; // Base score

  messages.forEach(msg => {
    const length = msg.length;
    
    // Optimal length: 20-150 characters
    if (length >= 20 && length <= 150) score += 10;
    else if (length < 10) score -= 15; // Too short
    else if (length > 200) score -= 5; // Too long

    // Check for questions (shows interest)
    if (msg.includes('?')) score += 8;

    // Check for emojis (personality)
    if (/[😀-🙏🌀-🗿]/u.test(msg)) score += 5;

    // Avoid one-word responses
    if (msg.split(' ').length === 1) score -= 10;
  });

  return Math.max(0, Math.min(100, score));
}

function calculateFlow(messages: any[]): number {
  if (messages.length < 4) return 50;

  let score = 50;
  
  // Check for back-and-forth rhythm
  let backAndForth = 0;
  for (let i = 1; i < Math.min(messages.length, 10); i++) {
    if (messages[i].role !== messages[i - 1].role) {
      backAndForth++;
    }
  }
  
  // Good rhythm = alternating messages
  const rhythmRatio = backAndForth / Math.min(messages.length - 1, 9);
  score += rhythmRatio * 50;

  return Math.max(0, Math.min(100, score));
}

function calculateChemistry(messages: string[]): number {
  let score = 50;

  const flirtyWords = [
    'cute', 'hot', 'beautiful', 'handsome', 'stunning', 'gorgeous',
    'funny', 'amazing', 'love', 'like', 'haha', 'lol', '😂', '😊', 
    '😍', '🥰', '😘', '🔥', 'damn', 'wow', 'interesting', 'cool'
  ];

  const awkwardWords = [
    'sorry', 'um', 'uh', 'maybe', 'idk', 'whatever', 'ok', 'k'
  ];

  messages.forEach(msg => {
    const lower = msg.toLowerCase();
    
    // Bonus for flirty language
    flirtyWords.forEach(word => {
      if (lower.includes(word)) score += 5;
    });

    // Penalty for awkward language
    awkwardWords.forEach(word => {
      if (lower === word || lower.includes(` ${word} `)) score -= 8;
    });

    // Bonus for playful teasing
    if (msg.includes('😏') || msg.includes('😉')) score += 10;
  });

  return Math.max(0, Math.min(100, score));
}

function calculateTiming(messages: any[]): number {
  // Basic timing - could be enhanced with actual timestamps
  // For now, just reward consistent engagement
  return messages.length >= 6 ? 80 : 50;
}

function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getFeedback(score: number, llmFeedback: string): string {
  if (llmFeedback) return llmFeedback;
  
  // Fallback feedback
  if (score >= 90) return "🔥 Absolute rizz god! Keep this energy!";
  if (score >= 80) return "💯 Smooth operator! They're loving this!";
  if (score >= 70) return "😎 Good vibes! Keep the conversation flowing";
  if (score >= 60) return "👍 Not bad! Try being more playful";
  if (score >= 50) return "💬 Decent start. Ask more questions!";
  if (score >= 40) return "🤔 Needs work. Show more personality!";
  return "😬 Awkward energy. Try to be more engaging!";
}
