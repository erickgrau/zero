import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PluginProject,
  PluginTemplate,
  PluginFormat,
} from '@/types/plugin';

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

interface PluginStore {
  projects: PluginProject[];
  currentProject: PluginProject | null;

  // Actions
  createProject: (
    project: Omit<PluginProject, 'id' | 'createdAt' | 'updatedAt'>,
  ) => PluginProject;
  updateProject: (id: string, updates: Partial<PluginProject>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => PluginProject | null;
  setCurrentProject: (project: PluginProject | null) => void;
  getProject: (id: string) => PluginProject | undefined;

  // Create from template
  createFromTemplate: (
    template: PluginTemplate,
    name?: string,
  ) => PluginProject;
}

export const usePluginStore = create<PluginStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,

      createProject(projectData) {
        const now = new Date().toISOString();
        const project: PluginProject = {
          ...projectData,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: [...state.projects, project],
          currentProject: project,
        }));

        return project;
      },

      updateProject(id, updates) {
        set((state) => {
          const projects = state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p,
          );

          const currentProject =
            state.currentProject?.id === id
              ? (projects.find((p) => p.id === id) ?? null)
              : state.currentProject;

          return { projects, currentProject };
        });
      },

      deleteProject(id) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        }));
      },

      duplicateProject(id) {
        const { projects } = get();
        const source = projects.find((p) => p.id === id);
        if (!source) return null;

        const now = new Date().toISOString();
        const duplicate: PluginProject = {
          ...structuredClone(source),
          id: crypto.randomUUID(),
          name: `${source.name} (Copy)`,
          pluginCode: generatePluginCode(`${source.name}Copy`),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: [...state.projects, duplicate],
          currentProject: duplicate,
        }));

        return duplicate;
      },

      setCurrentProject(project) {
        set({ currentProject: project });
      },

      getProject(id) {
        return get().projects.find((p) => p.id === id);
      },

      createFromTemplate(template, name) {
        const now = new Date().toISOString();
        const projectName = name || template.name;
        const project: PluginProject = {
          id: crypto.randomUUID(),
          name: projectName,
          vendor: 'My Company',
          vendorCode: generateVendorCode('My Company'),
          pluginCode: generatePluginCode(projectName),
          description: template.description,
          version: '1.0.0',
          templateId: template.id,
          type: template.type,
          parameters: structuredClone(template.parameters),
          formats: ['VST3', 'AU', 'Standalone'] as PluginFormat[],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: [...state.projects, project],
          currentProject: project,
        }));

        return project;
      },
    }),
    {
      name: 'plugin-forge-projects',
      partialize: (state) => ({
        projects: state.projects,
      }),
    },
  ),
);
