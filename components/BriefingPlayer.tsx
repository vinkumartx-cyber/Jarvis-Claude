'use client';

import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Volume2, ChevronDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from './ui/Card';

interface BriefingData {
  id: string;
  title: string;
  text: string;
  audioUrl: string;
  duration: number;
  generatedAt: Date;
}

interface PlaybackSpeed {
  label: string;
  value: number;
}

const playbackSpeeds: PlaybackSpeed[] = [
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
];

export function BriefingPlayer({ briefing }: { briefing?: BriefingData }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [waveformBars, setWaveformBars] = useState(Array(30).fill(0));
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!briefing || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = briefing.audioUrl;
    audio.playbackRate = playbackSpeed;

    if (!audioContextRef.current && briefing.audioUrl) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaElementAudioSource(audio);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [briefing, playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const animateWaveform = () => {
    if (!analyserRef.current || !isPlaying) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bars = Array.from({ length: 30 }).map((_, i) => {
      const index = Math.floor((i / 30) * dataArray.length);
      return (dataArray[index] / 255) * 100;
    });

    setWaveformBars(bars);
    animationRef.current = requestAnimationFrame(animateWaveform);
  };

  useEffect(() => {
    if (isPlaying) {
      animateWaveform();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setWaveformBars(Array(30).fill(0));
    }
  }, [isPlaying]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!briefing) {
    return (
      <Card className="text-center py-8">
        <Volume2 className="mx-auto mb-3 h-8 w-8 text-gray-600" />
        <p className="text-sm text-gray-400">No briefing available</p>
      </Card>
    );
  }

  const currentSpeed = playbackSpeeds.find((s) => s.value === playbackSpeed);

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30">
            <Zap className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{briefing.title}</h3>
            <p className="text-xs text-gray-400">
              {new Date(briefing.generatedAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-end justify-center gap-1 h-12 rounded-lg bg-white/[0.02] border border-white/10 px-4 py-3">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-blue-500 to-cyan-400 transition-all duration-75"
                style={{ height: `${Math.max(height, 8)}%` }}
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={briefing.duration}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full cursor-pointer appearance-none accent-blue-500"
            style={{
              background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${
                (currentTime / briefing.duration) * 100
              }%, rgb(229, 231, 235) ${(currentTime / briefing.duration) * 100}%, rgb(229, 231, 235) 100%)`,
            }}
          />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(briefing.duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] px-3 py-2 text-sm text-white border border-white/10 transition-all duration-300"
            >
              {currentSpeed?.label}
              <ChevronDown className={cn('h-3 w-3 transition-transform', showSpeedMenu && 'rotate-180')} />
            </button>

            {showSpeedMenu && (
              <div className="absolute top-full mt-2 left-0 z-50 rounded-lg bg-slate-800 border border-white/10 shadow-lg overflow-hidden">
                {playbackSpeeds.map((speed) => (
                  <button
                    key={speed.value}
                    onClick={() => handleSpeedChange(speed.value)}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left transition-all duration-300',
                      playbackSpeed === speed.value
                        ? 'bg-blue-600/30 text-blue-300'
                        : 'text-gray-300 hover:bg-white/[0.05]'
                    )}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 border',
              showTranscript
                ? 'bg-white/[0.1] text-blue-400 border-blue-500/30'
                : 'bg-white/[0.05] text-gray-300 border-white/10 hover:bg-white/[0.08]'
            )}
          >
            Transcript
          </button>
        </div>

        {showTranscript && (
          <div className="rounded-lg bg-white/[0.02] border border-white/10 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white">Briefing Transcript</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{briefing.text}</p>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={false}
            className="rounded border-white/20 bg-white/[0.05] text-blue-500 cursor-pointer"
          />
          Auto-play next briefing
        </label>
      </div>

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onError={(e) => console.error('Audio error:', e)}
      />
    </Card>
  );
}

export default BriefingPlayer;
