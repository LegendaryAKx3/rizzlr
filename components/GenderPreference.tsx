'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { updatePreferredGender, getPreferredGender, getOrCreateUserProfile } from '@/lib/supabaseMatches';
import { ArrowLeft, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface GenderPreferenceProps {
  onBack?: () => void;
}

export default function GenderPreference({ onBack }: GenderPreferenceProps) {
  const { user } = useUser();
  const router = useRouter();
  const [preference, setPreference] = useState<'male' | 'female' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      if (!user) return;
      
      try {
        // Ensure user profile exists first
        await getOrCreateUserProfile(user.id);
        
        const { data } = await getPreferredGender(user.id);
        setPreference(data);
      } catch (error) {
        console.error('Error loading preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, [user]);

  const handleUpdate = async (newPreference: 'male' | 'female' | 'both') => {
    if (!user || isSaving) return;
    
    console.log('Updating preference to:', newPreference);
    console.log('User ID:', user.id);
    
    setIsSaving(true);
    try {
      // Ensure user profile exists before updating
      console.log('Creating/getting user profile...');
      const profileResult = await getOrCreateUserProfile(user.id);
      console.log('Profile result:', profileResult);
      
      console.log('Updating preferred gender...');
      const { error } = await updatePreferredGender(user.id, newPreference);
      console.log('Update result - error:', error);
      
      if (!error) {
        setPreference(newPreference);
        toast.success('Preference updated! 🎉', {
          duration: 2000,
        });
      } else {
        console.error('Update error:', error);
        toast.error(`Failed to update preference: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error(`Failed to update preference: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4 py-6">
      {/* Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      )}

      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Show Me
          </h1>
          <p className="text-gray-600">
            Choose who you'd like to see
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Men */}
          <button
            onClick={() => handleUpdate('male')}
            disabled={isSaving}
            className={`w-full p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
              preference === 'male'
                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">👨</div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800 text-lg">Men</h3>
                  <p className="text-sm text-gray-600">Show me male profiles</p>
                </div>
              </div>
              {preference === 'male' && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              )}
            </div>
          </button>

          {/* Women */}
          <button
            onClick={() => handleUpdate('female')}
            disabled={isSaving}
            className={`w-full p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
              preference === 'female'
                ? 'border-pink-500 bg-pink-50 shadow-lg shadow-pink-200'
                : 'border-gray-200 bg-white hover:border-pink-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">👩</div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800 text-lg">Women</h3>
                  <p className="text-sm text-gray-600">Show me female profiles</p>
                </div>
              </div>
              {preference === 'female' && (
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              )}
            </div>
          </button>

          {/* Everyone */}
          <button
            onClick={() => handleUpdate('both')}
            disabled={isSaving}
            className={`w-full p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
              preference === 'both'
                ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                : 'border-gray-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🌈</div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800 text-lg">Everyone</h3>
                  <p className="text-sm text-gray-600">Show me all profiles</p>
                </div>
              </div>
              {preference === 'both' && (
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            💡 You can change this preference anytime in your settings
          </p>
        </div>

        {/* Back to Home Button */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-2xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
