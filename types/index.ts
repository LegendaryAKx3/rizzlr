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
}
