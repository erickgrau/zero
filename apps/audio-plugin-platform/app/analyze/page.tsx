import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { analyzeAudioFile } from '@/lib/audio/analyzer';
import {
  Upload,
  Loader2,
  AudioWaveform as AudioWaveformIcon,
  ArrowRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePluginStore } from '@/lib/store';
import type { AudioAnalysisResult, PluginParameter } from '@/types/plugin';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnalyzePage() {
  const navigate = useNavigate();
  const createProject = usePluginStore((s) => s.createProject);

  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile],
  );

  async function handleAnalyze() {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeAudioFile(file);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Draw waveform
  useEffect(() => {
    if (!result || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const data = result.waveformData;
    const centerY = height / 2;
    const barWidth = width / data.length;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Waveform lines from center
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1;

    for (let i = 0; i < data.length; i++) {
      const amplitude = data[i] * centerY * 0.9;
      const x = i * barWidth;

      ctx.beginPath();
      ctx.moveTo(x, centerY - amplitude);
      ctx.lineTo(x, centerY + amplitude);
      ctx.stroke();
    }
  }, [result]);

  // Draw frequency spectrum
  useEffect(() => {
    if (!result || !spectrumCanvasRef.current) return;

    const canvas = spectrumCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const bands = result.frequencyBands;
    const barWidth = width / bands.length;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Normalize magnitudes (dB, typically -100 to 0)
    const minDb = -100;
    const maxDb = 0;

    for (let i = 0; i < bands.length; i++) {
      const normalizedMag = Math.max(
        0,
        (bands[i].magnitude - minDb) / (maxDb - minDb),
      );
      const barHeight = normalizedMag * height * 0.9;
      const x = i * barWidth;

      // Gradient from blue to purple
      const ratio = i / bands.length;
      const r = Math.round(59 + ratio * 108);
      const g = Math.round(130 - ratio * 50);
      const b = Math.round(246 - ratio * 4);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }
  }, [result]);

  function handleCreatePlugin() {
    if (!result) return;

    const parameters: PluginParameter[] = result.suggestedParameters.map(
      (p, i) => ({
        id: p.id || `param-${i}`,
        name: p.name || `param${i}`,
        label: p.label || `Parameter ${i + 1}`,
        type: p.type || 'float',
        min: p.min,
        max: p.max,
        defaultValue: p.defaultValue ?? 0,
        step: p.step,
        unit: p.unit,
        choices: p.choices,
      }),
    );

    const project = createProject({
      name: `${result.suggestedType.charAt(0).toUpperCase() + result.suggestedType.slice(1)} from Analysis`,
      vendor: 'My Company',
      vendorCode: 'MYCO',
      pluginCode: result.suggestedType
        .slice(0, 4)
        .toUpperCase()
        .padEnd(4, 'X'),
      description: `Plugin generated from audio analysis. Suggested type: ${result.suggestedType}.`,
      version: '1.0.0',
      templateId: null,
      type: result.suggestedType,
      parameters,
      formats: ['VST3', 'AU', 'Standalone'],
    });

    navigate(`/designer?project=${project.id}`);
  }

  const stats = result
    ? [
        { label: 'Sample Rate', value: `${result.sampleRate} Hz` },
        { label: 'Duration', value: `${result.duration.toFixed(2)}s` },
        { label: 'Channels', value: String(result.channels) },
        {
          label: 'RMS Level',
          value: `${(20 * Math.log10(result.rms || 0.0001)).toFixed(1)} dB`,
        },
        {
          label: 'Peak Level',
          value: `${(20 * Math.log10(result.peak || 0.0001)).toFixed(1)} dB`,
        },
        {
          label: 'Spectral Centroid',
          value: `${result.spectralCentroid.toFixed(0)} Hz`,
        },
        {
          label: 'Spectral Rolloff',
          value: `${result.spectralRolloff.toFixed(0)} Hz`,
        },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400">
            <AudioWaveformIcon className="w-5 h-5" />
          </div>
          Audio Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload audio to analyze its characteristics and generate a matching
          plugin
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl min-h-[200px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.aiff,.flac"
          className="hidden"
          onChange={handleInputChange}
        />

        {file ? (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted">
            <AudioWaveformIcon className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setResult(null);
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-medium">Drop audio files here</p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground">
              Supports WAV, MP3, AIFF, FLAC
            </p>
          </>
        )}
      </div>

      {/* Analyze Button */}
      {file && !result && (
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <AudioWaveformIcon className="w-4 h-4 mr-2" />
              Analyze
            </>
          )}
        </Button>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Waveform</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={waveformCanvasRef}
                  className="w-full h-48 rounded-lg"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Frequency Spectrum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={spectrumCanvasRef}
                  className="w-full h-48 rounded-lg"
                />
              </CardContent>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-medium mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground">Suggested Type</p>
                <div className="mt-1">
                  <Badge variant="secondary">{result.suggestedType}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggested Parameters */}
          {result.suggestedParameters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Suggested Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.suggestedParameters.map((param, i) => (
                    <div
                      key={param.id || i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {param.label || param.name || `Parameter ${i + 1}`}
                        </p>
                        {param.name && (
                          <p className="text-xs text-muted-foreground">
                            {param.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {param.type && (
                          <Badge variant="outline">{param.type}</Badge>
                        )}
                        {param.defaultValue !== undefined && (
                          <span className="text-foreground">
                            Default: {param.defaultValue}
                            {param.unit ? ` ${param.unit}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Plugin Button */}
          <Button onClick={handleCreatePlugin} className="w-full" size="lg">
            Create Plugin from Analysis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
