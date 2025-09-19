"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const handleReadAloud = async () => {
    if (!text || !user) {
      console.warn("No text to read or user not authenticated");
      return;
    }

    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      setIsPlaying(false);
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
      };

      audio.onplay = () => {
        console.log("Audio playing");
        setIsPlaying(true);
      };

      audio.onended = () => {
        console.log("Audio ended");
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error("Audio error:", e);
        setError("Failed to play audio");
        setIsPlaying(false);
        setIsLoading(false);
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

  if (!text || !user) {
    return null;
  }

  return (
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
        ${className}
      `}
      whileHover={{ scale: isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
      title={error || (isPlaying ? "Stop reading" : "Read out loud")}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating...</span>
        </>
      ) : isPlaying ? (
        <>
          <VolumeX className="w-4 h-4" />
          <span>Stop Reading</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" />
          <span>Read Out Loud</span>
        </>
      )}
    </motion.button>
  );
}
