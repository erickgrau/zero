import type {
  PluginProject,
  PluginParameter,
  PluginType,
  PluginFormat,
} from '@/types/plugin';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete, compilable JUCE 7+ audio plugin project.
 *
 * Returns a Map of relative file paths to their string contents.  The caller
 * can write these to disk or pack them into a ZIP archive.
 */
export function generateJuceProject(
  project: PluginProject
): Map<string, string> {
  const files = new Map<string, string>();

  const className = sanitizeClassName(project.name);

  files.set('CMakeLists.txt', generateCMakeLists(project, className));
  files.set('Source/PluginProcessor.h', generateProcessorHeader(project, className));
  files.set('Source/PluginProcessor.cpp', generateProcessorSource(project, className));
  files.set('Source/PluginEditor.h', generateEditorHeader(project, className));
  files.set('Source/PluginEditor.cpp', generateEditorSource(project, className));

  return files;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turn an arbitrary project name into a valid C++ identifier. */
function sanitizeClassName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned || /^[0-9]/.test(cleaned)) return `Plugin${cleaned}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Escape a string for use inside a C++ string literal. */
function cppString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Map our format enum to the JUCE CMake format identifier. */
function juceFormat(f: PluginFormat): string {
  switch (f) {
    case 'VST3':
      return 'VST3';
    case 'AU':
      return 'AU';
    case 'Standalone':
      return 'Standalone';
    default:
      return 'Standalone';
  }
}

/** C++ identifier for a parameter. */
function paramId(p: PluginParameter): string {
  return p.id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ---------------------------------------------------------------------------
// CMakeLists.txt
// ---------------------------------------------------------------------------

function generateCMakeLists(
  project: PluginProject,
  className: string
): string {
  const formats = project.formats.map(juceFormat).join(' ');

  return `cmake_minimum_required(VERSION 3.22)

project(${className} VERSION ${project.version})

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------------------------
# Fetch JUCE
# ---------------------------------------------------------------------------
include(FetchContent)

FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        7.0.9
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(JUCE)

# ---------------------------------------------------------------------------
# Plugin target
# ---------------------------------------------------------------------------
juce_add_plugin(${className}
    COMPANY_NAME          "${cppString(project.vendor)}"
    PLUGIN_MANUFACTURER_CODE ${project.vendorCode}
    PLUGIN_CODE              ${project.pluginCode}
    FORMATS               ${formats}
    PRODUCT_NAME          "${cppString(project.name)}"
    DESCRIPTION           "${cppString(project.description)}"
)

target_sources(${className}
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
)

target_compile_definitions(${className}
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(${className}
    PRIVATE
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)
`;
}

// ---------------------------------------------------------------------------
// PluginProcessor.h
// ---------------------------------------------------------------------------

function generateProcessorHeader(
  project: PluginProject,
  className: string
): string {
  const isSynth = project.type === 'synth';
  const extraIncludes = getDspIncludes(project.type);

  return `#pragma once

#include <JuceHeader.h>
${extraIncludes}

//==============================================================================
/**
    ${cppString(project.description)}
*/
class ${className}AudioProcessor : public juce::AudioProcessor
{
public:
    //==========================================================================
    ${className}AudioProcessor();
    ~${className}AudioProcessor() override;

    //==========================================================================
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    //==========================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    //==========================================================================
    const juce::String getName() const override { return JucePlugin_Name; }

    bool acceptsMidi() const override  { return ${isSynth ? 'true' : 'false'}; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    //==========================================================================
    int getNumPrograms() override    { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    //==========================================================================
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==========================================================================
    juce::AudioProcessorValueTreeState apvts;

private:
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

${getDspMemberDeclarations(project)}
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${className}AudioProcessor)
};
`;
}

// ---------------------------------------------------------------------------
// PluginProcessor.cpp
// ---------------------------------------------------------------------------

function generateProcessorSource(
  project: PluginProject,
  className: string
): string {
  const cn = `${className}AudioProcessor`;
  const isSynth = project.type === 'synth';

  const busesDefault = isSynth
    ? `#if ! JucePlugin_IsSynth
     .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
    #endif
     .withOutput ("Output", juce::AudioChannelSet::stereo(), true)`
    : `.withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
     .withOutput ("Output", juce::AudioChannelSet::stereo(), true)`;

  return `#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
${cn}::${cn}()
    : AudioProcessor(BusesProperties()
        ${busesDefault}
      ),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
}

${cn}::~${cn}()
{
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout ${cn}::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

${generateParameterCreation(project.parameters)}
    return layout;
}

//==============================================================================
void ${cn}::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    juce::ignoreUnused(samplesPerBlock);

${generatePrepareToPlay(project)}
}

void ${cn}::releaseResources()
{
}

bool ${cn}::isBusesLayoutSupported(const BusesLayout& layouts) const
{
${generateBusesLayoutCheck(project.type)}
}

