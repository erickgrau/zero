import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { PluginProject } from "@/types/plugin";

export default function MyPlugins() {
  const [projects, setProjects] = useState<PluginProject[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("pluginforge_projects") || "[]");
    setProjects(saved);
  }, []);

  const deleteProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem("pluginforge_projects", JSON.stringify(updated));
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">My Plugins</h1>
        <p className="text-lg text-surface-400">
          Your saved plugin projects. Click to rebuild or download again.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 text-surface-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="text-surface-500 text-lg mb-4">No saved plugins yet.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate("/")} className="btn-primary">
              Browse Templates
            </button>
            <button onClick={() => navigate("/build")} className="btn-secondary">
              Build Custom
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="plugin-card">
              <div className="flex items-start justify-between mb-3">
                <span className="tag">{project.category}</span>
                <span className="text-xs text-surface-500">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
              <p className="text-sm text-surface-400 mb-4 line-clamp-2">{project.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-xs bg-surface-800 text-surface-400 px-2 py-1 rounded-full">
                    {project.format}
                  </span>
                  <span className="text-xs bg-surface-800 text-surface-400 px-2 py-1 rounded-full">
                    {project.parameters.length} params
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/build?template=${project.templateId || ""}&name=${encodeURIComponent(project.name)}`)}
                    className="btn-ghost text-xs"
                  >
                    Rebuild
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="btn-ghost text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
