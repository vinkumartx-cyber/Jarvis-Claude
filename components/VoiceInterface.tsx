'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export function VoiceInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      if (final) {
        setTranscript('');
        handleSendMessage(final.trim());
        stopListening();
      } else {
        setTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState('idle');
      setTranscript('');
    };

    recognition.onend = () => {
      if (voiceState === 'listening') {
        // Restart if still supposed to be listening
        try {
          recognition.start();
        } catch (e) {
          setVoiceState('idle');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  // Keyboard shortcut: Space to toggle listening (when not typing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceState]);

  // Waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (voiceState === 'listening' || voiceState === 'speaking') {
        const bars = 40;
        const barWidth = width / bars;
        const time = Date.now() / 200;

        for (let i = 0; i < bars; i++) {
          const amplitude =
            voiceState === 'speaking'
              ? Math.sin(time + i * 0.3) * 0.4 + 0.5
              : Math.sin(time + i * 0.5) * 0.3 + 0.4;

          const barHeight = amplitude * height * 0.8;
          const x = i * barWidth + barWidth * 0.15;
          const y = (height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, voiceState === 'speaking' ? '#8b5cf6' : '#3b82f6');
          gradient.addColorStop(1, voiceState === 'speaking' ? '#6d28d9' : '#1d4ed8');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth * 0.7, barHeight, 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [voiceState]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setVoiceState('listening');
      setTranscript('');
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped
    }
    setVoiceState('idle');
    setTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'idle') {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  const playAudio = async (text: string) => {
    if (isMuted) return;

    try {
      setVoiceState('speaking');

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        setVoiceState('idle');
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setVoiceState('idle');
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setVoiceState('idle');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setVoiceState('idle');
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setVoiceState('idle');
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setVoiceState('processing');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-play TTS
      await playAudio(data.response);
    } catch (error) {
      console.error('Chat error:', error);
      setVoiceState('idle');

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleGenerateBriefing = async () => {
    setIsGeneratingBriefing(true);
    setVoiceState('processing');

    try {
      const response = await fetch('/api/briefing/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate briefing');
      }

      const briefingMessage: ChatMessage = {
        id: `briefing-${Date.now()}`,
        role: 'assistant',
        content: data.briefing.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, briefingMessage]);
      await playAudio(data.briefing.content);
    } catch (error) {
      console.error('Briefing error:', error);
      setVoiceState('idle');
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const voiceButtonColor = {
    idle: 'bg-blue-600 hover:bg-blue-500',
    listening: 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30',
    processing: 'bg-yellow-500',
    speaking: 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="h-16 border-b border-gray-800/50 flex items-center justify-between px-6 bg-gray-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">V.OS Assistant</h2>
            <p className="text-xs text-gray-500">
              {voiceState === 'listening'
                ? 'Listening...'
                : voiceState === 'processing'
                  ? 'Thinking...'
                  : voiceState === 'speaking'
                    ? 'Speaking...'
                    : 'Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateBriefing}
            disabled={isGeneratingBriefing || voiceState === 'processing'}
            className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingBriefing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </span>
            ) : (
              'Daily Briefing'
            )}
          </button>
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted) stopAudio();
            }}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Waveform */}
      {(voiceState === 'listening' || voiceState === 'speaking') && (
        <div className="h-16 bg-gray-900/40 border-b border-gray-800/30 flex items-center justify-center px-6">
          <canvas
            ref={canvasRef}
            width={600}
            height={50}
            className="w-full max-w-xl h-[50px]"
          />
        </div>
      )}

      {/* Live transcript */}
      {transcript && (
        <div className="px-6 py-3 bg-gray-900/30 border-b border-gray-800/30">
          <p className="text-sm text-gray-400 italic">
            <span className="text-blue-400">Hearing:</span> {transcript}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-6">
                <Mic size={32} className="text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-100 mb-3">
                Good morning, Vinesh
              </h3>
              <p className="text-gray-400 mb-6">
                Ask me anything or tap the microphone to start talking. Press{' '}
                <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">
                  Space
                </kbd>{' '}
                to toggle voice input.
              </p>
              <button
                onClick={handleGenerateBriefing}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all shadow-lg shadow-blue-500/20"
              >
                Generate Today&apos;s Briefing
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-2xl px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                    : 'bg-gray-800/80 border border-gray-700/50 text-gray-100'
                }`}
              >
                <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}

        {voiceState === 'processing' && (
          <div className="flex justify-start">
            <div className="bg-gray-800/80 border border-gray-700/50 px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-800/50 p-4 bg-gray-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={toggleListening}
            disabled={voiceState === 'processing'}
            className={`p-4 rounded-full transition-all ${voiceButtonColor[voiceState]} text-white flex-shrink-0`}
          >
            {voiceState === 'listening' ? (
              <MicOff size={22} />
            ) : voiceState === 'processing' ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Mic size={22} />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message or press Space to talk..."
            className="flex-1 bg-gray-800/60 border border-gray-700/50 text-gray-100 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-500 transition-all"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || voiceState === 'processing'}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all flex-shrink-0"
          >
            <Send size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
