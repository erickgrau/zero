import { Link } from 'react-router';
import {
  LayoutGrid,
  Sparkles,
  AudioWaveform,
  Library,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pluginTemplates } from '@/lib/templates';
import { usePluginStore } from '@/lib/store';

const features = [
  {
    title: 'Browse Templates',
    description: 'Start from proven plugin architectures',
    icon: LayoutGrid,
    href: '/templates',
    color: 'bg-purple-500/10 text-purple-400',
  },
  {
    title: 'AI Generate',
    description: 'Describe your plugin, AI builds it',
    icon: Sparkles,
    href: '/ai',
    color: 'bg-blue-500/10 text-blue-400',
  },
  {
    title: 'Audio Analysis',
    description: 'Upload audio, reverse-engineer the sound',
    icon: AudioWaveform,
    href: '/analyze',
    color: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    title: 'My Library',
    description: 'Manage your plugin projects',
    icon: Library,
    href: '/library',
    color: 'bg-amber-500/10 text-amber-400',
  },
] as const;

export default function HomePage() {
  const projects = usePluginStore((s) => s.projects);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12">
      {/* Hero */}
      <section className="text-center py-12 space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            PluginForge
          </span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Create professional AU/VST audio plugins with AI
        </p>
        <p className="max-w-2xl mx-auto text-muted-foreground">
          Pick a template, describe your idea, or upload a reference track. PluginForge
          generates production-ready C++ plugin code you can compile and load into any
          DAW.
        </p>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} to={feature.href} className="group">
              <Card className="h-full p-6 hover:border-primary/50 transition-colors">
                <CardHeader className="p-0 pb-3">
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${feature.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-2">
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                  <span className="inline-flex items-center gap-1 text-sm text-primary mt-2 group-hover:gap-2 transition-all">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 border rounded-xl p-6 bg-card">
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-foreground">
            {pluginTemplates.length}
          </p>
          <p className="text-sm text-muted-foreground">Templates Available</p>
        </div>
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-foreground">{projects.length}</p>
          <p className="text-sm text-muted-foreground">Projects in Library</p>
        </div>
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-foreground">VST3, AU, Standalone</p>
          <p className="text-sm text-muted-foreground">Format Support</p>
        </div>
      </section>
    </div>
  );
}
