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

      // Start streaming TTS API call
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

      // Get the response body as a stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream not available");
      }

      // Collect chunks for progressive playback
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      let audioStarted = false;
      let audioBlob: Blob | null = null;
      let audioUrl: string | null = null;

      // Read stream chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          
          // Start playing after receiving initial chunks (around 16KB)
          if (!audioStarted && receivedLength > 16384) {
            // Create initial blob from collected chunks
            const initialChunks = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
              initialChunks.set(chunk, position);
              position += chunk.length;
            }
            
            audioBlob = new Blob([initialChunks], { type: 'audio/mpeg' });
            audioUrl = URL.createObjectURL(audioBlob);
            
            // Create and configure audio element
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            
            // Set up event handlers
            audio.onloadeddata = () => {
              setIsLoading(false);
              audio.play().catch(e => {
                console.error("Playback error:", e);
                setError("Failed to start playback");
              });
            };
            
            audio.onplay = () => setIsPlaying(true);
            
            audio.onended = () => {
              setIsPlaying(false);
              if (audioUrl) URL.revokeObjectURL(audioUrl);
            };
            
            audio.onerror = () => {
              setError("Audio playback error");
              setIsPlaying(false);
              if (audioUrl) URL.revokeObjectURL(audioUrl);
            };
            
            audioStarted = true;
          }
        }
      }

      // If we haven't started playing yet (small audio), create final blob
      if (!audioStarted && chunks.length > 0) {
        const fullAudio = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          fullAudio.set(chunk, position);
          position += chunk.length;
        }
        
        audioBlob = new Blob([fullAudio], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl!);
        };
        audio.onerror = () => {
          setError("Failed to play audio");
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl!);
        };
        
        await audio.play();
        setIsLoading(false);
      }

    } catch (err: any) {
      console.error("TTS streaming error:", err);
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
