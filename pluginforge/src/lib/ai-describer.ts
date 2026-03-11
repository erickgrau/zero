import type { PluginCategory, PluginParameter } from "@/types/plugin";
import { pluginTemplates } from "./templates";

const pluginKnowledge: Record<string, string[]> = {
  EQ: [
    "parametric bands with Q control",
    "shelf filters for low and high end",
    "graphic EQ with fixed frequency bands",
    "dynamic EQ that responds to input level",
    "linear-phase processing for mastering",
    "analog-modeled saturation on each band",
    "mid/side EQ processing",
  ],
  Compressor: [
    "VCA-style fast compression",
    "optical compression with smooth character",
    "FET compression for aggressive punch",
    "variable-mu tube compression",
    "multiband compression",
    "parallel compression (mix control)",
    "sidechain filtering",
    "program-dependent attack/release",
  ],
  Reverb: [
    "algorithmic reverb engine",
    "convolution-based impulse response reverb",
    "plate reverb emulation",
    "spring reverb emulation",
    "hall and room simulations",
    "shimmer reverb with pitch shifting",
    "gated reverb effect",
    "modulated reverb tails",
  ],
  Delay: [
    "tape delay with degradation",
    "ping-pong stereo delay",
    "multi-tap delay patterns",
    "tempo-synced delay times",
    "reverse delay effect",
    "granular delay processing",
    "ducking delay (sidechained)",
    "lo-fi delay with bit reduction",
  ],
  Distortion: [
    "tube amp modeling",
    "soft clipping saturation",
    "hard clipping distortion",
    "waveshaping with custom curves",
    "fuzz pedal emulation",
    "bit-crushing and sample rate reduction",
    "tape saturation modeling",
    "multi-stage gain staging",
  ],
  Chorus: [
    "BBD analog chorus emulation",
    "multi-voice chorus",
    "stereo widening",
    "flanger mode",
    "ensemble effect",
    "dimension-style chorus",
    "through-zero flanging",
  ],
  Synthesizer: [
    "dual oscillators with multiple waveforms",
    "wavetable synthesis",
    "FM synthesis",
    "subtractive synthesis with resonant filter",
    "unison and detuning",
    "LFO modulation routing",
    "polyphonic voicing",
    "arpeggiator",
  ],
  Sampler: [
    "multi-sample mapping",
    "pitch shifting and time stretching",
    "loop points with crossfade",
    "velocity layers",
    "round-robin sample switching",
    "granular sample playback",
    "chromatic keyboard mapping",
    "drag-and-drop sample loading",
  ],
  Filter: [
    "state-variable filter design",
    "ladder filter emulation",
    "comb filtering",
    "formant filtering",
    "envelope follower modulation",
    "LFO-modulated cutoff",
    "parallel filter chains",
    "morphing between filter types",
  ],
  Utility: [
    "stereo width control",
    "mid/side encoding/decoding",
    "gain and metering",
    "phase correlation display",
    "spectrum analyzer",
    "loudness metering (LUFS)",
    "channel routing",
    "mono compatibility check",
  ],
};

export interface AIPluginSuggestion {
  name: string;
  category: PluginCategory;
  description: string;
  parameters: PluginParameter[];
  designNotes: string;
  suggestedTemplateId: string | null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function analyzeDescription(prompt: string): AIPluginSuggestion {
  const lower = prompt.toLowerCase();

  // Detect category from keywords
  let detectedCategory: PluginCategory = "EQ";
  const categoryKeywords: Record<PluginCategory, string[]> = {
    EQ: ["eq", "equaliz", "tone", "frequency", "pultec", "parametric", "shelf", "bass boost", "treble"],
    Compressor: ["compress", "dynamic", "limiter", "squash", "punch", "la-2a", "1176", "opto", "vca"],
    Reverb: ["reverb", "space", "room", "hall", "plate", "spring", "ambient", "echo chamber"],
    Delay: ["delay", "echo", "repeat", "tape echo", "ping pong", "slapback"],
    Distortion: ["distort", "saturat", "overdrive", "fuzz", "clip", "tube", "warm", "grit", "crunch", "drive"],
    Chorus: ["chorus", "flang", "ensemble", "widen", "thick", "juno", "dimension"],
    Synthesizer: ["synth", "oscillat", "waveform", "lead", "bass synth", "pad", "arpeg"],
    Sampler: ["sampl", "drum", "loop", "playback", "one-shot", "instrument", "rompler"],
    Filter: ["filter", "wah", "sweep", "resonan", "cutoff", "formant"],
    Utility: ["stereo", "meter", "gain", "utility", "phase", "mid side", "loud", "analyz"],
  };

  let maxScore = 0;
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = cat as PluginCategory;
    }
  }

  // Find closest template
  const matchingTemplates = pluginTemplates.filter((t) => t.category === detectedCategory);
  const suggestedTemplate = matchingTemplates.length > 0 ? matchingTemplates[0] : null;

  // Generate a name from the prompt
  const nameWords = prompt
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);
  const generatedName =
    nameWords.length > 0
      ? nameWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
      : `Custom ${detectedCategory}`;

  // Generate parameters based on category
  const parameters: PluginParameter[] = suggestedTemplate
    ? suggestedTemplate.parameters
    : generateDefaultParameters(detectedCategory);

  // Build design notes
  const features = pluginKnowledge[detectedCategory] || [];
  const relevantFeatures = features.filter((f) => {
    const fWords = f.toLowerCase().split(/\s+/);
    return fWords.some((w) => lower.includes(w));
  });
  const selectedFeatures = relevantFeatures.length > 0 ? relevantFeatures : features.slice(0, 3);

  const designNotes = `## AI Design Analysis

**Detected Category:** ${detectedCategory}
**User Intent:** "${prompt}"

### Recommended Features
${selectedFeatures.map((f) => `- ${f}`).join("\n")}

### Technical Approach
This plugin uses ${detectedCategory.toLowerCase()} processing techniques. The DSP architecture is based on ${
    suggestedTemplate ? `the "${suggestedTemplate.name}" template` : "a custom design"
  } with parameters optimized for the described use case.

### Signal Flow
1. Input stage with gain staging
2. Main ${detectedCategory.toLowerCase()} processing
3. Output stage with mix control

### Suggested Improvements
- Add a visual display for real-time feedback
- Consider adding preset management
- Add oversampling for higher quality at high gain settings`;

  return {
    name: generatedName,
    category: detectedCategory,
    description: `AI-designed ${detectedCategory.toLowerCase()} plugin: ${prompt}`,
    parameters,
    designNotes,
    suggestedTemplateId: suggestedTemplate?.id ?? null,
  };
}

