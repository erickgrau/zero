import type {
  AudioAnalysisResult,
  PluginType,
  PluginParameter,
} from '@/types/plugin';

/**
 * Analyzes an audio file and returns spectral/dynamic characteristics along
 * with a suggested plugin type and starter parameters.
 */
export async function analyzeAudioFile(
  file: File,
): Promise<AudioAnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch {
    audioContext.close();
    throw new Error(
      'Failed to decode audio file. Ensure the file is a supported format (WAV, MP3, OGG, FLAC).',
    );
  }

  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  const channels = audioBuffer.numberOfChannels;

  // ---- RMS and Peak --------------------------------------------------------
  // Mix down to mono for analysis
  const length = audioBuffer.length;
  const monoSamples = new Float32Array(length);

  for (let ch = 0; ch < channels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      monoSamples[i] += channelData[i];
    }
  }
  // Average across channels
  if (channels > 1) {
    for (let i = 0; i < length; i++) {
      monoSamples[i] /= channels;
    }
  }

  let sumSquares = 0;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const sample = monoSamples[i];
    sumSquares += sample * sample;
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
  }
  const rms = Math.sqrt(sumSquares / length);

  // ---- Frequency analysis via OfflineAudioContext ---------------------------
  const fftSize = 4096;
  const offlineLength = Math.max(fftSize, length);
  const offlineCtx = new OfflineAudioContext(1, offlineLength, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0;

  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  await offlineCtx.startRendering();

  const frequencyBinCount = analyser.frequencyBinCount;
  const frequencyData = new Float32Array(frequencyBinCount);
  analyser.getFloatFrequencyData(frequencyData);

  const binWidth = sampleRate / fftSize;

  // ---- Spectral Centroid ----------------------------------------------------
  let weightedSum = 0;
  let magnitudeSum = 0;

  for (let i = 0; i < frequencyBinCount; i++) {
    // Convert dB to linear magnitude
    const magnitude = Math.pow(10, frequencyData[i] / 20);
    const frequency = i * binWidth;
    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
  }
  const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

  // ---- Spectral Rolloff (85% energy) ---------------------------------------
  const totalEnergy = (() => {
    let sum = 0;
    for (let i = 0; i < frequencyBinCount; i++) {
      const mag = Math.pow(10, frequencyData[i] / 20);
      sum += mag * mag;
    }
    return sum;
  })();

  let cumulativeEnergy = 0;
  let spectralRolloff = sampleRate / 2;
  for (let i = 0; i < frequencyBinCount; i++) {
    const mag = Math.pow(10, frequencyData[i] / 20);
    cumulativeEnergy += mag * mag;
    if (cumulativeEnergy >= totalEnergy * 0.85) {
      spectralRolloff = i * binWidth;
      break;
    }
  }

  // ---- Frequency Bands (64 representative bands) ----------------------------
  const numBands = 64;
  const bandStep = Math.floor(frequencyBinCount / numBands);
  const frequencyBands: { frequency: number; magnitude: number }[] = [];

  for (let b = 0; b < numBands; b++) {
    const startBin = b * bandStep;
    const endBin = Math.min(startBin + bandStep, frequencyBinCount);
    let maxMag = -Infinity;
    let centerFreq = 0;

    for (let i = startBin; i < endBin; i++) {
      if (frequencyData[i] > maxMag) {
        maxMag = frequencyData[i];
        centerFreq = i * binWidth;
      }
    }

    frequencyBands.push({
      frequency: Math.round(centerFreq),
      magnitude: maxMag,
    });
  }

  // ---- Waveform Data (downsample to ~500 points) ----------------------------
  const waveformPoints = 500;
  const waveformData: number[] = [];
  const samplesPerPoint = Math.floor(length / waveformPoints);

  for (let i = 0; i < waveformPoints; i++) {
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, length);
    let maxVal = 0;

    for (let j = start; j < end; j++) {
      const abs = Math.abs(monoSamples[j]);
      if (abs > maxVal) maxVal = abs;
    }

    waveformData.push(maxVal);
  }

  // ---- Plugin Type Suggestion -----------------------------------------------
  const rmsdB = rms > 0 ? 20 * Math.log10(rms) : -100;
  const peakdB = peak > 0 ? 20 * Math.log10(peak) : -100;
  const dynamicRange = peakdB - rmsdB;

  let suggestedType: PluginType;
  if (dynamicRange > 20) {
    suggestedType = 'compressor';
  } else if (spectralCentroid < 500) {
    suggestedType = 'eq';
  } else if (spectralCentroid > 5000) {
    suggestedType = 'eq';
  } else {
    suggestedType = 'reverb';
  }

  // ---- Suggested Parameters -------------------------------------------------
  const suggestedParameters = buildSuggestedParameters(
    suggestedType,
    dynamicRange,
    spectralCentroid,
    rmsdB,
  );

  // ---- Cleanup --------------------------------------------------------------
  audioContext.close();

  return {
    sampleRate,
    duration,
    channels,
    rms,
    peak,
    spectralCentroid,
    spectralRolloff,
    frequencyBands,
    suggestedType,
    suggestedParameters,
    waveformData,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSuggestedParameters(
  type: PluginType,
  dynamicRange: number,
  spectralCentroid: number,
  rmsdB: number,
): Partial<PluginParameter>[] {
  switch (type) {
    case 'compressor':
      return [
        {
          id: 'threshold',
          name: 'threshold',
          label: 'Threshold',
          type: 'float',
          defaultValue: Math.round(Math.max(-40, rmsdB - 6)),
          unit: 'dB',
        },
        {
          id: 'ratio',
          name: 'ratio',
          label: 'Ratio',
          type: 'float',
          defaultValue: dynamicRange > 30 ? 8 : 4,
        },
        {
          id: 'attack',
          name: 'attack',
          label: 'Attack',
          type: 'float',
          defaultValue: 10,
          unit: 'ms',
        },
        {
          id: 'release',
          name: 'release',
          label: 'Release',
          type: 'float',
          defaultValue: 200,
          unit: 'ms',
        },
        {
          id: 'makeup',
          name: 'makeup',
          label: 'Makeup Gain',
          type: 'float',
          defaultValue: Math.round(dynamicRange > 30 ? 6 : 3),
          unit: 'dB',
        },
      ];

    case 'eq':
      if (spectralCentroid < 500) {
        // Low-heavy material -- suggest high-pass and presence boost
        return [
          {
            id: 'hp-freq',
            name: 'hpFreq',
            label: 'High Pass',
            type: 'float',
            defaultValue: 80,
            unit: 'Hz',
          },
          {
            id: 'low-cut',
            name: 'lowCut',
            label: 'Low Shelf Gain',
            type: 'float',
            defaultValue: -3,
            unit: 'dB',
          },
          {
            id: 'mid-boost-freq',
            name: 'midBoostFreq',
            label: 'Mid Frequency',
            type: 'float',
            defaultValue: 2500,
            unit: 'Hz',
          },
          {
            id: 'mid-boost-gain',
            name: 'midBoostGain',
            label: 'Mid Gain',
            type: 'float',
            defaultValue: 3,
            unit: 'dB',
          },
        ];
      }
      // Bright material -- suggest de-essing / high shelf cut
      return [
        {
          id: 'high-shelf-freq',
          name: 'highShelfFreq',
          label: 'High Shelf Freq',
          type: 'float',
          defaultValue: 8000,
          unit: 'Hz',
        },
        {
          id: 'high-shelf-gain',
          name: 'highShelfGain',
          label: 'High Shelf Gain',
          type: 'float',
          defaultValue: -4,
          unit: 'dB',
        },
        {
          id: 'presence-freq',
          name: 'presenceFreq',
          label: 'Presence Freq',
          type: 'float',
          defaultValue: 3000,
          unit: 'Hz',
        },
        {
          id: 'presence-gain',
          name: 'presenceGain',
          label: 'Presence Gain',
          type: 'float',
          defaultValue: -2,
          unit: 'dB',
        },
      ];

    case 'reverb':
    default:
      return [
        {
          id: 'decay',
          name: 'decay',
          label: 'Decay',
          type: 'float',
          defaultValue: 2.0,
          unit: 's',
        },
        {
          id: 'pre-delay',
          name: 'preDelay',
          label: 'Pre-Delay',
          type: 'float',
          defaultValue: 20,
          unit: 'ms',
        },
        {
          id: 'damping',
          name: 'damping',
          label: 'Damping',
          type: 'float',
          defaultValue: 50,
          unit: '%',
        },
        {
          id: 'mix',
          name: 'mix',
          label: 'Mix',
          type: 'float',
          defaultValue: 25,
          unit: '%',
        },
      ];
  }
}
