import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { pluginTemplates, categoryDescriptions } from "@/lib/templates";
import type { PluginCategory, PluginTemplate } from "@/types/plugin";

const categories: (PluginCategory | "All")[] = [
  "All", "EQ", "Compressor", "Reverb", "Delay", "Distortion",
  "Chorus", "Synthesizer", "Sampler", "Filter", "Utility",
];

function CategoryIcon({ category }: { category: string }) {
  const iconClass = "w-8 h-8";
  switch (category) {
    case "EQ":
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
    case "Compressor":
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>;
    case "Reverb":
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    case "Delay":
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case "Distortion":
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>;
    case "Synthesizer":
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>;
    default:
      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" /></svg>;
  }
}

function TemplateCard({ template, onClick }: { template: PluginTemplate; onClick: () => void }) {
  return (
    <div className="plugin-card group" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-500/20 transition-colors">
          <CategoryIcon category={template.category} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-surface-500">{template.popularity}% popular</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
      <p className="text-sm text-surface-400 mb-4 line-clamp-2">{template.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <span className="tag">{template.category}</span>
          {template.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-surface-800 text-surface-400">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-surface-500">{template.parameters.length} params</span>
      </div>
    </div>
  );
}

export default function TemplateGallery() {
  const [activeCategory, setActiveCategory] = useState<PluginCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filtered = pluginTemplates.filter((t) => {
    if (activeCategory !== "All" && t.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
      );
    }
    return true;
  });

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">
          Audio Plugin Templates
        </h1>
        <p className="text-lg text-surface-400 max-w-2xl">
          Start with a professional template and customize it. Build universal AU/VST3 plugins
          for Logic Pro, GarageBand, and any macOS DAW.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search templates... (e.g., reverb, vintage, vocal)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              activeCategory === cat
                ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25"
                : "bg-surface-800/50 text-surface-400 hover:text-surface-200 hover:bg-surface-700/50",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Category description */}
      {activeCategory !== "All" && (
        <p className="text-surface-400 mb-6 text-sm">
          {categoryDescriptions[activeCategory]}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => navigate(`/build?template=${template.id}`)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-surface-500 text-lg">No templates match your search.</p>
          <button onClick={() => { setSearchQuery(""); setActiveCategory("All"); }} className="btn-ghost mt-4">
            Clear filters
          </button>
        </div>
      )}

      {/* CTA for AI */}
      <div className="mt-12 glass-panel glow-border p-8 text-center">
        <h3 className="text-xl font-semibold text-white mb-2">
          Can't find what you need?
        </h3>
        <p className="text-surface-400 mb-4">
          Describe your dream plugin and let AI design it for you.
        </p>
        <button onClick={() => navigate("/ai")} className="btn-primary">
          Try AI Plugin Designer
        </button>
      </div>
    </div>
  );
}
