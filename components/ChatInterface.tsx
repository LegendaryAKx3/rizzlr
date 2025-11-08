'use client';

import { useState, useRef, useEffect } from 'react';
import { AIMatch, Message } from '@/types';
import { sendMessageToAI } from '@/lib/groqClient';
import { Send, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface ChatInterfaceProps {
  match: AIMatch;
  onBack: () => void;
}

export default function ChatInterface({ match, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hey! I'm ${match.name}. ${match.bio} What's up?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      conversationHistory.push({ role: 'user', content: input });

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
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 px-4 py-6">
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
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-300 bg-gray-200 p-6 shadow-lg">
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

        {/* Input Area */}
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
  );
}
