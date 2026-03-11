import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeDescription, type AIPluginSuggestion } from "@/lib/ai-describer";
import type { PluginCategory } from "@/types/plugin";

const examplePrompts = [
  "I need a warm vintage equalizer for mastering with gentle analog curves",
  "Build me a vocal compressor with smooth optical compression like an LA-2A",
  "Create a lush plate reverb with modulated tails for ambient music",
  "I want a tape delay with wow and flutter like a Space Echo",
  "Design a tube saturation plugin that adds harmonics and warmth",
  "Make a Juno-style analog chorus with multiple voices for wide stereo",
  "I need a subtractive synth with dual oscillators and a resonant filter",
  "Create a sample player that can load WAV files and play them chromatically",
];

export default function AIDesigner() {
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState<AIPluginSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (!prompt.trim()) return;
    setIsAnalyzing(true);
    // Simulate AI processing time
    setTimeout(() => {
      const result = analyzeDescription(prompt);
      setSuggestion(result);
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleUseDesign = () => {
    if (!suggestion) return;
    const templateId = suggestion.suggestedTemplateId;
    const params = new URLSearchParams();
    if (templateId) params.set("template", templateId);
    params.set("name", suggestion.name);
    params.set("ai", "true");
    params.set("aiDescription", suggestion.designNotes);
    navigate(`/build?${params.toString()}`);
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">AI Plugin Designer</h1>
        <p className="text-lg text-surface-400 max-w-2xl">
          Describe the plugin you want to create in plain English. Our AI will analyze your
          description and generate a complete plugin design with parameters, DSP architecture,
          and build-ready code.
        </p>
      </div>

      {/* Prompt input */}
      <div className="glass-panel glow-border p-6 mb-8">
        <label className="text-sm font-medium text-surface-300 block mb-3">
          Describe your dream plugin
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., I want a warm analog compressor with optical character for vocals..."
          className="input-field min-h-[120px] resize-y mb-4"
          rows={4}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-500">
            Be specific about the sound character, use case, and features you want.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={!prompt.trim() || isAnalyzing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Analyze & Design
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      {!suggestion && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-surface-400 mb-3">Try an example:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {examplePrompts.map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="text-left p-3 rounded-xl bg-surface-800/30 hover:bg-surface-800/60 text-sm text-surface-300 hover:text-white transition-all border border-surface-700/30 hover:border-surface-600/50"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Result */}
      {suggestion && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="tag mb-2 inline-block">{suggestion.category}</span>
                <h2 className="text-2xl font-bold text-white">{suggestion.name}</h2>
                <p className="text-surface-400 mt-1">{suggestion.description}</p>
              </div>
              <button onClick={handleUseDesign} className="btn-primary whitespace-nowrap">
                Use This Design
              </button>
            </div>
          </div>

          {/* Parameters preview */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Suggested Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {suggestion.parameters.map((param) => (
                <div key={param.id} className="bg-surface-800/50 rounded-xl p-3">
                  <p className="text-sm font-medium text-white">{param.name}</p>
                  <p className="text-xs text-surface-500 mt-1">
                    {param.min} - {param.max} {param.unit}
                  </p>
                  <p className="text-xs text-brand-400 mt-0.5">Default: {param.defaultValue}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Design notes */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Design Notes</h3>
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-surface-300 font-sans bg-surface-800/50 rounded-xl p-4">
                {suggestion.designNotes}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