function generateDefaultParameters(category: PluginCategory): PluginParameter[] {
  const common: PluginParameter[] = [
    { id: "input_gain", name: "Input Gain", label: "Input", min: -24, max: 24, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
    { id: "output_gain", name: "Output Gain", label: "Output", min: -24, max: 24, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
    { id: "mix", name: "Dry/Wet", label: "Mix", min: 0, max: 100, defaultValue: 100, step: 1, unit: "%", type: "knob" },
  ];

  const categorySpecific: Record<string, PluginParameter[]> = {
    EQ: [
      { id: "freq", name: "Frequency", label: "Freq", min: 20, max: 20000, defaultValue: 1000, step: 1, unit: "Hz", type: "knob" },
      { id: "gain_band", name: "Band Gain", label: "Gain", min: -15, max: 15, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
      { id: "q", name: "Q Factor", label: "Q", min: 0.1, max: 20, defaultValue: 1.0, step: 0.1, unit: "", type: "knob" },
    ],
    Compressor: [
      { id: "threshold", name: "Threshold", label: "Thresh", min: -60, max: 0, defaultValue: -20, step: 0.5, unit: "dB", type: "knob" },
      { id: "ratio", name: "Ratio", label: "Ratio", min: 1, max: 20, defaultValue: 4, step: 0.1, unit: ":1", type: "knob" },
      { id: "attack", name: "Attack", label: "Attack", min: 0.1, max: 100, defaultValue: 10, step: 0.1, unit: "ms", type: "knob" },
      { id: "release", name: "Release", label: "Release", min: 10, max: 1000, defaultValue: 100, step: 1, unit: "ms", type: "knob" },
    ],
  };

  return [...(categorySpecific[category] || []), ...common];
}

export function analyzeAudioSample(
  sampleRate: number,
  duration: number,
  channels: number,
  waveformData: number[],
): string {
  const peakLevel = Math.max(...waveformData.map(Math.abs));
  const rmsLevel = Math.sqrt(waveformData.reduce((sum, v) => sum + v * v, 0) / waveformData.length);
  const crestFactor = peakLevel / (rmsLevel || 0.001);
  const dynamicRange = 20 * Math.log10(peakLevel / (rmsLevel || 0.001));

  // Simple zero-crossing rate for brightness estimation
  let zeroCrossings = 0;
  for (let i = 1; i < waveformData.length; i++) {
    if ((waveformData[i] >= 0 && waveformData[i - 1] < 0) ||
        (waveformData[i] < 0 && waveformData[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  const zcRate = zeroCrossings / duration;
  const brightness = zcRate > 5000 ? "bright" : zcRate > 2000 ? "moderate" : "dark";

  return `## Audio Sample Analysis

**File Properties:**
- Sample Rate: ${sampleRate} Hz
- Duration: ${duration.toFixed(2)}s
- Channels: ${channels === 1 ? "Mono" : "Stereo"}

**Level Analysis:**
- Peak Level: ${(20 * Math.log10(peakLevel || 0.001)).toFixed(1)} dBFS
- RMS Level: ${(20 * Math.log10(rmsLevel || 0.001)).toFixed(1)} dBFS
- Crest Factor: ${crestFactor.toFixed(1)} (${crestFactor > 10 ? "very dynamic" : crestFactor > 4 ? "dynamic" : "compressed"})
- Dynamic Range: ${dynamicRange.toFixed(1)} dB

**Tonal Character:**
- Estimated brightness: ${brightness}
- Zero-crossing rate: ${zcRate.toFixed(0)} Hz

**Recommendations:**
${brightness === "bright" ? "- Consider a low-pass filter or warm saturation to tame brightness" : ""}
${brightness === "dark" ? "- Consider a high shelf boost or exciter for presence" : ""}
${crestFactor > 10 ? "- High dynamic range - compression may help for consistency" : ""}
${crestFactor < 4 ? "- Already compressed - use gentle EQ rather than more compression" : ""}
- Sample is suitable for use as a ${duration < 0.5 ? "one-shot / hit" : duration < 2 ? "short loop / phrase" : "longer sample / ambient texture"}
`;
}