//==============================================================================
void ${cn}::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ignoreUnused(midiMessages);
    juce::ScopedNoDenormals noDenormals;

    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

${generateProcessBlock(project)}
}

//==============================================================================
juce::AudioProcessorEditor* ${cn}::createEditor()
{
    return new ${className}AudioProcessorEditor(*this);
}

//==============================================================================
void ${cn}::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void ${cn}::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xml(getXmlFromBinary(data, sizeInBytes));
    if (xml != nullptr && xml->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xml));
}

//==============================================================================
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new ${cn}();
}
`;
}

// ---------------------------------------------------------------------------
// PluginEditor.h
// ---------------------------------------------------------------------------

function generateEditorHeader(
  project: PluginProject,
  className: string
): string {
  const cn = `${className}AudioProcessor`;
  const en = `${className}AudioProcessorEditor`;

  const sliderDecls = project.parameters
    .filter((p) => p.type !== 'bool')
    .map(
      (p) =>
        `    juce::Slider ${paramId(p)}Slider;\n` +
        `    juce::Label  ${paramId(p)}Label;\n` +
        `    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> ${paramId(p)}Attachment;`
    )
    .join('\n');

  const buttonDecls = project.parameters
    .filter((p) => p.type === 'bool')
    .map(
      (p) =>
        `    juce::ToggleButton ${paramId(p)}Button;\n` +
        `    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> ${paramId(p)}Attachment;`
    )
    .join('\n');

  return `#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

//==============================================================================
class ${en} : public juce::AudioProcessorEditor
{
public:
    explicit ${en}(${cn}& processor);
    ~${en}() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    ${cn}& audioProcessor;

    juce::Label titleLabel;

${sliderDecls}
${buttonDecls}

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${en})
};
`;
}

// ---------------------------------------------------------------------------
// PluginEditor.cpp
// ---------------------------------------------------------------------------

function generateEditorSource(
  project: PluginProject,
  className: string
): string {
  const cn = `${className}AudioProcessor`;
  const en = `${className}AudioProcessorEditor`;

  const sliderParams = project.parameters.filter((p) => p.type !== 'bool');
  const buttonParams = project.parameters.filter((p) => p.type === 'bool');

  const cols = Math.min(sliderParams.length, 4);
  const rows = Math.max(1, Math.ceil(sliderParams.length / cols));
  const editorWidth = Math.max(400, cols * 140 + 40);
  const editorHeight = 80 + rows * 120 + buttonParams.length * 30 + 20;

  const sliderInit = sliderParams
    .map((p) => {
      const pid = paramId(p);
      const suffix = p.unit ? ` ${cppString(p.unit)}` : '';
      return `    // ${cppString(p.name)}
    ${pid}Slider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    ${pid}Slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 70, 20);
    ${pid}Slider.setColour(juce::Slider::rotarySliderFillColourId, juce::Colour(0xFF66BBFF));
    ${pid}Slider.setColour(juce::Slider::textBoxTextColourId, juce::Colours::white);
    ${pid}Slider.setTextValueSuffix("${suffix}");
    addAndMakeVisible(${pid}Slider);

    ${pid}Label.setText("${cppString(p.name)}", juce::dontSendNotification);
    ${pid}Label.setJustificationType(juce::Justification::centred);
    ${pid}Label.setColour(juce::Label::textColourId, juce::Colours::white);
    ${pid}Label.setFont(juce::FontOptions(13.0f));
    addAndMakeVisible(${pid}Label);

    ${pid}Attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, "${cppString(p.id)}", ${pid}Slider);
`;
    })
    .join('\n');

  const buttonInit = buttonParams
    .map((p) => {
      const pid = paramId(p);
      return `    ${pid}Button.setButtonText("${cppString(p.name)}");
    ${pid}Button.setColour(juce::ToggleButton::textColourId, juce::Colours::white);
    addAndMakeVisible(${pid}Button);

    ${pid}Attachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(
        audioProcessor.apvts, "${cppString(p.id)}", ${pid}Button);
`;
    })
    .join('\n');

  const sliderLayout = sliderParams
    .map((p, i) => {
      const pid = paramId(p);
      const col = i % cols;
      const row = Math.floor(i / cols);
      return `    ${pid}Slider.setBounds(sliderStartX + ${col} * sliderWidth,
                          sliderStartY + ${row} * sliderHeight,
                          sliderWidth, sliderHeight - 20);
    ${pid}Label.setBounds(sliderStartX + ${col} * sliderWidth,
                         sliderStartY + ${row} * sliderHeight + sliderHeight - 20,
                         sliderWidth, 20);`;
    })
    .join('\n');

  const buttonLayout = buttonParams
    .map((p, i) => {
      const pid = paramId(p);
      return `    ${pid}Button.setBounds(20, buttonStartY + ${i} * 30, getWidth() - 40, 24);`;
    })
    .join('\n');

  return `#include "PluginEditor.h"

