import type { PluginTemplate } from "@/types/plugin";

export const pluginTemplates: PluginTemplate[] = [
  {
    id: "passive-eq",
    name: "Passive EQ",
    category: "EQ",
    description:
      "Vintage passive equalizer inspired by classic Pultec-style hardware. Warm analog-style tone shaping with gentle curves and musical frequency selection.",
    icon: "AudioWaveform",
    tags: ["vintage", "analog", "warm", "mastering", "pultec"],
    popularity: 95,
    inspirationUrl: "https://plugins4free.com/plugin/2468/",
    parameters: [
      { id: "low_freq", name: "Low Frequency", label: "Low Freq", min: 20, max: 300, defaultValue: 100, step: 1, unit: "Hz", type: "knob" },
      { id: "low_boost", name: "Low Boost", label: "Low Boost", min: 0, max: 10, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
      { id: "low_atten", name: "Low Atten", label: "Low Cut", min: 0, max: 10, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
      { id: "high_freq", name: "High Frequency", label: "High Freq", min: 1000, max: 16000, defaultValue: 8000, step: 100, unit: "Hz", type: "knob" },
      { id: "high_boost", name: "High Boost", label: "High Boost", min: 0, max: 10, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
      { id: "high_atten", name: "High Atten", label: "High Cut", min: 0, max: 10, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
      { id: "output", name: "Output Gain", label: "Output", min: -12, max: 12, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
    ],
    dspCode: `// Passive EQ DSP - Pultec-style
// Baxandall shelf filters with resonant boost
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int ch = 0; ch < numChannels; ++ch) {
        for (int i = 0; i < numSamples; ++i) {
            float sample = buffer[ch][i];
            // Low shelf boost/cut
            sample = lowShelfFilter.process(sample, lowFreq, lowBoost - lowAtten);
            // High shelf boost/cut
            sample = highShelfFilter.process(sample, highFreq, highBoost - highAtten);
            // Output gain
            sample *= dBToLinear(outputGain);
            buffer[ch][i] = sample;
        }
    }
}`,
  },
  {
    id: "optical-compressor",
    name: "Optical Compressor",
    category: "Compressor",
    description:
      "Smooth optical compressor modeled after the legendary LA-2A. Features program-dependent attack and release with a warm, musical compression character.",
    icon: "Gauge",
    tags: ["optical", "smooth", "vocal", "LA-2A", "vintage"],
    popularity: 92,
    parameters: [
      { id: "threshold", name: "Threshold", label: "Threshold", min: -60, max: 0, defaultValue: -20, step: 0.5, unit: "dB", type: "knob" },
      { id: "peak_reduction", name: "Peak Reduction", label: "Peak Red.", min: 0, max: 100, defaultValue: 50, step: 1, unit: "%", type: "knob" },
      { id: "gain", name: "Gain", label: "Makeup", min: 0, max: 30, defaultValue: 0, step: 0.5, unit: "dB", type: "knob" },
      { id: "mix", name: "Mix", label: "Mix", min: 0, max: 100, defaultValue: 100, step: 1, unit: "%", type: "knob" },
      { id: "mode", name: "Compress/Limit", label: "Mode", min: 0, max: 1, defaultValue: 0, step: 1, unit: "", type: "toggle" },
    ],
    dspCode: `// Optical Compressor DSP - LA-2A style
// Program-dependent attack/release with optical cell emulation
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        float inputLevel = std::abs(buffer[0][i]);
        // Optical cell response (slow attack, program-dependent release)
        opticalCell = opticalCell + (inputLevel - opticalCell) * opticalSpeed;
        float gainReduction = computeGR(opticalCell, threshold, peakReduction);
        for (int ch = 0; ch < numChannels; ++ch) {
            float dry = buffer[ch][i];
            float wet = dry * gainReduction * makeupGain;
            buffer[ch][i] = dry * (1.0f - mix) + wet * mix;
        }
    }
}`,
  },
  {
    id: "plate-reverb",
    name: "Plate Reverb",
    category: "Reverb",
    description:
      "Lush plate reverb emulation with rich, dense reflections. Perfect for vocals, snares, and adding depth to any mix element.",
    icon: "Waves",
    tags: ["plate", "lush", "vocal", "dense", "classic"],
    popularity: 90,
    parameters: [
      { id: "decay", name: "Decay Time", label: "Decay", min: 0.1, max: 10, defaultValue: 2.5, step: 0.1, unit: "s", type: "knob" },
      { id: "predelay", name: "Pre-Delay", label: "Pre-Delay", min: 0, max: 200, defaultValue: 20, step: 1, unit: "ms", type: "knob" },
      { id: "damping", name: "Damping", label: "Damping", min: 0, max: 100, defaultValue: 50, step: 1, unit: "%", type: "knob" },
      { id: "low_cut", name: "Low Cut", label: "Low Cut", min: 20, max: 500, defaultValue: 80, step: 1, unit: "Hz", type: "knob" },
      { id: "high_cut", name: "High Cut", label: "High Cut", min: 1000, max: 20000, defaultValue: 12000, step: 100, unit: "Hz", type: "knob" },
      { id: "mix", name: "Wet/Dry", label: "Mix", min: 0, max: 100, defaultValue: 30, step: 1, unit: "%", type: "knob" },
    ],
    dspCode: `// Plate Reverb DSP
// Feedback delay network with allpass diffusion
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        float input = (buffer[0][i] + buffer[1][i]) * 0.5f;
        // Pre-delay line
        float delayed = predelayLine.read(predelayMs);
        predelayLine.write(input);
        // Diffusion network (4 allpass filters in series)
        float diffused = delayed;
        for (auto& ap : allpassFilters)
            diffused = ap.process(diffused);
        // Feedback delay network
        float reverbOut = fdn.process(diffused, decayTime, damping);
        // Tone shaping
        reverbOut = lowCutFilter.process(reverbOut);
        reverbOut = highCutFilter.process(reverbOut);
        for (int ch = 0; ch < numChannels; ++ch)
            buffer[ch][i] = buffer[ch][i] * (1.f - mix) + reverbOut * mix;
    }
}`,
  },
  {
    id: "tape-delay",
    name: "Tape Delay",
    category: "Delay",
    description:
      "Vintage tape echo with wow, flutter, and saturation. Recreates the warm, degrading repeats of classic tape delay units like the Roland Space Echo.",
    icon: "Timer",
    tags: ["tape", "echo", "vintage", "space-echo", "warm"],
    popularity: 88,
    parameters: [
      { id: "time", name: "Delay Time", label: "Time", min: 1, max: 2000, defaultValue: 375, step: 1, unit: "ms", type: "knob" },
      { id: "feedback", name: "Feedback", label: "Feedback", min: 0, max: 95, defaultValue: 40, step: 1, unit: "%", type: "knob" },
      { id: "wow_flutter", name: "Wow & Flutter", label: "Wow/Flut", min: 0, max: 100, defaultValue: 30, step: 1, unit: "%", type: "knob" },
      { id: "saturation", name: "Tape Saturation", label: "Saturate", min: 0, max: 100, defaultValue: 40, step: 1, unit: "%", type: "knob" },
      { id: "tone", name: "Tone", label: "Tone", min: 200, max: 12000, defaultValue: 4000, step: 100, unit: "Hz", type: "knob" },
      { id: "mix", name: "Wet/Dry", label: "Mix", min: 0, max: 100, defaultValue: 35, step: 1, unit: "%", type: "knob" },
    ],
    dspCode: `// Tape Delay DSP - Space Echo style
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        // Modulate delay time with wow & flutter LFO
        float modTime = delayTime + wowLFO.process() * wowAmount;
        float delayed = delayLine.readInterp(modTime);
        // Tape saturation (soft clip)
        delayed = std::tanh(delayed * (1.0f + saturation * 2.0f));
        // Tone filter (low-pass for tape character)
        delayed = toneFilter.process(delayed, toneCutoff);
        // Write input + feedback to delay line
        float input = (buffer[0][i] + buffer[1][i]) * 0.5f;
        delayLine.write(input + delayed * feedback);
        for (int ch = 0; ch < numChannels; ++ch)
            buffer[ch][i] = buffer[ch][i] * (1.f - mix) + delayed * mix;
    }
}`,
  },
  {
    id: "tube-saturator",
    name: "Tube Saturator",
    category: "Distortion",
    description:
      "Warm tube saturation and harmonic enhancement. Adds analog warmth and presence from subtle coloring to aggressive overdrive.",
    icon: "Flame",
    tags: ["tube", "saturation", "warmth", "harmonic", "analog"],
    popularity: 86,
    parameters: [
      { id: "drive", name: "Drive", label: "Drive", min: 0, max: 100, defaultValue: 30, step: 1, unit: "%", type: "knob" },
      { id: "tone", name: "Tone", label: "Tone", min: 0, max: 100, defaultValue: 50, step: 1, unit: "%", type: "knob" },
      { id: "bias", name: "Tube Bias", label: "Bias", min: 0, max: 100, defaultValue: 50, step: 1, unit: "%", type: "knob" },
      { id: "mix", name: "Mix", label: "Mix", min: 0, max: 100, defaultValue: 100, step: 1, unit: "%", type: "knob" },
      { id: "output", name: "Output", label: "Output", min: -12, max: 12, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
    ],
    dspCode: `// Tube Saturator DSP
// Waveshaping with asymmetric transfer function
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int ch = 0; ch < numChannels; ++ch) {
        for (int i = 0; i < numSamples; ++i) {
            float sample = buffer[ch][i] * (1.0f + drive * 4.0f);
            // Asymmetric tube waveshaping
            if (sample >= 0)
                sample = std::tanh(sample + bias * sample * sample);
            else
                sample = std::tanh(sample - bias * 0.5f * sample * sample);
            // Tone control (tilt EQ)
            sample = tiltEQ.process(sample, tone);
            // Mix and output
            float dry = buffer[ch][i];
            buffer[ch][i] = (dry * (1.f - mix) + sample * mix) * outputGain;
        }
    }
}`,
  },
  {
    id: "analog-chorus",
    name: "Analog Chorus",
    category: "Chorus",
    description:
      "Rich analog chorus inspired by the Juno-60. Features multiple voices with BBD-style delay modulation for lush, wide stereo effects.",
    icon: "Layers",
    tags: ["chorus", "juno", "stereo", "lush", "modulation"],
    popularity: 84,
    parameters: [
      { id: "rate", name: "Rate", label: "Rate", min: 0.01, max: 10, defaultValue: 0.5, step: 0.01, unit: "Hz", type: "knob" },
      { id: "depth", name: "Depth", label: "Depth", min: 0, max: 100, defaultValue: 60, step: 1, unit: "%", type: "knob" },
      { id: "voices", name: "Voices", label: "Voices", min: 1, max: 4, defaultValue: 2, step: 1, unit: "", type: "knob" },
      { id: "feedback", name: "Feedback", label: "Feedback", min: 0, max: 80, defaultValue: 20, step: 1, unit: "%", type: "knob" },
      { id: "mix", name: "Mix", label: "Mix", min: 0, max: 100, defaultValue: 50, step: 1, unit: "%", type: "knob" },
    ],
    dspCode: `// Analog Chorus DSP - Juno-60 style
// BBD delay line modulation with multiple voices
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        float dry = buffer[0][i];
        float wetL = 0, wetR = 0;
        for (int v = 0; v < numVoices; ++v) {
            float phase = lfoPhase + (float)v / numVoices;
            float modDelay = baseDelay + depth * std::sin(2.f * PI * phase);
            float delayed = bbdLine.readInterp(modDelay);
            bbdLine.write(dry + delayed * feedback);
            wetL += delayed * panL[v];
            wetR += delayed * panR[v];
        }
        buffer[0][i] = dry * (1.f - mix) + wetL * mix;
        if (numChannels > 1)
            buffer[1][i] = dry * (1.f - mix) + wetR * mix;
        lfoPhase += rate / sampleRate;
    }
}`,
  },
  {
    id: "subtractive-synth",
    name: "Subtractive Synth",
    category: "Synthesizer",
    description:
      "Classic subtractive synthesizer with dual oscillators, resonant filter, and ADSR envelope. Versatile sound design for bass, leads, and pads.",
    icon: "Music",
    tags: ["synth", "subtractive", "oscillator", "filter", "instrument"],
    popularity: 91,
    parameters: [
      { id: "osc1_wave", name: "Osc 1 Wave", label: "Osc 1", min: 0, max: 3, defaultValue: 0, step: 1, unit: "", type: "select" },
      { id: "osc2_wave", name: "Osc 2 Wave", label: "Osc 2", min: 0, max: 3, defaultValue: 1, step: 1, unit: "", type: "select" },
      { id: "osc_mix", name: "Osc Mix", label: "Osc Mix", min: 0, max: 100, defaultValue: 50, step: 1, unit: "%", type: "knob" },
      { id: "filter_cutoff", name: "Filter Cutoff", label: "Cutoff", min: 20, max: 20000, defaultValue: 5000, step: 1, unit: "Hz", type: "knob" },
      { id: "filter_res", name: "Filter Resonance", label: "Reso", min: 0, max: 100, defaultValue: 30, step: 1, unit: "%", type: "knob" },
      { id: "attack", name: "Attack", label: "Attack", min: 0.001, max: 5, defaultValue: 0.01, step: 0.001, unit: "s", type: "knob" },
      { id: "decay", name: "Decay", label: "Decay", min: 0.001, max: 5, defaultValue: 0.3, step: 0.001, unit: "s", type: "knob" },
      { id: "sustain", name: "Sustain", label: "Sustain", min: 0, max: 100, defaultValue: 70, step: 1, unit: "%", type: "knob" },
      { id: "release", name: "Release", label: "Release", min: 0.001, max: 10, defaultValue: 0.5, step: 0.001, unit: "s", type: "knob" },
    ],
    dspCode: `// Subtractive Synth DSP
// Dual oscillator -> Resonant filter -> ADSR envelope
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int i = 0; i < numSamples; ++i) {
        // Dual oscillators (saw, square, triangle, sine)
        float osc1 = oscillator1.process(frequency, osc1Wave);
        float osc2 = oscillator2.process(frequency, osc2Wave);
        float mixed = osc1 * (1.f - oscMix) + osc2 * oscMix;
        // Resonant low-pass filter with envelope modulation
        float envValue = adsr.process(gateOn);
        float cutoff = filterCutoff * envValue;
        float filtered = svfFilter.process(mixed, cutoff, filterRes);
        // Apply amplitude envelope
        float output = filtered * envValue;
        for (int ch = 0; ch < numChannels; ++ch)
            buffer[ch][i] = output;
    }
}`,
  },
  {
    id: "sample-player",
    name: "Sample Player",
    category: "Sampler",
    description:
      "Drag-and-drop sample player instrument. Load any audio file and play it chromatically across the keyboard with pitch shifting, loop points, and ADSR envelope.",
    icon: "FileAudio",
    tags: ["sampler", "sample", "instrument", "playback", "chromatic"],
    popularity: 87,
    parameters: [
      { id: "root_note", name: "Root Note", label: "Root", min: 0, max: 127, defaultValue: 60, step: 1, unit: "MIDI", type: "knob" },
      { id: "loop_start", name: "Loop Start", label: "Loop Start", min: 0, max: 100, defaultValue: 0, step: 0.1, unit: "%", type: "knob" },
      { id: "loop_end", name: "Loop End", label: "Loop End", min: 0, max: 100, defaultValue: 100, step: 0.1, unit: "%", type: "knob" },
      { id: "loop_enable", name: "Loop Enable", label: "Loop", min: 0, max: 1, defaultValue: 0, step: 1, unit: "", type: "toggle" },
      { id: "attack", name: "Attack", label: "Attack", min: 0.001, max: 5, defaultValue: 0.005, step: 0.001, unit: "s", type: "knob" },
      { id: "release", name: "Release", label: "Release", min: 0.001, max: 10, defaultValue: 0.3, step: 0.001, unit: "s", type: "knob" },
      { id: "volume", name: "Volume", label: "Volume", min: -60, max: 12, defaultValue: 0, step: 0.5, unit: "dB", type: "knob" },
    ],
    dspCode: `// Sample Player DSP
// Pitch-shifting sample playback with loop points
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (auto& voice : activeVoices) {
        float pitchRatio = midiToPitchRatio(voice.note, rootNote);
        for (int i = 0; i < numSamples; ++i) {
            float envValue = voice.envelope.process(voice.gateOn);
            // Read sample with interpolation
            float sample = sampleBuffer.readInterp(voice.position);
            voice.position += pitchRatio;
            // Loop handling
            if (loopEnabled && voice.position >= loopEnd)
                voice.position = loopStart + fmod(voice.position - loopStart, loopEnd - loopStart);
            float output = sample * envValue * dBToLinear(volume);
            for (int ch = 0; ch < numChannels; ++ch)
                buffer[ch][i] += output;
        }
    }
}`,
  },
  {
    id: "multiband-filter",
    name: "Multiband Filter",
    category: "Filter",
    description:
      "Versatile multiband resonant filter with LP, HP, BP, and notch modes. Features smooth filter sweeps and envelope following for dynamic filtering.",
    icon: "SlidersHorizontal",
    tags: ["filter", "multiband", "resonant", "sweep", "dynamic"],
    popularity: 78,
    parameters: [
      { id: "cutoff", name: "Cutoff", label: "Cutoff", min: 20, max: 20000, defaultValue: 1000, step: 1, unit: "Hz", type: "knob" },
      { id: "resonance", name: "Resonance", label: "Reso", min: 0, max: 100, defaultValue: 30, step: 1, unit: "%", type: "knob" },
      { id: "filter_type", name: "Filter Type", label: "Type", min: 0, max: 3, defaultValue: 0, step: 1, unit: "", type: "select" },
      { id: "env_amount", name: "Envelope Amount", label: "Env Amt", min: -100, max: 100, defaultValue: 0, step: 1, unit: "%", type: "knob" },
      { id: "env_speed", name: "Envelope Speed", label: "Env Spd", min: 1, max: 500, defaultValue: 50, step: 1, unit: "ms", type: "knob" },
      { id: "mix", name: "Mix", label: "Mix", min: 0, max: 100, defaultValue: 100, step: 1, unit: "%", type: "knob" },
    ],
    dspCode: `// Multiband Filter DSP
// State-variable filter with envelope follower
void processBlock(float** buffer, int numChannels, int numSamples) {
    for (int ch = 0; ch < numChannels; ++ch) {
        for (int i = 0; i < numSamples; ++i) {
            float input = buffer[ch][i];
            // Envelope follower
            float env = envFollower.process(std::abs(input), envSpeed);
            float modCutoff = cutoff * (1.0f + env * envAmount);
            modCutoff = std::clamp(modCutoff, 20.0f, 20000.0f);
            // SVF filter (LP, HP, BP, Notch)
            float filtered = svf[ch].process(input, modCutoff, resonance, filterType);
            buffer[ch][i] = input * (1.f - mix) + filtered * mix;
        }
    }
}`,
  },
  {
    id: "stereo-utility",
    name: "Stereo Utility",
    category: "Utility",
    description:
      "Essential stereo imaging and metering tool. Control width, balance, mid/side processing, phase, and gain with visual feedback.",
    icon: "ArrowLeftRight",
    tags: ["utility", "stereo", "imaging", "metering", "mid-side"],
    popularity: 75,
    parameters: [
      { id: "width", name: "Stereo Width", label: "Width", min: 0, max: 200, defaultValue: 100, step: 1, unit: "%", type: "knob" },
      { id: "balance", name: "Balance", label: "Balance", min: -100, max: 100, defaultValue: 0, step: 1, unit: "%", type: "knob" },
      { id: "gain", name: "Gain", label: "Gain", min: -24, max: 24, defaultValue: 0, step: 0.1, unit: "dB", type: "knob" },
      { id: "phase_l", name: "Phase Invert L", label: "Phase L", min: 0, max: 1, defaultValue: 0, step: 1, unit: "", type: "toggle" },
      { id: "phase_r", name: "Phase Invert R", label: "Phase R", min: 0, max: 1, defaultValue: 0, step: 1, unit: "", type: "toggle" },
      { id: "mono", name: "Mono", label: "Mono", min: 0, max: 1, defaultValue: 0, step: 1, unit: "", type: "toggle" },
    ],
    dspCode: `// Stereo Utility DSP
// Mid/Side processing with stereo width control
void processBlock(float** buffer, int numChannels, int numSamples) {
    if (numChannels < 2) return;
    for (int i = 0; i < numSamples; ++i) {
        float L = buffer[0][i] * (phaseL ? -1.f : 1.f);
        float R = buffer[1][i] * (phaseR ? -1.f : 1.f);
        // Encode to Mid/Side
        float mid = (L + R) * 0.5f;
        float side = (L - R) * 0.5f;
        // Width control (0% = mono, 100% = normal, 200% = extra wide)
        side *= width / 100.0f;
        // Decode back to L/R
        L = mid + side;
        R = mid - side;
        // Balance
        float balL = balance <= 0 ? 1.0f : 1.0f - balance / 100.0f;
        float balR = balance >= 0 ? 1.0f : 1.0f + balance / 100.0f;
        // Mono switch
        if (monoEnabled) { L = R = mid; }
        // Apply gain
        float g = dBToLinear(gain);
        buffer[0][i] = L * balL * g;
        buffer[1][i] = R * balR * g;
    }
}`,
  },
];

export function getTemplatesByCategory(category: string): PluginTemplate[] {
  return pluginTemplates.filter((t) => t.category === category);
}

export function getTemplateById(id: string): PluginTemplate | undefined {
  return pluginTemplates.find((t) => t.id === id);
}

export const categoryDescriptions: Record<string, string> = {
  EQ: "Shape your tone with precision equalizers",
  Compressor: "Control dynamics and add punch",
  Reverb: "Add space and depth to your sounds",
  Delay: "Create echoes and rhythmic effects",
  Distortion: "Add warmth, grit, and harmonics",
  Chorus: "Thicken and widen your sounds",
  Synthesizer: "Generate sounds from scratch",
  Sampler: "Play and manipulate audio samples",
  Filter: "Sculpt frequencies with resonant filters",
  Utility: "Essential mixing and metering tools",
};
