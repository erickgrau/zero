export type PluginFormat = "AU" | "VST3" | "AU+VST3";

export type PluginCategory =
  | "EQ"
  | "Compressor"
  | "Reverb"
  | "Delay"
  | "Distortion"
  | "Chorus"
  | "Synthesizer"
  | "Sampler"
  | "Filter"
  | "Utility";

export interface PluginParameter {
  id: string;
  name: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  step: number;
  unit: string;
  type: "knob" | "slider" | "toggle" | "select";
}

export interface PluginTemplate {
  id: string;
  name: string;
  category: PluginCategory;
  description: string;
  icon: string;
  parameters: PluginParameter[];
  tags: string[];
  popularity: number;
  inspirationUrl?: string;
  dspCode: string;
  previewImage?: string;
}

export interface PluginProject {
  id: string;
  name: string;
  pluginCode: string;
  manufacturer: string;
  description: string;
  category: PluginCategory;
  format: PluginFormat;
  parameters: PluginParameter[];
  templateId: string | null;
  sampleFile: AudioSampleFile | null;
  aiDescription: string;
  createdAt: Date;
}

export interface AudioSampleFile {
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  channels: number;
  waveformData: number[];
  arrayBuffer: ArrayBuffer;
}

export interface AIDescriptionRequest {
  prompt: string;
  category?: PluginCategory;
  referencePlugin?: string;
}

export interface GeneratedPluginFiles {
  projectName: string;
  files: { path: string; content: string }[];
}