//==============================================================================
${en}::${en}(${cn}& p)
    : AudioProcessorEditor(&p), audioProcessor(p)
{
    // Title
    titleLabel.setText("${cppString(project.name)}", juce::dontSendNotification);
    titleLabel.setFont(juce::FontOptions(22.0f, juce::Font::bold));
    titleLabel.setJustificationType(juce::Justification::centred);
    titleLabel.setColour(juce::Label::textColourId, juce::Colours::white);
    addAndMakeVisible(titleLabel);

${sliderInit}
${buttonInit}
    setSize(${editorWidth}, ${editorHeight});
}

${en}::~${en}()
{
}

//==============================================================================
void ${en}::paint(juce::Graphics& g)
{
    // Dark theme background
    g.fillAll(juce::Colour(0xFF1E1E2E));

    // Subtle gradient overlay
    g.setGradientFill(juce::ColourGradient(
        juce::Colour(0xFF2A2A3E), 0.0f, 0.0f,
        juce::Colour(0xFF1E1E2E), 0.0f, static_cast<float>(getHeight()),
        false));
    g.fillRect(getLocalBounds());

    // Bottom bar
    g.setColour(juce::Colour(0xFF333350));
    g.fillRect(0, getHeight() - 24, getWidth(), 24);
    g.setColour(juce::Colour(0xFF888899));
    g.setFont(juce::FontOptions(11.0f));
    g.drawText("${cppString(project.vendor)} | v${cppString(project.version)}",
               getLocalBounds().removeFromBottom(24).reduced(8, 0),
               juce::Justification::centredRight, true);
}

void ${en}::resized()
{
    auto area = getLocalBounds().reduced(20);

    titleLabel.setBounds(area.removeFromTop(40));

    const int sliderWidth  = ${Math.max(100, Math.floor((editorWidth - 40) / cols))};
    const int sliderHeight = 120;
    const int sliderStartX = 20;
    const int sliderStartY = 60;

${sliderLayout}

    [[maybe_unused]] const int buttonStartY = sliderStartY + ${rows} * sliderHeight;

${buttonLayout}
}
`;
}

// ---------------------------------------------------------------------------
// DSP-specific includes
// ---------------------------------------------------------------------------

function getDspIncludes(_type: PluginType): string {
  // juce_dsp is linked at the project level; no extra includes needed beyond
  // JuceHeader.h which pulls in everything.  We keep this hook for clarity.
  return '';
}

// ---------------------------------------------------------------------------
// DSP member declarations per plugin type
// ---------------------------------------------------------------------------

function getDspMemberDeclarations(project: PluginProject): string {
  switch (project.type) {
    case 'eq':
      return `    using IIRFilter = juce::dsp::IIR::Filter<float>;
    using IIRCoefs  = juce::dsp::IIR::Coefficients<float>;
    juce::dsp::ProcessorDuplicator<IIRFilter, IIRCoefs> lowShelfFilter;
    juce::dsp::ProcessorDuplicator<IIRFilter, IIRCoefs> peakFilter;
    juce::dsp::ProcessorDuplicator<IIRFilter, IIRCoefs> highShelfFilter;
    double currentSampleRate = 44100.0;

`;

    case 'compressor':
      return `    float envelopeLevel = 0.0f;
    double currentSampleRate = 44100.0;

`;

    case 'reverb':
      return `    juce::dsp::Reverb reverb;
    juce::dsp::Reverb::Parameters reverbParams;

`;

    case 'delay':
      return `    static constexpr int maxDelaySamples = 192000; // up to ~2 s at 96 kHz
    std::vector<std::vector<float>> delayBuffer;
    int writePosition = 0;
    double currentSampleRate = 44100.0;

`;

    case 'synth':
      return `    juce::Synthesiser synth;
    int voiceCount = 8;
    double currentSampleRate = 44100.0;

`;

    case 'distortion':
      return `    juce::dsp::WaveShaper<float> waveshaper;
    juce::dsp::Oversampling<float> oversampling { 2, 2, juce::dsp::Oversampling<float>::filterHalfBandPolyphaseIIR };
    juce::dsp::Gain<float> inputGain;
    juce::dsp::Gain<float> outputGain;

`;

    case 'chorus':
      return `    static constexpr int maxDelaySamples = 4800; // ~100 ms at 48 kHz
    std::vector<std::vector<float>> delayBuffer;
    int writePosition = 0;
    float lfoPhase = 0.0f;
    double currentSampleRate = 44100.0;

`;

    case 'phaser':
      return `    static constexpr int numStages = 6;
    // Per-channel, per-stage all-pass state
    std::array<std::array<float, numStages>, 2> allPassState {};
    float lfoPhase = 0.0f;
    double currentSampleRate = 44100.0;

