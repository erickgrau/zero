import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  AudioWaveform,
  SlidersHorizontal,
  Gauge,
  Sun,
  Waves,
  Box,
  Disc,
  Clock,
  Piano,
  Flame,
  Repeat,
  Orbit,
  Sliders,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pluginTemplates } from '@/lib/templates';
import { cn } from '@/lib/utils';
import type { PluginTemplate, PluginType } from '@/types/plugin';

// ---------------------------------------------------------------------------
// Map the `icon` string stored on each template to a real Lucide component.
// ---------------------------------------------------------------------------
const iconMap: Record<string, LucideIcon> = {
  AudioWaveform,
  SlidersHorizontal,
  Gauge,
  Sun,
  Waves,
  Box,
  Disc,
  Clock,
  Piano,
  Flame,
  Repeat,
  Orbit,
  Sliders,
};

function resolveIcon(name: string): LucideIcon {
  return iconMap[name] ?? Sliders;
}

// ---------------------------------------------------------------------------
// Category tabs -- "effects" covers distortion, chorus, and phaser.
// ---------------------------------------------------------------------------
type CategoryKey =
  | 'all'
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'delay'
  | 'synth'
  | 'effects';

const categories: { value: CategoryKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'eq', label: 'EQ' },
  { value: 'compressor', label: 'Compressor' },
  { value: 'reverb', label: 'Reverb' },
  { value: 'delay', label: 'Delay' },
  { value: 'synth', label: 'Synth' },
  { value: 'effects', label: 'Effects' },
];

const effectTypes: PluginType[] = ['distortion', 'chorus', 'phaser'];

function matchesCategory(
  template: PluginTemplate,
  category: CategoryKey,
): boolean {
  if (category === 'all') return true;
  if (category === 'effects') return effectTypes.includes(template.type);
  return template.type === category;
}

function matchesSearch(template: PluginTemplate, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  return (
    template.name.toLowerCase().includes(lower) ||
    template.description.toLowerCase().includes(lower) ||
    template.tags.some((tag) => tag.toLowerCase().includes(lower))
  );
}

// ---------------------------------------------------------------------------
// Friendly display label for a PluginType value.
// ---------------------------------------------------------------------------
const typeLabels: Record<PluginType, string> = {
  eq: 'EQ',
  compressor: 'Compressor',
  reverb: 'Reverb',
  delay: 'Delay',
  synth: 'Synth',
  distortion: 'Distortion',
  chorus: 'Chorus',
  phaser: 'Phaser',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function TemplatesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');

  const filtered = useMemo(
    () =>
      pluginTemplates.filter(
        (t) => matchesCategory(t, category) && matchesSearch(t, search),
      ),
    [category, search],
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Page heading */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Template Library</h1>
        <p className="text-muted-foreground">
          Browse proven plugin architectures and start building in seconds.
        </p>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs
          value={category}
          onValueChange={(v) => setCategory(v as CategoryKey)}
        >
          <TabsList className="flex-wrap">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No templates found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((template) => {
            const Icon = resolveIcon(template.icon);
            return (
              <Card
                key={template.id}
                className="flex flex-col hover:border-primary/50 transition-colors"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        'inline-flex items-center justify-center w-10 h-10 rounded-lg',
                        'bg-primary/10 text-primary shrink-0',
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary">
                      {typeLabels[template.type]}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {template.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Inspirations */}
                  {template.inspirations && template.inspirations.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Inspired by:
                      </span>{' '}
                      {template.inspirations.join(', ')}
                    </p>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() =>
                      navigate(`/designer?template=${template.id}`)
                    }
                  >
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
