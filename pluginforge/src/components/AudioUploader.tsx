import { useState, useRef, useCallback } from "react";
import type { AudioSampleFile } from "@/types/plugin";
import { analyzeAudioSample } from "@/lib/ai-describer";

interface AudioUploaderProps {
  onSampleLoaded: (sample: AudioSampleFile) => void;
}

export default function AudioUploader({ onSampleLoaded }: AudioUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sample, setSample] = useState<AudioSampleFile | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(wav|mp3|aif|aiff|flac|ogg|m4a)$/i)) {
      alert("Please upload an audio file (WAV, MP3, AIFF, FLAC, OGG, M4A)");
      return;
    }

    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

      // Extract waveform data (downsampled)
      const channelData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(channelData.length / samples);
      const waveformData: number[] = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveformData.push(sum / blockSize);
      }

      // Normalize waveform
      const maxWf = Math.max(...waveformData);
      const normalizedWaveform = waveformData.map((v) => v / (maxWf || 1));

      const sampleFile: AudioSampleFile = {
        name: file.name,
        size: file.size,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        waveformData: normalizedWaveform,
        arrayBuffer,
      };

      setSample(sampleFile);
      onSampleLoaded(sampleFile);

      // Get full channel data for analysis
      const fullData = Array.from(channelData.slice(0, Math.min(channelData.length, 44100 * 5)));
      const analysisResult = analyzeAudioSample(
        audioBuffer.sampleRate,
        audioBuffer.duration,
        audioBuffer.numberOfChannels,
        fullData,
      );
      setAnalysis(analysisResult);
    } catch (err) {
      console.error("Error processing audio:", err);
      alert("Failed to process audio file. Please try a different format.");
    } finally {
      setIsLoading(false);
    }
  }, [onSampleLoaded]);

  const playPreview = async () => {
    if (!sample || !audioContextRef.current) return;

    if (isPlaying && sourceRef.current) {
      sourceRef.current.stop();
      setIsPlaying(false);
      return;
    }

    try {
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const audioBuffer = await audioCtx.decodeAudioData(sample.arrayBuffer.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Audio Sample</h3>

      {!sample ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? "border-brand-500 bg-brand-500/5"
              : "border-surface-700 hover:border-surface-500 hover:bg-surface-800/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.aif,.aiff,.flac,.ogg,.m4a"
            className="hidden"
            onChange={handleFileChange}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-brand-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="text-surface-400">Analyzing audio file...</p>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-surface-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
              </svg>
              <p className="text-surface-300 font-medium mb-1">Drop an audio file here</p>
              <p className="text-surface-500 text-sm">
                WAV, MP3, AIFF, FLAC, OGG, M4A supported
              </p>
              <p className="text-surface-600 text-xs mt-2">
                Upload a sound to sample it in your plugin
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="glass-panel p-5 space-y-4">
          {/* File info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={playPreview}
                className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div>
                <p className="text-sm font-medium text-white">{sample.name}</p>
                <p className="text-xs text-surface-500">
                  {sample.duration.toFixed(2)}s | {sample.sampleRate}Hz | {sample.channels === 1 ? "Mono" : "Stereo"} | {(sample.size / 1024).toFixed(0)}KB
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSample(null); setAnalysis(""); }}
              className="btn-ghost text-sm"
            >
              Remove
            </button>
          </div>

          {/* Waveform visualization */}
          <div className="h-24 bg-surface-800/50 rounded-xl flex items-center gap-[2px] px-3">
            {sample.waveformData.map((v, i) => (
              <div
                key={i}
                className="waveform-bar flex-1 min-w-[1px]"
                style={{ height: `${Math.max(v * 80, 2)}%` }}
              />
            ))}
          </div>

          {/* Analysis */}
          {analysis && (
            <div className="bg-surface-800/30 rounded-xl p-4">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">AI Analysis</p>
              <pre className="text-sm text-surface-300 font-sans whitespace-pre-wrap">{analysis}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