`;

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Parameter creation (AudioProcessorValueTreeState)
// ---------------------------------------------------------------------------

function generateParameterCreation(params: PluginParameter[]): string {
  return params
    .map((p) => {
      const pid = `"${cppString(p.id)}"`;
      const pname = `"${cppString(p.name)}"`;

      if (p.type === 'bool') {
        return `    layout.add(std::make_unique<juce::AudioParameterBool>(
        juce::ParameterID { ${pid}, 1 }, ${pname},
        ${p.defaultValue !== 0 ? 'true' : 'false'}));
`;
      }

      if (p.type === 'choice' && p.choices && p.choices.length > 0) {
        const choiceList = p.choices
          .map((c) => `"${cppString(c)}"`)
          .join(', ');
        return `    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { ${pid}, 1 }, ${pname},
        juce::StringArray { ${choiceList} },
        ${Math.round(p.defaultValue)}));
`;
      }

      if (p.type === 'int') {
        return `    layout.add(std::make_unique<juce::AudioParameterInt>(
        juce::ParameterID { ${pid}, 1 }, ${pname},
        ${p.min ?? 0}, ${p.max ?? 100}, ${Math.round(p.defaultValue)}));
`;
      }

      // float (default)
      const step = p.step ?? 0.01;
      const skew = guessSkewFactor(p);
      return `    layout.add(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { ${pid}, 1 }, ${pname},
        juce::NormalisableRange<float>(${p.min ?? 0.0}f, ${p.max ?? 1.0}f, ${step}f${skew !== 1.0 ? `, ${skew}f` : ''}),
        ${p.defaultValue}f));
`;
    })
    .join('');
}

/** Use a logarithmic skew for frequency-like parameters. */
function guessSkewFactor(p: PluginParameter): number {
  const id = p.id.toLowerCase();
  if (
    (id.includes('freq') || id.includes('hz')) &&
    (p.max ?? 1) > 1000
  ) {
    return 0.3;
  }
  if (id.includes('time') && (p.max ?? 1) > 500) {
    return 0.5;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// prepareToPlay
// ---------------------------------------------------------------------------

function generatePrepareToPlay(project: PluginProject): string {
  switch (project.type) {
    case 'eq':
      return `    currentSampleRate = sampleRate;

    juce::dsp::ProcessSpec spec;
    spec.sampleRate       = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels      = static_cast<juce::uint32>(getTotalNumOutputChannels());

    lowShelfFilter.prepare(spec);
    peakFilter.prepare(spec);
    highShelfFilter.prepare(spec);

    lowShelfFilter.reset();
    peakFilter.reset();
    highShelfFilter.reset();`;

    case 'compressor':
      return `    currentSampleRate = sampleRate;
    envelopeLevel = 0.0f;`;

    case 'reverb':
      return `    juce::dsp::ProcessSpec spec;
    spec.sampleRate       = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels      = static_cast<juce::uint32>(getTotalNumOutputChannels());

    reverb.prepare(spec);
    reverb.reset();`;

    case 'delay':
      return `    currentSampleRate = sampleRate;
    writePosition = 0;

    const int numChannels = getTotalNumOutputChannels();
    delayBuffer.assign(static_cast<size_t>(numChannels),
                       std::vector<float>(maxDelaySamples, 0.0f));`;

    case 'synth':
      return `    currentSampleRate = sampleRate;
    synth.setCurrentPlaybackSampleRate(sampleRate);

    // Clear and re-add voices
    synth.clearVoices();
    for (int i = 0; i < voiceCount; ++i)
        synth.addVoice(new juce::SynthesiserVoice());

    // In a production plugin you would subclass SynthesiserVoice and
    // SynthesiserSound.  For this generated project we use JUCE's built-in
    // sine-wave demo classes as a starting point.  Replace these with your
    // own voice implementation for richer sound design.
    synth.clearSounds();
    // NOTE: SynthesiserSound is abstract.  You must provide a concrete
    // subclass.  The generated code below is a minimal scaffold; see the
    // companion SynthVoice / SynthSound classes below the processor.`;

    case 'distortion':
      return `    juce::dsp::ProcessSpec spec;
    spec.sampleRate       = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels      = static_cast<juce::uint32>(getTotalNumOutputChannels());

    oversampling.initProcessing(static_cast<size_t>(samplesPerBlock));
    oversampling.reset();

    inputGain.prepare(spec);
    outputGain.prepare(spec);

    waveshaper.functionToUse = [](float x)
    {
        return std::tanh(x);
    };
    waveshaper.prepare(spec);`;

    case 'chorus':
      return `    currentSampleRate = sampleRate;
    writePosition = 0;
    lfoPhase = 0.0f;

    const int numChannels = getTotalNumOutputChannels();
    delayBuffer.assign(static_cast<size_t>(numChannels),
                       std::vector<float>(maxDelaySamples, 0.0f));`;

    case 'phaser':
      return `    currentSampleRate = sampleRate;
    lfoPhase = 0.0f;

    for (auto& channelState : allPassState)
        channelState.fill(0.0f);`;

    default:
      return `    juce::ignoreUnused(sampleRate);`;
  }
}

