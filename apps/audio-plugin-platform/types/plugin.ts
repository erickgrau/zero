export type PluginType =
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'delay'
  | 'synth'
  | 'distortion'
  | 'chorus'
  | 'phaser';

export type ParameterType = 'float' | 'int' | 'bool' | 'choice';

export interface PluginParameter {
  id: string;
  name: string;
  label: string;
  type: ParameterType;
  min?: number;
  max?: number;
  defaultValue: number;
  step?: number;
  unit?: string;
  choices?: string[];
}

export interface PluginTemplate {
  id: string;
  name: string;
  type: PluginType;
  description: string;
  icon: string;
  tags: string[];
  parameters: PluginParameter[];
  inspirations?: string[];
}

export interface PluginProject {
  id: string;
  name: string;
  vendor: string;
  vendorCode: string;
  pluginCode: string;
  description: string;
  version: string;
  templateId: string | null;
  type: PluginType;
  parameters: PluginParameter[];
  formats: PluginFormat[];
  createdAt: string;
  updatedAt: string;
}

export type PluginFormat = 'VST3' | 'AU' | 'Standalone';

export interface AudioAnalysisResult {
  sampleRate: number;
  duration: number;
  channels: number;
  rms: number;
  peak: number;
  spectralCentroid: number;
  spectralRolloff: number;
  frequencyBands: { frequency: number; magnitude: number }[];
  suggestedType: PluginType;
  suggestedParameters: Partial<PluginParameter>[];
  waveformData: number[];
}

export interface AIGenerationRequest {
  description: string;
  apiKey: string;
  model?: string;
}

export interface AIGenerationResult {
  name: string;
  type: PluginType;
  description: string;
  parameters: PluginParameter[];
}
