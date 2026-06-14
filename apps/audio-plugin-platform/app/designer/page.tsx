import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { Download, Save, Plus, X, Settings, Sliders } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTemplateById } from '@/lib/templates';
import { usePluginStore } from '@/lib/store';
import { downloadProject } from '@/lib/codegen/download';
import { cn } from '@/lib/utils';
import type {
  PluginProject,
  PluginParameter,
  ParameterType,
  PluginFormat,
  PluginType,
} from '@/types/plugin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generatePluginCode(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
}

function generateVendorCode(vendor: string): string {
  return vendor
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
}

function createEmptyProject(): PluginProject {
  return {
    id: crypto.randomUUID(),
    name: 'My Plugin',
    vendor: 'My Company',
    vendorCode: 'MYCO',
    pluginCode: 'MYPL',
    description: '',
    version: '1.0.0',
    templateId: null,
    type: 'eq' as PluginType,
    parameters: [],
    formats: ['VST3', 'AU', 'Standalone'] as PluginFormat[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createEmptyParameter(): PluginParameter {
  return {
    id: crypto.randomUUID(),
    name: 'newParam',
    label: 'New Parameter',
    type: 'float',
    min: 0,
    max: 1,
    defaultValue: 0.5,
    step: 0.01,
    unit: '',
  };
}

const allFormats: PluginFormat[] = ['VST3', 'AU', 'Standalone'];

const parameterTypes: { value: ParameterType; label: string }[] = [
  { value: 'float', label: 'Float' },
  { value: 'int', label: 'Integer' },
  { value: 'bool', label: 'Boolean' },
  { value: 'choice', label: 'Choice' },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function DesignerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const store = usePluginStore();

  const [project, setProject] = useState<PluginProject>(createEmptyProject);
  const [initialized, setInitialized] = useState(false);

  // On mount, seed from template if the URL has a ?template= param.
  useEffect(() => {
    if (initialized) return;
    const templateId = searchParams.get('template');
    if (templateId) {
      const tpl = getTemplateById(templateId);
      if (tpl) {
        const now = new Date().toISOString();
        setProject({
          id: crypto.randomUUID(),
          name: tpl.name,
          vendor: 'My Company',
          vendorCode: generateVendorCode('My Company'),
          pluginCode: generatePluginCode(tpl.name),
          description: tpl.description,
          version: '1.0.0',
          templateId: tpl.id,
          type: tpl.type,
          parameters: structuredClone(tpl.parameters),
          formats: ['VST3', 'AU', 'Standalone'],
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    setInitialized(true);
  }, [searchParams, initialized]);

  // ----- Project field updaters -----
  const updateField = useCallback(
    <K extends keyof PluginProject>(key: K, value: PluginProject[K]) => {
      setProject((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleFormat = useCallback((format: PluginFormat) => {
    setProject((prev) => {
      const has = prev.formats.includes(format);
      const next = has
        ? prev.formats.filter((f) => f !== format)
        : [...prev.formats, format];
      // Prevent deselecting all formats
      return { ...prev, formats: next.length > 0 ? next : prev.formats };
    });
  }, []);

  // ----- Parameter CRUD -----
  const addParameter = useCallback(() => {
    setProject((prev) => ({
      ...prev,
      parameters: [...prev.parameters, createEmptyParameter()],
    }));
  }, []);

  const updateParameter = useCallback(
    (paramId: string, updates: Partial<PluginParameter>) => {
      setProject((prev) => ({
        ...prev,
        parameters: prev.parameters.map((p) =>
          p.id === paramId ? { ...p, ...updates } : p,
        ),
      }));
    },
    [],
  );

  const removeParameter = useCallback((paramId: string) => {
    setProject((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((p) => p.id !== paramId),
    }));
  }, []);

  // ----- Actions -----
  const handleSave = useCallback(() => {
    store.createProject({
      name: project.name,
      vendor: project.vendor,
      vendorCode: project.vendorCode,
      pluginCode: project.pluginCode,
      description: project.description,
      version: project.version,
      templateId: project.templateId,
      type: project.type,
      parameters: project.parameters,
      formats: project.formats,
    });
  }, [project, store]);

  const handleDownload = useCallback(async () => {
    await downloadProject(project);
  }, [project]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Plugin Designer
          </h1>
          <p className="text-muted-foreground">
            Configure your plugin and export a JUCE project.
          </p>
        </div>
        <Link to="/templates">
          <Button variant="outline" size="sm">
            Back to Templates
          </Button>
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ---- Left sidebar ---- */}
        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          {/* Plugin info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plugin Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={project.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Vendor</label>
                <Input
                  value={project.vendor}
                  onChange={(e) => updateField('vendor', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  rows={3}
                  value={project.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe your plugin..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Version</label>
                <Input
                  value={project.version}
                  onChange={(e) => updateField('version', e.target.value)}
                  placeholder="1.0.0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Format selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allFormats.map((fmt) => {
                const active = project.formats.includes(fmt);
                return (
                  <label
                    key={fmt}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleFormat(fmt)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm">{fmt}</span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save to Library
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download JUCE Project
            </Button>
          </div>
        </aside>

        {/* ---- Right column: Parameters ---- */}
        <section className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sliders className="h-5 w-5 text-muted-foreground" />
              Parameters
            </h2>
            <Button variant="outline" size="sm" onClick={addParameter}>
              <Plus className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          </div>

          {project.parameters.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Sliders className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No parameters yet. Click "Add Parameter" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {project.parameters.map((param) => (
                <ParameterCard
                  key={param.id}
                  param={param}
                  onUpdate={updateParameter}
                  onRemove={removeParameter}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parameter editor card
// ---------------------------------------------------------------------------
interface ParameterCardProps {
  param: PluginParameter;
  onUpdate: (id: string, updates: Partial<PluginParameter>) => void;
  onRemove: (id: string) => void;
}

function ParameterCard({ param, onUpdate, onRemove }: ParameterCardProps) {
  const showNumericFields = param.type === 'float' || param.type === 'int';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-sm font-medium truncate">
          {param.label || 'Untitled'}
        </CardTitle>
        <Button
          variant="destructive"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onRemove(param.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={param.name}
              onChange={(e) => onUpdate(param.id, { name: e.target.value })}
            />
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Label
            </label>
            <Input
              value={param.label}
              onChange={(e) => onUpdate(param.id, { label: e.target.value })}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Type
            </label>
            <Select
              value={param.type}
              onValueChange={(v) =>
                onUpdate(param.id, { type: v as ParameterType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parameterTypes.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Numeric fields: min, max, default */}
          {showNumericFields && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Min
                </label>
                <Input
                  type="number"
                  value={param.min ?? 0}
                  onChange={(e) =>
                    onUpdate(param.id, {
                      min: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Max
                </label>
                <Input
                  type="number"
                  value={param.max ?? 1}
                  onChange={(e) =>
                    onUpdate(param.id, {
                      max: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Default
                </label>
                <Input
                  type="number"
                  value={param.defaultValue}
                  onChange={(e) =>
                    onUpdate(param.id, {
                      defaultValue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </>
          )}

          {/* Float-only: step */}
          {param.type === 'float' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Step
              </label>
              <Input
                type="number"
                value={param.step ?? 0.01}
                onChange={(e) =>
                  onUpdate(param.id, {
                    step: parseFloat(e.target.value) || 0.01,
                  })
                }
              />
            </div>
          )}

          {/* Unit (optional, shown for all types) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Unit
            </label>
            <Input
              placeholder="e.g. dB, Hz, %"
              value={param.unit ?? ''}
              onChange={(e) => onUpdate(param.id, { unit: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