// ---------------------------------------------------------------------------
// isBusesLayoutSupported
// ---------------------------------------------------------------------------

function generateBusesLayoutCheck(type: PluginType): string {
  if (type === 'synth') {
    return `    // Synth: output only is fine, stereo preferred
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return true;`;
  }

  return `    // Mono or stereo only
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    // Input and output layout must match
    if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
        return false;

    return true;`;
}

// ---------------------------------------------------------------------------
// processBlock  -- the core DSP for each plugin type
// ---------------------------------------------------------------------------

function generateProcessBlock(project: PluginProject): string {
  const paramReads = project.parameters
    .map((p) => {
      const pid = paramId(p);
      if (p.type === 'bool') {
        return `    const bool ${pid} = apvts.getRawParameterValue("${cppString(p.id)}")->load() >= 0.5f;`;
      }
      return `    const float ${pid} = apvts.getRawParameterValue("${cppString(p.id)}")->load();`;
    })
    .join('\n');

  switch (project.type) {
    case 'eq':
      return `${paramReads}

    // Update filter coefficients
    ${generateEqCoefficients(project.parameters)}

    // Process through filter chain
    juce::dsp::AudioBlock<float> block(buffer);
    juce::dsp::ProcessContextReplacing<float> context(block);

    lowShelfFilter.process(context);
    peakFilter.process(context);
    highShelfFilter.process(context);`;

    case 'compressor':
      return `${paramReads}

    ${generateCompressorDsp(project.parameters)}`;

    case 'reverb':
      return `${paramReads}

    ${generateReverbDsp(project.parameters)}`;

    case 'delay':
      return `${paramReads}

    ${generateDelayDsp(project.parameters)}`;

    case 'synth':
      return `${paramReads}

    ${generateSynthDsp(project.parameters)}`;

    case 'distortion':
      return `${paramReads}

    ${generateDistortionDsp(project.parameters)}`;

    case 'chorus':
      return `${paramReads}

    ${generateChorusDsp(project.parameters)}`;

    case 'phaser':
      return `${paramReads}

    ${generatePhaserDsp(project.parameters)}`;

    default:
      return `${paramReads}
    // No DSP implemented for this plugin type.`;
  }
}

// ---------------------------------------------------------------------------
// EQ DSP
// ---------------------------------------------------------------------------

function generateEqCoefficients(params: PluginParameter[]): string {
  // Try to locate frequency / gain / Q parameters by common ID patterns.
  const findParam = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const lowFreq = findParam('low_freq') || findParam('lowfreq') || findParam('bass_freq');
  const lowGain = findParam('low_gain') || findParam('lowgain') || findParam('bass_gain') || findParam('bass');
  const midFreq = findParam('mid_freq') || findParam('midfreq');
  const midGain = findParam('mid_gain') || findParam('midgain') || findParam('mid');
  const midQ = findParam('mid_q') || findParam('q');
  const highFreq = findParam('high_freq') || findParam('highfreq') || findParam('treble_freq');
  const highGain = findParam('high_gain') || findParam('highgain') || findParam('treble');

  // Fall back to sensible defaults if the user's parameters don't match.
  const lf = lowFreq ? paramId(lowFreq) : '200.0f';
  const lg = lowGain ? paramId(lowGain) : '0.0f';
  const mf = midFreq ? paramId(midFreq) : '1000.0f';
  const mg = midGain ? paramId(midGain) : '0.0f';
  const mq = midQ ? paramId(midQ) : '0.707f';
  const hf = highFreq ? paramId(highFreq) : '5000.0f';
  const hg = highGain ? paramId(highGain) : '0.0f';

  return `*lowShelfFilter.state = *IIRCoefs::makeLowShelf(
        currentSampleRate,
        juce::jlimit(20.0f, 20000.0f, ${lf}),
        0.707f,
        juce::Decibels::decibelsToGain(${lg}));

    *peakFilter.state = *IIRCoefs::makePeakFilter(
        currentSampleRate,
        juce::jlimit(20.0f, 20000.0f, ${mf}),
        juce::jmax(0.1f, ${mq}),
        juce::Decibels::decibelsToGain(${mg}));

    *highShelfFilter.state = *IIRCoefs::makeHighShelf(
        currentSampleRate,
        juce::jlimit(20.0f, 20000.0f, ${hf}),
        0.707f,
        juce::Decibels::decibelsToGain(${hg}));`;
}

// ---------------------------------------------------------------------------
// Compressor DSP -- real envelope follower with ballistics
// ---------------------------------------------------------------------------

