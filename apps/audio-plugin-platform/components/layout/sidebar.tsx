import { Link, useLocation } from 'react-router';
import {
  Home,
  LayoutGrid,
  Sparkles,
  AudioWaveform,
  Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/templates', label: 'Templates', icon: LayoutGrid },
  { to: '/ai', label: 'AI Generate', icon: Sparkles },
  { to: '/analyze', label: 'Audio Analyze', icon: AudioWaveform },
  { to: '/library', label: 'My Library', icon: Library },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <AudioWaveform className="h-7 w-7 text-sidebar-primary" />
        <span className="text-xl font-bold tracking-tight">PluginForge</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}
