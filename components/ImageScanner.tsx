'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, X, ScanLine, Upload, FileText, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScanResult {
  id: string;
  imageUrl: string;
  extractedText: string;
  summary: string;
  category: string;
  scannedAt: Date;
}

export function ImageScanner() {
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      toast.error('Camera access denied. Try uploading an image instead.');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const captureAndScan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    await scanImage(dataUrl);
  }, [stopCamera]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) await scanImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const scanImage = async (dataUrl: string) => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');

      const newResult: ScanResult = {
        id: `scan-${Date.now()}`,
        imageUrl: dataUrl,
        extractedText: data.extractedText,
        summary: data.summary,
        category: data.category,
        scannedAt: new Date(),
      };
      setResults((prev) => [newResult, ...prev]);
      setExpandedId(newResult.id);
      toast.success('Document scanned successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan image');
    } finally {
      setScanning(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800/50 px-6 py-4 bg-gray-900/60 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ScanLine size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Document Scanner</h2>
              <p className="text-xs text-gray-500">AI reads and extracts text from any image</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors disabled:opacity-40"
            >
              <Upload size={15} />
              Upload Image
            </button>
            <button
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-colors disabled:opacity-40"
            >
              <Camera size={15} />
              {cameraActive ? 'Stop Camera' : 'Use Camera'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Camera viewfinder */}
        {cameraActive && (
          <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-black max-w-2xl mx-auto">
            <video ref={videoRef} className="w-full" playsInline muted />
            {/* Corner guides */}
            <div className="absolute inset-0 pointer-events-none">
              {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 border-2 border-emerald-400 ${
                  i === 0 ? 'border-b-0 border-r-0 rounded-tl' :
                  i === 1 ? 'border-b-0 border-l-0 rounded-tr' :
                  i === 2 ? 'border-t-0 border-r-0 rounded-bl' :
                  'border-t-0 border-l-0 rounded-br'
                }`} />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-0.5 bg-emerald-400/40 animate-pulse" />
              </div>
            </div>
            <div className="absolute bottom-4 inset-x-0 flex justify-center">
              <button
                onClick={captureAndScan}
                className="w-16 h-16 rounded-full bg-white border-4 border-emerald-400 hover:bg-gray-100 transition-colors shadow-xl flex items-center justify-center"
              >
                <Camera size={24} className="text-gray-800" />
              </button>
            </div>
          </div>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-emerald-500/20 animate-spin" />
              <ScanLine size={28} className="absolute inset-0 m-auto text-emerald-400" />
            </div>
            <p className="text-gray-400 text-sm">Jarvis is reading the document...</p>
          </div>
        )}

        {/* Empty state */}
        {!scanning && !cameraActive && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700 flex items-center justify-center">
              <ScanLine size={28} className="text-gray-600" />
            </div>
            <div>
              <p className="text-gray-400 font-medium">No scans yet</p>
              <p className="text-gray-600 text-sm mt-1">Use the camera or upload an image — Jarvis will extract and summarize the text</p>
            </div>
          </div>
        )}

        {/* Scan results */}
        <div className="space-y-4 max-w-3xl mx-auto w-full">
          {results.map((r) => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Result header */}
              <div className="flex items-start gap-4 p-4">
                <img
                  src={r.imageUrl}
                  alt="Scanned document"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      {r.category}
                    </span>
                    <span className="text-xs text-gray-600">
                      {r.scannedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{r.summary}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyText(r.extractedText)}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                    title="Copy extracted text"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => setResults((prev) => prev.filter((x) => x.id !== r.id))}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete scan"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {expandedId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded text */}
              {expandedId === r.id && (
                <div className="border-t border-gray-800 px-4 pb-4">
                  <div className="flex items-center gap-2 py-3 mb-2">
                    <FileText size={13} className="text-gray-500" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Extracted Text</span>
                  </div>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-sans bg-gray-950 rounded-xl p-4 border border-gray-800 max-h-64 overflow-y-auto">
                    {r.extractedText}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