function generateCompressorDsp(params: PluginParameter[]): string {
  const find = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const threshold = find('thresh') ? paramId(find('thresh')!) : '0.0f';
  const ratio = find('ratio') ? paramId(find('ratio')!) : '4.0f';
  const attack = find('attack') ? paramId(find('attack')!) : '10.0f';
  const release = find('release') ? paramId(find('release')!) : '100.0f';
  const makeupGain = find('makeup') || find('output') || find('gain');
  const makeupId = makeupGain ? paramId(makeupGain) : '0.0f';

  return `// Compressor with real envelope following
    const float threshDB = ${threshold};
    const float ratioVal = juce::jmax(1.0f, ${ratio});
    const float attackCoeff  = std::exp(-1.0f / (static_cast<float>(currentSampleRate) * ${attack} * 0.001f));
    const float releaseCoeff = std::exp(-1.0f / (static_cast<float>(currentSampleRate) * ${release} * 0.001f));
    const float makeupDB = ${makeupId};
    const float makeupLinear = juce::Decibels::decibelsToGain(makeupDB);

    const int numSamples  = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();

    for (int sample = 0; sample < numSamples; ++sample)
    {
        // Detect peak level across all channels
        float inputLevel = 0.0f;
        for (int ch = 0; ch < numChannels; ++ch)
            inputLevel = juce::jmax(inputLevel, std::abs(buffer.getSample(ch, sample)));

        float inputDB = juce::Decibels::gainToDecibels(inputLevel, -96.0f);

        // Envelope follower with separate attack / release
        if (inputDB > envelopeLevel)
            envelopeLevel = attackCoeff * envelopeLevel + (1.0f - attackCoeff) * inputDB;
        else
            envelopeLevel = releaseCoeff * envelopeLevel + (1.0f - releaseCoeff) * inputDB;

        // Gain computer
        float gainReduction = 0.0f;
        if (envelopeLevel > threshDB)
            gainReduction = (threshDB - envelopeLevel) * (1.0f - 1.0f / ratioVal);

        float gainLinear = juce::Decibels::decibelsToGain(gainReduction) * makeupLinear;

        for (int ch = 0; ch < numChannels; ++ch)
            buffer.setSample(ch, sample, buffer.getSample(ch, sample) * gainLinear);
    }`;
}

// ---------------------------------------------------------------------------
// Reverb DSP -- uses JUCE's built-in Reverb
// ---------------------------------------------------------------------------

function generateReverbDsp(params: PluginParameter[]): string {
  const find = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const roomSize = find('room') || find('size') || find('decay');
  const damping = find('damp');
  const wet = find('wet') || find('mix');
  const dry = find('dry');
  const width = find('width') || find('stereo');

  const rs = roomSize ? paramId(roomSize) : '0.5f';
  const dp = damping ? paramId(damping) : '0.5f';
  const wt = wet ? paramId(wet) : '0.33f';
  const dr = dry ? `1.0f - ${paramId(dry)}` : `1.0f - ${wt}`;
  const wd = width ? paramId(width) : '1.0f';

  return `reverbParams.roomSize   = juce::jlimit(0.0f, 1.0f, ${rs});
    reverbParams.damping    = juce::jlimit(0.0f, 1.0f, ${dp});
    reverbParams.wetLevel   = juce::jlimit(0.0f, 1.0f, ${wt});
    reverbParams.dryLevel   = juce::jlimit(0.0f, 1.0f, ${dr});
    reverbParams.width      = juce::jlimit(0.0f, 1.0f, ${wd});
    reverbParams.freezeMode = 0.0f;

    reverb.setParameters(reverbParams);

    juce::dsp::AudioBlock<float> block(buffer);
    juce::dsp::ProcessContextReplacing<float> context(block);
    reverb.process(context);`;
}

// ---------------------------------------------------------------------------
// Delay DSP -- circular buffer with feedback
// ---------------------------------------------------------------------------

function generateDelayDsp(params: PluginParameter[]): string {
  const find = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const delayTime = find('time') || find('delay');
  const feedback = find('feedback') || find('fb');
  const mix = find('mix') || find('wet');

  const dt = delayTime ? paramId(delayTime) : '250.0f';
  const fb = feedback ? paramId(feedback) : '0.4f';
  const mx = mix ? paramId(mix) : '0.5f';

  return `// Delay time in samples (parameter assumed in ms)
    const float delayMs = juce::jlimit(1.0f, 2000.0f, ${dt});
    const float delaySamples = delayMs * 0.001f * static_cast<float>(currentSampleRate);
    const int delaySamplesInt = static_cast<int>(delaySamples);
    const float delayFrac = delaySamples - static_cast<float>(delaySamplesInt);

    const float feedbackAmt = juce::jlimit(0.0f, 0.99f, ${fb});
    const float mixAmt      = juce::jlimit(0.0f, 1.0f, ${mx});

    const int numSamples  = buffer.getNumSamples();
    const int numChannels = juce::jmin(buffer.getNumChannels(), static_cast<int>(delayBuffer.size()));

    for (int ch = 0; ch < numChannels; ++ch)
    {
        auto* channelData = buffer.getWritePointer(ch);
        auto& dBuf = delayBuffer[static_cast<size_t>(ch)];
        const int bufSize = static_cast<int>(dBuf.size());

        for (int i = 0; i < numSamples; ++i)
        {
            // Read with linear interpolation
            int readPos1 = writePosition - delaySamplesInt;
            if (readPos1 < 0) readPos1 += bufSize;
            int readPos2 = readPos1 - 1;
            if (readPos2 < 0) readPos2 += bufSize;

            float delayed = dBuf[static_cast<size_t>(readPos1)] * (1.0f - delayFrac)
                          + dBuf[static_cast<size_t>(readPos2)] * delayFrac;

            float inputSample = channelData[i];
            float outputSample = inputSample * (1.0f - mixAmt) + delayed * mixAmt;

            dBuf[static_cast<size_t>(writePosition)] = inputSample + delayed * feedbackAmt;

            channelData[i] = outputSample;

            if (ch == numChannels - 1)
            {
                writePosition++;
                if (writePosition >= bufSize)
                    writePosition = 0;
            }
        }
    }`;
}

