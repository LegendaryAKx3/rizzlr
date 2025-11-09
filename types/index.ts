export interface AIMatch {
  id: string;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  personality: string;
  image: string;
  conversationStyle: string;
  opener?: string; // Random opener from opener_examples
  gender?: string; // 'male' or 'female'
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface Chat {
  matchId: string;
  messages: Message[];
  grade?: {
    score: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    feedback: string;
    breakdown: {
      engagement: number;
      flow: number;
      chemistry: number;
      timing: number;
    };
  };
}

export interface UserCard {
  userId: string;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  imageUrl?: string;
}
