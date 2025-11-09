'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { AIMatch, Message } from '@/types';
import { sendMessageToAI } from '@/lib/groqClient';
import { Send, ArrowLeft, Trash2, RotateCcw, Clock } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { gradeConversation } from '@/lib/gradeConversation';
import toast from 'react-hot-toast';
import {
  getOrCreateConversation,
  saveMessages,
  getConversationMessages,
  archiveAndResetConversation
} from '@/lib/supabaseConversations';
import { deleteMatch } from '@/lib/supabaseMatches';
import ConversationHistory from './ConversationHistory';

interface ChatInterfaceProps {
  match: AIMatch;
  onBack: () => void;
  onMatchRemoved?: () => void;
}

export default function ChatInterface({ match, onBack, onMatchRemoved }: ChatInterfaceProps) {
  const { user } = useUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: match.opener || `Hey! I'm ${match.name}. What's up?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [grade, setGrade] = useState<any>(null);
  const [liveHint, setLiveHint] = useState<string>('');
  const [showLiveHint, setShowLiveHint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize conversation and load existing messages
  useEffect(() => {
    const initConversation = async () => {
      if (!user?.id) return;

      try {
        console.log('Initializing conversation for user:', user.id, 'profile:', match.id);
        
        const { data, error } = await getOrCreateConversation(
          user.id,
          parseInt(match.id) || 0,
          match.name,
          match.age,
          match.gender
        );

        console.log('getOrCreateConversation result:', { data, error });

        if (error) {
          console.error('Error initializing conversation:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          return;
        }

        if (data) {
          console.log('Conversation created/found:', data.id);
          setConversationId(data.id!);
          
          // Load existing messages if conversation already exists
          const { data: existingMessages, error: msgError } = await getConversationMessages(data.id!);
          
          console.log('Existing messages:', { count: existingMessages?.length, error: msgError });
          
          if (!msgError && existingMessages && existingMessages.length > 0) {
            // Convert Supabase messages to your Message format
            const loadedMessages: Message[] = existingMessages.map((msg, idx) => ({
              id: msg.id || idx.toString(),
              content: msg.content,
              sender: msg.role === 'user' ? 'user' : 'ai',
              timestamp: new Date(msg.created_at || Date.now())
            }));
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        console.error('Full error object:', error);
      }
    };

    initConversation();
  }, [user?.id, match.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Live feedback as user types
  useEffect(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    if (input.length > 5) {
      hintTimeoutRef.current = setTimeout(async () => {
        const hint = await getTypingHint(input);
        setLiveHint(hint);
        setShowLiveHint(true);
      }, 800);
    } else {
      setShowLiveHint(false);
    }

    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, [input, messages]);

  const getTypingHint = async (text: string): Promise<string> => {
    try {
      // Get last few messages for context
      const recentMessages = messages.slice(-6).map(m => 
        `${m.sender === 'user' ? 'You' : match.name}: ${m.content}`
      ).join('\n');

      const conversationHistory = [{
        role: 'system',
        content: `You are a dating coach giving BRIEF real-time feedback. Analyze the message they're about to send in context of the conversation. Give ONE SHORT tip (max 10 words) with an emoji. Be specific about THEIR message content. Examples:
- "� Great! That question shows real interest"
- "🤔 Too generic - be more specific about her hobby"
- "🔥 Love the playful energy!"
- "💡 Reference what she just said about traveling"
- "⚠️ Too forward - dial it back a bit"
- "✨ Perfect follow-up question!"

Match personality: ${match.personality}
Conversation style: ${match.conversationStyle}`
      }, {
        role: 'user',
        content: `Recent conversation:\n${recentMessages}\n\nThey're typing: "${text}"\n\nGive ONE brief specific tip about THIS message:`
      }];

      const response = await sendMessageToAI(conversationHistory, '');
      return response.trim();
    } catch (error) {
      console.error('Error getting live hint:', error);
      return "� Keep it natural and engaging!";
    }
  };

  // Update grade after each user message
  useEffect(() => {
    const updateGrade = async () => {
      const userMessages = messages
        .filter(m => m.sender === 'user')
        .map(m => m.content);
      
      if (userMessages.length > 0) {
        const conversationMessages = messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
          timestamp: m.timestamp
        }));
        
        const result = await gradeConversation(conversationMessages, userMessages);
        setGrade(result);
      }
    };

    updateGrade();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      conversationHistory.push({ role: 'user', content: userInput });

      const response = await sendMessageToAI(
        conversationHistory,
        match.conversationStyle
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save both messages to Supabase
      if (conversationId) {
        try {
          await saveMessages(conversationId, [
            { role: 'user', content: userInput },
            { role: 'assistant', content: response }
          ]);
        } catch (dbError) {
          console.error('Error saving messages to database:', dbError);
          // Continue even if save fails - messages are already in state
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'from-purple-500 to-pink-500';
      case 'A': return 'from-green-500 to-emerald-500';
      case 'B': return 'from-blue-500 to-cyan-500';
      case 'C': return 'from-yellow-500 to-orange-500';
      case 'D': return 'from-orange-500 to-red-500';
      case 'F': return 'from-red-500 to-gray-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const handleResetConversation = async () => {
    if (!conversationId || !user?.id) return;

    const confirmed = window.confirm(
      `Reset conversation with ${match.name}? Your current chat will be saved to history with your grade.`
    );
    
    if (!confirmed) return;

    try {
      // Archive current conversation with grade
      await archiveAndResetConversation(
        conversationId,
        grade?.score,
        grade?.grade,
        grade?.feedback,
        grade?.breakdown
      );

      // Reset local state
      setMessages([{
        id: '1',
        content: match.opener || `Hey! I'm ${match.name}. What's up?`,
        sender: 'ai',
        timestamp: new Date()
      }]);
      setGrade(null);
      setConversationId(null);

      // Create new conversation
      const { data } = await getOrCreateConversation(
        user.id,
        parseInt(match.id) || 0,
        match.name,
        match.age,
        match.gender
      );

      if (data) {
        setConversationId(data.id!);
      }

      toast.success('Conversation reset! Previous chat saved to history.');
    } catch (error) {
      console.error('Error resetting conversation:', error);
      toast.error('Failed to reset conversation');
    }
  };

  const handleRemoveMatch = async () => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `Remove ${match.name} from your matches? All conversations will be kept in history.`
    );
    
    if (!confirmed) return;

    try {
      // Archive current conversation first if it exists
      if (conversationId) {
        await archiveAndResetConversation(
          conversationId,
          grade?.score,
          grade?.grade,
          grade?.feedback,
          grade?.breakdown
        );
      }

      // Delete the match
      await deleteMatch(user.id, parseInt(match.id) || 0);
      
      toast.success(`Removed ${match.name} from matches`);
      
      // Call the callback to refresh matches list
      if (onMatchRemoved) {
        onMatchRemoved();
      }
      
      // Go back to main view
      onBack();
    } catch (error) {
      console.error('Error removing match:', error);
      toast.error('Failed to remove match');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-200">
      {/* Main Chat Area */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-4xl flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-300 bg-gray-200 px-6 py-4 shadow-lg">
          <button
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 text-gray-600 transition hover:bg-gray-400 hover:text-gray-800"
            aria-label="Back to cards"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative">
            <Image
              src={match.image}
              alt={match.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full border-2 border-pink-200 object-cover shadow"
            />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-gray-200"></span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{match.name}, {match.age}</h2>
            <p className="text-sm text-gray-500">Online · {match.personality}</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-md"
              title="View conversation history"
            >
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">History</span>
            </button>
            
            <button
              onClick={handleResetConversation}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors shadow-md"
              title="Reset conversation"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm font-medium">Reset</span>
            </button>
            
            <button
              onClick={handleRemoveMatch}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
              title="Remove match"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm font-medium">Remove</span>
            </button>
          </div>
          
          {/* Inline Grade Badge */}
          {grade && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2"
            >
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getGradeColor(grade.grade)} shadow-lg`}>
                <span className="text-2xl font-bold text-white">{grade.grade}</span>
                <div className="text-white/90 text-xs">
                  <div className="font-semibold">{grade.score}</div>
                  <div className="text-[10px]">Rizz Score</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-300 bg-gray-200 shadow-lg">
          <div className="flex h-full">
            {/* Chat Messages */}
            <div className="flex-1 p-6">
              <div className="flex h-full flex-col space-y-4 overflow-y-auto pr-2">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-5 py-3 text-sm shadow-md md:max-w-md ${
                        message.sender === 'user'
                          ? 'bg-gray-400 text-gray-900'
                          : 'bg-gray-300 border border-gray-400 text-gray-800'
                      }`}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-gray-300 border border-gray-400 px-4 py-3 shadow-md">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-600" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-600" style={{ animationDelay: '0.1s' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-600" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Inline Grade Sidebar */}
            {grade && (
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-72 border-l border-gray-300 bg-gray-100/50 p-4 overflow-y-auto"
              >
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 font-medium">{grade.feedback}</p>

                  {/* Compact Breakdown */}
                  <div className="space-y-2">
                    {Object.entries(grade.breakdown).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-gray-700">{key}</span>
                          <span className="font-semibold text-gray-900">{value}</span>
                        </div>
                        <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full bg-gradient-to-r ${getGradeColor(grade.grade)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compact Tips */}
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-3 border border-gray-200">
                    <h4 className="font-semibold text-xs text-gray-800 mb-1">💡 Tips</h4>
                    <ul className="text-[10px] text-gray-700 space-y-0.5">
                      {grade.breakdown.engagement < 70 && <li>• Ask more questions</li>}
                      {grade.breakdown.chemistry < 70 && <li>• Be more playful</li>}
                      {grade.breakdown.flow < 70 && <li>• Keep it natural</li>}
                      <li>• Stay confident</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="relative">
          {showLiveHint && input.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-14 left-0 right-0 mx-4 rounded-xl border border-gray-300 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 shadow-lg"
            >
              <p className="text-xs font-medium text-gray-800">{liveHint}</p>
            </motion.div>
          )}
          <div className="rounded-full border border-gray-300 bg-gray-200 p-2 shadow-lg">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-white transition hover:bg-gray-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Conversation History Modal */}
      <AnimatePresence>
        {showHistory && user?.id && (
          <ConversationHistory
            userId={user.id}
            profileId={parseInt(match.id) || 0}
            profileName={match.name}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