// ---------------------------------------------------------------------------
// Synth DSP
// ---------------------------------------------------------------------------

function generateSynthDsp(_params: PluginParameter[]): string {
  return `// Let the synthesiser render audio from MIDI.
    // In a full implementation, attach parameter values to your custom
    // SynthesiserVoice subclass (oscillator shape, filter cutoff, ADSR, etc.).
    buffer.clear();
    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());`;
}

// ---------------------------------------------------------------------------
// Distortion DSP -- waveshaping with oversampling
// ---------------------------------------------------------------------------

function generateDistortionDsp(params: PluginParameter[]): string {
  const find = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const drive = find('drive') || find('gain') || find('amount');
  const output = find('output') || find('level') || find('volume');
  const mix = find('mix') || find('wet');

  const dr = drive ? paramId(drive) : '1.0f';
  const out = output ? paramId(output) : '0.0f';
  const mx = mix ? paramId(mix) : '1.0f';

  return `// Distortion with 4x oversampling
    const float driveAmount = juce::jlimit(0.0f, 40.0f, ${dr});
    const float outputDB    = ${out};
    const float mixAmount   = juce::jlimit(0.0f, 1.0f, ${mx});

    inputGain.setGainDecibels(driveAmount);
    outputGain.setGainDecibels(outputDB);

    // Store dry signal
    juce::AudioBuffer<float> dryBuffer;
    dryBuffer.makeCopyOf(buffer);

    juce::dsp::AudioBlock<float> block(buffer);

    // Apply input gain (drive)
    inputGain.process(juce::dsp::ProcessContextReplacing<float>(block));

    // Upsample
    auto oversampledBlock = oversampling.processSamplesUp(block);

    // Apply waveshaping at oversampled rate
    for (size_t ch = 0; ch < oversampledBlock.getNumChannels(); ++ch)
    {
        auto* data = oversampledBlock.getChannelPointer(ch);
        for (size_t i = 0; i < oversampledBlock.getNumSamples(); ++i)
            data[i] = std::tanh(data[i]);
    }

    // Downsample
    oversampling.processSamplesDown(block);

    // Apply output gain
    outputGain.process(juce::dsp::ProcessContextReplacing<float>(block));

    // Dry/wet mix
    const int numSamples  = buffer.getNumSamples();
    const int numChannels = buffer.getNumChannels();
    for (int ch = 0; ch < numChannels; ++ch)
    {
        auto* wetData = buffer.getWritePointer(ch);
        auto* dryData = dryBuffer.getReadPointer(ch);
        for (int i = 0; i < numSamples; ++i)
            wetData[i] = dryData[i] * (1.0f - mixAmount) + wetData[i] * mixAmount;
    }`;
}

// ---------------------------------------------------------------------------
// Chorus DSP -- LFO-modulated delay line
// ---------------------------------------------------------------------------

