import { useState } from "react";
import type { PluginParameter } from "@/types/plugin";

interface ParameterEditorProps {
  parameters: PluginParameter[];
  onChange: (params: PluginParameter[]) => void;
}

function KnobVisual({ param }: { param: PluginParameter }) {
  const range = param.max - param.min;
  const normalized = range > 0 ? ((param.defaultValue - param.min) / range) * 100 : 0;
  const angle = -135 + (normalized / 100) * 270;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background arc */}
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke="#343a40" strokeWidth="6"
            strokeDasharray="188.5 62.8"
            strokeDashoffset="-31.4"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke="#5c7cfa" strokeWidth="6"
            strokeDasharray={`${(normalized / 100) * 188.5} ${251.3 - (normalized / 100) * 188.5}`}
            strokeDashoffset="-31.4"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          {/* Knob body */}
          <circle cx="50" cy="50" r="28" fill="#212529" stroke="#495057" strokeWidth="1.5" />
          {/* Indicator */}
          <line
            x1="50" y1="50"
            x2={50 + 18 * Math.cos((angle * Math.PI) / 180)}
            y2={50 + 18 * Math.sin((angle * Math.PI) / 180)}
            stroke="#5c7cfa" strokeWidth="2.5" strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xs text-surface-300 font-medium">{param.label}</span>
      <span className="text-[10px] text-surface-500">
        {param.defaultValue}{param.unit ? ` ${param.unit}` : ""}
      </span>
    </div>
  );
}

export default function ParameterEditor({ parameters, onChange }: ParameterEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateParam = (id: string, updates: Partial<PluginParameter>) => {
    onChange(parameters.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const addParameter = () => {
    const newParam: PluginParameter = {
      id: `param_${Date.now()}`,
      name: "New Parameter",
      label: "New",
      min: 0,
      max: 100,
      defaultValue: 50,
      step: 1,
      unit: "%",
      type: "knob",
    };
    onChange([...parameters, newParam]);
    setEditingId(newParam.id);
  };

  const removeParameter = (id: string) => {
    onChange(parameters.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Parameters</h3>
        <button onClick={addParameter} className="btn-secondary text-sm">
          + Add Parameter
        </button>
      </div>

      {/* Visual knob preview */}
      <div className="glass-panel p-6 mb-6">
        <p className="text-xs text-surface-500 mb-4 uppercase tracking-wider">Plugin Preview</p>
        <div className="flex flex-wrap gap-6 justify-center">
          {parameters.map((param) => (
            <button
              key={param.id}
              onClick={() => setEditingId(editingId === param.id ? null : param.id)}
              className={`p-2 rounded-xl transition-all ${editingId === param.id ? "bg-brand-500/10 ring-1 ring-brand-500/30" : "hover:bg-surface-800/50"}`}
            >
              <KnobVisual param={param} />
            </button>
          ))}
        </div>
      </div>

      {/* Parameter list */}
      <div className="space-y-2">
        {parameters.map((param) => (
          <div key={param.id}>
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                editingId === param.id ? "bg-surface-800 border border-brand-500/30" : "bg-surface-800/30 hover:bg-surface-800/60"
              }`}
              onClick={() => setEditingId(editingId === param.id ? null : param.id)}
            >
              <div className="flex-1 flex items-center gap-3">
                <span className="text-sm font-mono text-surface-500 w-28 truncate">{param.id}</span>
                <span className="text-sm text-white font-medium">{param.name}</span>
              </div>
              <span className="text-xs text-surface-500">
                {param.min} - {param.max} {param.unit}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeParameter(param.id); }}
                className="text-surface-600 hover:text-red-400 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editingId === param.id && (
              <div className="p-4 bg-surface-800/50 rounded-b-xl border border-t-0 border-surface-700/30 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Name</label>
                  <input
                    className="input-field text-sm py-2"
                    value={param.name}
                    onChange={(e) => updateParam(param.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Label</label>
                  <input
                    className="input-field text-sm py-2"
                    value={param.label}
                    onChange={(e) => updateParam(param.id, { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Min</label>
                  <input
                    type="number"
                    className="input-field text-sm py-2"
                    value={param.min}
                    onChange={(e) => updateParam(param.id, { min: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Max</label>
                  <input
                    type="number"
                    className="input-field text-sm py-2"
                    value={param.max}
                    onChange={(e) => updateParam(param.id, { max: parseFloat(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Default</label>
                  <input
                    type="number"
                    className="input-field text-sm py-2"
                    value={param.defaultValue}
                    onChange={(e) => updateParam(param.id, { defaultValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Step</label>
                  <input
                    type="number"
                    className="input-field text-sm py-2"
                    value={param.step}
                    onChange={(e) => updateParam(param.id, { step: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Unit</label>
                  <input
                    className="input-field text-sm py-2"
                    value={param.unit}
                    onChange={(e) => updateParam(param.id, { unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Type</label>
                  <select
                    className="input-field text-sm py-2"
                    value={param.type}
                    onChange={(e) => updateParam(param.id, { type: e.target.value as PluginParameter["type"] })}
                  >
                    <option value="knob">Knob</option>
                    <option value="slider">Slider</option>
                    <option value="toggle">Toggle</option>
                    <option value="select">Select</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {parameters.length === 0 && (
        <div className="text-center py-8 text-surface-500">
          <p>No parameters yet. Add one to get started.</p>
        </div>
      )}
    </div>
  );
}
