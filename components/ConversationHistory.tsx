'use client';

import { useState, useEffect } from 'react';
import { Conversation, getConversationHistory, getConversationMessages } from '@/lib/supabaseConversations';
import { Clock, MessageCircle, Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationHistoryProps {
  userId: string;
  profileId: number;
  profileName: string;
  onClose: () => void;
}

interface HistoryWithMessages extends Conversation {
  messageCount: number;
}

export default function ConversationHistory({ 
  userId, 
  profileId, 
  profileName,
  onClose 
}: ConversationHistoryProps) {
  const [history, setHistory] = useState<HistoryWithMessages[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId, profileId]);

  const loadHistory = async () => {
    setLoading(true);
    const { data, error } = await getConversationHistory(userId, profileId);
    
    if (data && !error) {
      // Load message counts for each conversation
      const historyWithCounts = await Promise.all(
        data.map(async (conv) => {
          const { data: msgs } = await getConversationMessages(conv.id!);
          return {
            ...conv,
            messageCount: msgs?.length || 0,
          };
        })
      );
      setHistory(historyWithCounts);
    }
    setLoading(false);
  };

  const viewConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const { data } = await getConversationMessages(conversation.id!);
    setMessages(data || []);
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'S': return 'text-purple-500';
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gray-800 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Conversation History</h2>
              <p className="text-gray-300 text-sm">Past attempts with {profileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* History List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-center">No previous conversations yet.</p>
                <p className="text-sm text-center mt-2">Your archived chats will appear here with their scores!</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {history.map((conv) => (
                  <motion.button
                    key={conv.id}
                    onClick={() => viewConversation(conv)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedConversation?.id === conv.id
                        ? 'bg-gray-800 text-white shadow-lg'
                        : 'bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {conv.messageCount} messages
                        </span>
                      </div>
                      {conv.grade && (
                        <div className={`flex items-center gap-1 font-bold ${
                          selectedConversation?.id === conv.id ? 'text-white' : getGradeColor(conv.grade)
                        }`}>
                          <Trophy className="w-4 h-4" />
                          <span className="text-lg">{conv.grade}</span>
                        </div>
                      )}
                    </div>
                    
                    {conv.score !== undefined && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Score</span>
                          <span className="font-bold">{conv.score}/100</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${
                          selectedConversation?.id === conv.id ? 'bg-white/30' : 'bg-gray-200'
                        }`}>
                          <div
                            className={`h-full ${
                              selectedConversation?.id === conv.id 
                                ? 'bg-white' 
                                : 'bg-gray-800'
                            }`}
                            style={{ width: `${conv.score}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <p className={`text-xs ${
                      selectedConversation?.id === conv.id ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {formatDate(conv.created_at)}
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Conversation View */}
          <div className="w-1/2 overflow-y-auto">
            {selectedConversation ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Conversation Details</h3>
                  {selectedConversation.grade_feedback && (
                    <div className="bg-white rounded-xl p-4 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Feedback:</p>
                      <p className="text-sm text-gray-600">{selectedConversation.grade_feedback}</p>
                    </div>
                  )}
                  
                  {selectedConversation.grade_breakdown && (
                    <div className="bg-white rounded-xl p-4 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Breakdown:</p>
                      <div className="space-y-2">
                        {Object.entries(selectedConversation.grade_breakdown).map(([key, value]) => (
                          <div key={key}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="capitalize text-gray-600">{key}</span>
                              <span className="font-semibold">{value}/100</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-800"
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Messages:</h4>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-gray-800 text-white ml-8'
                          : 'bg-white mr-8'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-center">Select a conversation to view details</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
