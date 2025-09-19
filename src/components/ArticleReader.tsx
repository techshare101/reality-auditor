"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Pause, Play, Loader2, SkipBack, SkipForward } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ArticleReaderProps {
  text: string;
  className?: string;
}

export default function ArticleReader({ text, className = "" }: ArticleReaderProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Update time while playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioRef.current]);

  // Format time display
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReadAloud = async () => {
    if (!text || !user) {
      console.warn("No text to read or user not authenticated");
      return;
    }

    // If audio exists and we have controls showing, toggle play/pause
    if (audioRef.current && showControls) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = await user.getIdToken();

      // Call TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      // For now, let's use the simpler blob approach that works
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event handlers
      audio.onloadstart = () => {
        console.log("Audio loading started");
      };

      audio.oncanplaythrough = () => {
        console.log("Audio can play through");
        setIsLoading(false);
        setShowControls(true);
      };

      audio.onplay = () => {
        console.log("Audio playing");
        setIsPlaying(true);
      };

      audio.onpause = () => {
        console.log("Audio paused");
        setIsPlaying(false);
      };

      audio.onended = () => {
        console.log("Audio ended");
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = (e) => {
        console.error("Audio error:", e);
        setError("Failed to play audio");
        setIsPlaying(false);
        setIsLoading(false);
        setShowControls(false);
        URL.revokeObjectURL(audioUrl);
      };

      // Play the audio
      await audio.play();
      
    } catch (err: any) {
      console.error("TTS error:", err);
      setError(err.message || "Failed to read aloud");
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Skip forward/backward
  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (!text || !user) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main button */}
      <motion.button
        onClick={handleReadAloud}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm 
          bg-gradient-to-r from-purple-500/20 to-indigo-600/20 
          hover:from-purple-500/30 hover:to-indigo-600/30 
          border border-purple-500/30 text-purple-200 
          rounded-lg transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500/30' : ''}
        `}
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        title={error || (isPlaying ? "Pause" : "Read out loud")}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" />
            <span>Read Out Loud</span>
          </>
        )}
      </motion.button>

      {/* Podcast controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700/50"
          >
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 min-w-[40px]">
                {formatTime(currentTime)}
              </span>
              <div
                ref={progressRef}
                onClick={handleSeek}
                className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative overflow-hidden group"
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <div className="absolute inset-0 h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xs text-gray-400 min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-2">
              <motion.button
                onClick={() => handleSkip(-10)}
                className="p-2 rounded-full hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Skip back 10 seconds"
              >
                <SkipBack className="w-4 h-4" />
              </motion.button>

              <motion.button
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlaying) {
                      audioRef.current.pause();
                    } else {
                      audioRef.current.play();
                    }
                  }
                }}
                className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </motion.button>

              <motion.button
                onClick={() => handleSkip(10)}
                className="p-2 rounded-full hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Skip forward 10 seconds"
              >
                <SkipForward className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