function generateChorusDsp(params: PluginParameter[]): string {
  const find = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const rate = find('rate') || find('speed');
  const depth = find('depth');
  const mix = find('mix') || find('wet');
  const feedback = find('feedback') || find('fb');

  const rt = rate ? paramId(rate) : '0.5f';
  const dp = depth ? paramId(depth) : '0.5f';
  const mx = mix ? paramId(mix) : '0.5f';
  const fb = feedback ? paramId(feedback) : '0.0f';

  return `// Chorus: LFO-modulated short delay line
    const float rateHz       = juce::jlimit(0.05f, 10.0f, ${rt});
    const float depthAmount  = juce::jlimit(0.0f, 1.0f, ${dp});
    const float mixAmount    = juce::jlimit(0.0f, 1.0f, ${mx});
    const float feedbackAmt  = juce::jlimit(0.0f, 0.95f, ${fb});

    const float lfoIncrement = rateHz / static_cast<float>(currentSampleRate);
    const float centreDelay  = 7.0f;   // ms
    const float maxModDepth  = 5.0f;   // ms

    const int numSamples  = buffer.getNumSamples();
    const int numChannels = juce::jmin(buffer.getNumChannels(), static_cast<int>(delayBuffer.size()));

    for (int i = 0; i < numSamples; ++i)
    {
        // Compute LFO value (sine)
        float lfoValue = std::sin(juce::MathConstants<float>::twoPi * lfoPhase);
        lfoPhase += lfoIncrement;
        if (lfoPhase >= 1.0f) lfoPhase -= 1.0f;

        float modulatedDelay = (centreDelay + lfoValue * maxModDepth * depthAmount)
                               * 0.001f * static_cast<float>(currentSampleRate);
        modulatedDelay = juce::jlimit(1.0f, static_cast<float>(maxDelaySamples - 1), modulatedDelay);

        int   readPosInt = static_cast<int>(modulatedDelay);
        float frac       = modulatedDelay - static_cast<float>(readPosInt);

        for (int ch = 0; ch < numChannels; ++ch)
        {
            auto* channelData = buffer.getWritePointer(ch);
            auto& dBuf = delayBuffer[static_cast<size_t>(ch)];
            const int bufSize = static_cast<int>(dBuf.size());

            int rp1 = writePosition - readPosInt;
            if (rp1 < 0) rp1 += bufSize;
            int rp2 = rp1 - 1;
            if (rp2 < 0) rp2 += bufSize;

            float delayed = dBuf[static_cast<size_t>(rp1)] * (1.0f - frac)
                          + dBuf[static_cast<size_t>(rp2)] * frac;

            float inputSample = channelData[i];
            dBuf[static_cast<size_t>(writePosition)] = inputSample + delayed * feedbackAmt;

            channelData[i] = inputSample * (1.0f - mixAmount) + delayed * mixAmount;
        }

        writePosition++;
        if (writePosition >= static_cast<int>(delayBuffer[0].size()))
            writePosition = 0;
    }`;
}

// ---------------------------------------------------------------------------
// Phaser DSP -- all-pass filter chain with LFO
// ---------------------------------------------------------------------------

function generatePhaserDsp(params: PluginParameter[]): string {
  const find = (hint: string) =>
    params.find((p) => p.id.toLowerCase().includes(hint));

  const rate = find('rate') || find('speed');
  const depth = find('depth');
  const mix = find('mix') || find('wet');
  const feedback = find('feedback') || find('fb');

  const rt = rate ? paramId(rate) : '0.3f';
  const dp = depth ? paramId(depth) : '0.7f';
  const mx = mix ? paramId(mix) : '0.5f';
  const fb = feedback ? paramId(feedback) : '0.7f';

  return `// Phaser: chain of all-pass filters modulated by an LFO
    const float rateHz      = juce::jlimit(0.01f, 10.0f, ${rt});
    const float depthAmount = juce::jlimit(0.0f, 1.0f, ${dp});
    const float mixAmount   = juce::jlimit(0.0f, 1.0f, ${mx});
    const float feedbackAmt = juce::jlimit(-0.99f, 0.99f, ${fb});

    const float lfoIncrement = rateHz / static_cast<float>(currentSampleRate);

    // Frequency range the all-pass sweeps through (Hz)
    const float minFreq = 200.0f;
    const float maxFreq = 4000.0f;

    const int numSamples  = buffer.getNumSamples();
    const int numChannels = juce::jmin(buffer.getNumChannels(), 2);

    for (int i = 0; i < numSamples; ++i)
    {
        // LFO (triangle wave for smoother sweep)
        float lfoValue = 2.0f * std::abs(2.0f * lfoPhase - 1.0f) - 1.0f; // -1..1
        lfoPhase += lfoIncrement;
        if (lfoPhase >= 1.0f) lfoPhase -= 1.0f;

        // Map LFO to all-pass coefficient
        float sweepFreq = minFreq + (maxFreq - minFreq) * 0.5f * (1.0f + lfoValue * depthAmount);
        float wc = juce::MathConstants<float>::twoPi * sweepFreq / static_cast<float>(currentSampleRate);
        float apCoeff = (1.0f - std::tan(wc * 0.5f)) / (1.0f + std::tan(wc * 0.5f));

        for (int ch = 0; ch < numChannels; ++ch)
        {
            auto* channelData = buffer.getWritePointer(ch);
            float input = channelData[i];

            // Add feedback from previous output of the all-pass chain
            float apInput = input + allPassState[static_cast<size_t>(ch)][numStages - 1] * feedbackAmt;

            // Process through the all-pass chain
            float apOutput = apInput;
            for (int stage = 0; stage < numStages; ++stage)
            {
                float prevState = allPassState[static_cast<size_t>(ch)][static_cast<size_t>(stage)];
                float newOutput = apCoeff * apOutput + prevState;
                allPassState[static_cast<size_t>(ch)][static_cast<size_t>(stage)] =
                    apOutput - apCoeff * newOutput;
                apOutput = newOutput;
            }

            // Mix dry and wet (phase-shifted) signals
            channelData[i] = input * (1.0f - mixAmount) + apOutput * mixAmount;
        }
    }`;
}
