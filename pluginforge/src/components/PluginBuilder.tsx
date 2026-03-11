import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getTemplateById } from "@/lib/templates";
import type { PluginProject, PluginFormat, PluginCategory, PluginParameter, AudioSampleFile } from "@/types/plugin";
import ParameterEditor from "./ParameterEditor";
import AudioUploader from "./AudioUploader";
import DownloadManager from "./DownloadManager";

const formatOptions: { value: PluginFormat; label: string; desc: string }[] = [
  { value: "AU+VST3", label: "AU + VST3 (Universal)", desc: "Works with all macOS DAWs" },
  { value: "AU", label: "Audio Unit (AU)", desc: "Apple Logic Pro & GarageBand" },
  { value: "VST3", label: "VST3", desc: "Ableton, FL Studio, Cubase & more" },
];

export default function PluginBuilder() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template");
  const aiName = searchParams.get("name");
  const isAI = searchParams.get("ai") === "true";
  const aiDescription = searchParams.get("aiDescription") || "";

  const template = templateId ? getTemplateById(templateId) : null;

  const [step, setStep] = useState(1);
  const [name, setName] = useState(aiName || template?.name || "My Plugin");
  const [pluginCode, setPluginCode] = useState("MyPl");
  const [manufacturer, setManufacturer] = useState("PluginForge");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState<PluginCategory>(template?.category || "EQ");
  const [format, setFormat] = useState<PluginFormat>("AU+VST3");
  const [parameters, setParameters] = useState<PluginParameter[]>(template?.parameters || []);
  const [sampleFile, setSampleFile] = useState<AudioSampleFile | null>(null);

  useEffect(() => {
    if (template) {
      setName(aiName || template.name);
      setDescription(template.description);
      setCategory(template.category);
      setParameters(template.parameters);
      setPluginCode(template.id.substring(0, 4).toUpperCase());
    }
  }, [template, aiName]);

  const project: PluginProject = {
    id: crypto.randomUUID(),
    name,
    pluginCode,
    manufacturer,
    description,
    category,
    format,
    parameters,
    templateId: template?.id || null,
    sampleFile,
    aiDescription,
    createdAt: new Date(),
  };

  const saveToLibrary = () => {
    const saved = JSON.parse(localStorage.getItem("pluginforge_projects") || "[]");
    saved.push({ ...project, sampleFile: null }); // Don't store audio buffers
    localStorage.setItem("pluginforge_projects", JSON.stringify(saved));
  };

  const steps = [
    { num: 1, label: "Details" },
    { num: 2, label: "Parameters" },
    { num: 3, label: "Audio" },
    { num: 4, label: "Download" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          {template ? `Building: ${template.name}` : isAI ? "AI-Designed Plugin" : "Build Custom Plugin"}
        </h1>
        <p className="text-lg text-surface-400">
          {template
            ? "Customize the template and download your macOS plugin project."
            : "Configure your plugin from scratch and generate build-ready code."}
        </p>
        {isAI && (
          <div className="mt-3 tag">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI Designed
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              step === s.num
                ? "bg-brand-600 text-white"
                : step > s.num
                  ? "bg-brand-600/20 text-brand-300"
                  : "bg-surface-800/50 text-surface-500"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step > s.num ? "bg-brand-500 text-white" : "bg-surface-700"
            }`}>
              {step > s.num ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : s.num}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Plugin Details */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Plugin Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-surface-400 block mb-1">Plugin Name</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Plugin"
                />
              </div>
              <div>
                <label className="text-sm text-surface-400 block mb-1">Plugin Code (4 chars)</label>
                <input
                  className="input-field font-mono"
                  value={pluginCode}
                  onChange={(e) => setPluginCode(e.target.value.substring(0, 4).toUpperCase())}
                  placeholder="MYPL"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-sm text-surface-400 block mb-1">Manufacturer</label>
                <input
                  className="input-field"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Your Company"
                />
              </div>
              <div>
                <label className="text-sm text-surface-400 block mb-1">Category</label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PluginCategory)}
                >
                  {["EQ", "Compressor", "Reverb", "Delay", "Distortion", "Chorus", "Synthesizer", "Sampler", "Filter", "Utility"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-surface-400 block mb-1">Description</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your plugin does..."
                />
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Plugin Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    format === opt.value
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-surface-700 hover:border-surface-500 bg-surface-800/30"
                  }`}
                >
                  <p className="font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-surface-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="btn-primary">
              Next: Parameters
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Parameters */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <ParameterEditor parameters={parameters} onChange={setParameters} />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(3)} className="btn-primary">Next: Audio Sample</button>
          </div>
        </div>
      )}

      {/* Step 3: Audio Upload */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <AudioUploader onSampleLoaded={setSampleFile} />
            <p className="text-xs text-surface-500 mt-4">
              Optional: Upload an audio sample to include with your plugin.
              For Sampler-type plugins, this will be the default loaded sample.
            </p>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(4)} className="btn-primary">Next: Download</button>
          </div>
        </div>
      )}

      {/* Step 4: Download */}
      {step === 4 && (
        <div className="space-y-6">
          <DownloadManager project={project} />

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
            <button
              onClick={() => {
                saveToLibrary();
                alert("Plugin saved to your library!");
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              Save to Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
