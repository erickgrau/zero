import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generatePluginFromDescription } from '@/lib/ai/generate';
import { Sparkles, Loader2, ArrowRight, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePluginStore } from '@/lib/store';
import type { AIGenerationResult } from '@/types/plugin';

const examplePrompts = [
  {
    title: 'Vintage Tube Compressor',
    description:
      'A warm vintage tube compressor with slow optical-style response, inspired by the LA-2A',
  },
  {
    title: 'Stereo Chorus',
    description:
      'A lush stereo chorus with deep modulation, adjustable spread, and analog warmth',
  },
  {
    title: 'Parametric EQ',
    description:
      'A 4-band parametric EQ with surgical precision, high-pass and low-pass filters',
  },
  {
    title: 'Tape Delay',
    description:
      'A tape delay with authentic wow and flutter, saturation, and tempo sync',
  },
];

export default function AIPage() {
  const navigate = useNavigate();
  const createProject = usePluginStore((s) => s.createProject);

  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('pluginforge-api-key') || '',
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AIGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    localStorage.setItem('pluginforge-api-key', value);
  }

  async function handleGenerate() {
    if (!description.trim() || !apiKey.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const generated = await generatePluginFromDescription({
        description,
        apiKey,
      });
      setResult(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleOpenInDesigner() {
    if (!result) return;

    sessionStorage.setItem('ai-generated-plugin', JSON.stringify(result));

    const project = createProject({
      name: result.name,
      vendor: 'My Company',
      vendorCode: 'MYCO',
      pluginCode: result.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase()
        .padEnd(4, 'X'),
      description: result.description,
      version: '1.0.0',
      templateId: null,
      type: result.type,
      parameters: result.parameters,
      formats: ['VST3', 'AU', 'Standalone'],
    });

    navigate(`/designer?project=${project.id}`);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          AI Plugin Generator
        </h1>
        <p className="text-muted-foreground">
          Describe your dream plugin and let AI design it for you
        </p>
      </div>

      {/* API Key */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <Label htmlFor="api-key" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Anthropic API Key
          </Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your key is stored locally and never sent to our servers
          </p>
        </CardContent>
      </Card>

      {/* Description Input */}
      <div className="space-y-4">
        <Textarea
          className="min-h-[150px] resize-y"
          placeholder="Describe the audio plugin you want to create..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Button
          onClick={handleGenerate}
          disabled={!description.trim() || !apiKey.trim() || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Plugin
            </>
          )}
        </Button>
      </div>

      {/* Example Prompts */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Example prompts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examplePrompts.map((example) => (
            <Card
              key={example.title}
              className={cn(
                'cursor-pointer hover:border-primary/50 transition-colors',
                description === example.description && 'border-primary',
              )}
              onClick={() => setDescription(example.description)}
            >
              <CardContent className="p-4">
                <p className="text-sm font-medium">{example.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {example.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{result.name}</CardTitle>
                <Badge variant="secondary">{result.type}</Badge>
              </div>
              <Button onClick={handleOpenInDesigner}>
                Open in Designer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <CardDescription className="pt-2">
              {result.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-medium mb-3">Parameters</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {result.parameters.map((param) => (
                  <div
                    key={param.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{param.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {param.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline">{param.type}</Badge>
                      {param.min !== undefined && param.max !== undefined && (
                        <span>
                          {param.min} - {param.max}
                          {param.unit ? ` ${param.unit}` : ''}
                        </span>
                      )}
                      <span className="text-foreground">
                        Default: {param.defaultValue}
                        {param.unit ? ` ${param.unit}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
