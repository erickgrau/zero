import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { usePluginStore } from '@/lib/store';
import { downloadProject } from '@/lib/codegen/download';
import {
  Search,
  Plus,
  Copy,
  Download,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const projects = usePluginStore((s) => s.projects);
  const deleteProject = usePluginStore((s) => s.deleteProject);
  const duplicateProject = usePluginStore((s) => s.duplicateProject);

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = projects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.vendor.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query)
    );
  });

  function handleDelete(id: string) {
    deleteProject(id);
    setDeleteConfirmId(null);
  }

  const isEmpty = projects.length === 0 && !searchQuery.trim();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Library</h1>
          <p className="text-muted-foreground">Manage your plugin projects</p>
        </div>
        <Button asChild>
          <Link to="/designer">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Search */}
      {!isEmpty && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2">No projects yet</CardTitle>
          <CardDescription className="mb-6">
            Create your first plugin from a template or using AI
          </CardDescription>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to="/templates">Browse Templates</Link>
            </Button>
            <Button asChild>
              <Link to="/ai">AI Generate</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* No Search Results */}
      {!isEmpty && filtered.length === 0 && searchQuery.trim() && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No projects match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}

      {/* Project Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant="secondary">{project.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {project.vendor}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {project.formats.map((format) => (
                    <Badge key={format} variant="outline" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Created {formatDate(project.createdAt)}</p>
                  <p>Modified {formatDate(project.updatedAt)}</p>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="ghost" size="icon" asChild>
                  <Link to={`/designer?project=${project.id}`}>
                    <FolderOpen className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateProject(project.id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadProject(project)}
                >
                  <Download className="w-4 h-4" />
                </Button>

                <Dialog
                  open={deleteConfirmId === project.id}
                  onOpenChange={(open) =>
                    setDeleteConfirmId(open ? project.id : null)
                  }
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-auto">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you sure?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently
                        delete &ldquo;{project.name}&rdquo; and all of its data.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(project.id)}
                      >
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
