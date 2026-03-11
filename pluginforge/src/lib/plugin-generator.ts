import type { PluginProject, GeneratedPluginFiles, PluginParameter } from "@/types/plugin";

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

function generateParameterEnum(params: PluginParameter[]): string {
  return params.map((p, i) => `    ${p.id} = ${i}`).join(",\n");
}

function generateParameterSetup(params: PluginParameter[]): string {
  return params
    .map(
      (p) =>
        `        layout.add(std::make_unique<juce::AudioParameterFloat>(
            "${p.id}", "${p.name}",
            juce::NormalisableRange<float>(${p.min}f, ${p.max}f, ${p.step}f),
            ${p.defaultValue}f, "${p.unit}"))`,
    )
    .join(";\n") + ";";
}

function generateParameterPointers(params: PluginParameter[]): string {
  return params
    .map(
      (p) =>
        `    ${p.id}Param = dynamic_cast<juce::AudioParameterFloat*>(apvts.getParameter("${p.id}"));`,
    )
    .join("\n");
}

function generateParameterMembers(params: PluginParameter[]): string {
  return params
    .map((p) => `    juce::AudioParameterFloat* ${p.id}Param = nullptr;`)
    .join("\n");
}

function generateProcessorHeader(project: PluginProject): string {
  const className = sanitizeName(project.name) + "AudioProcessor";
  return `#pragma once
#include <JuceHeader.h>

class ${className} : public juce::AudioProcessor
{
public:
    ${className}();
    ~${className}() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return ${project.category === "Synthesizer" || project.category === "Sampler" ? "true" : "false"}; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    juce::AudioProcessorValueTreeState apvts;

private:
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

${generateParameterMembers(project.parameters)}

    double currentSampleRate = 44100.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${className})
};`;
}

function generateProcessorSource(project: PluginProject): string {
  const className = sanitizeName(project.name) + "AudioProcessor";
  return `#include "PluginProcessor.h"
#include "PluginEditor.h"

${className}::${className}()
    : AudioProcessor(BusesProperties()
          .withInput("Input", juce::AudioChannelSet::stereo(), true)
          .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
${generateParameterPointers(project.parameters)}
}

${className}::~${className}() {}

juce::AudioProcessorValueTreeState::ParameterLayout ${className}::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

${generateParameterSetup(project.parameters)}

    return layout;
}

void ${className}::prepareToPlay(double sampleRate, int /*samplesPerBlock*/)
{
    currentSampleRate = sampleRate;
    // Initialize DSP components here
}

void ${className}::releaseResources() {}

void ${className}::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& /*midiMessages*/)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // Read parameter values
${project.parameters.map((p) => `    float ${p.id} = ${p.id}Param->get();`).join("\n")}

    // === DSP Processing ===
    // TODO: Implement your audio processing here
    // See the DSP reference code in the README for guidance
    auto numChannels = buffer.getNumChannels();
    auto numSamples = buffer.getNumSamples();

    for (int channel = 0; channel < numChannels; ++channel)
    {
        auto* channelData = buffer.getWritePointer(channel);
        for (int sample = 0; sample < numSamples; ++sample)
        {
            // Process each sample
            channelData[sample] = channelData[sample]; // passthrough - replace with your DSP
        }
    }
}

juce::AudioProcessorEditor* ${className}::createEditor()
{
    return new ${className.replace("Processor", "Editor")}(*this);
}

void ${className}::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void ${className}::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState.get() != nullptr)
        if (xmlState->hasTagName(apvts.state.getType()))
            apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new ${className}();
}`;
}

function generateEditorHeader(project: PluginProject): string {
  const processorClass = sanitizeName(project.name) + "AudioProcessor";
  const editorClass = sanitizeName(project.name) + "AudioProcessorEditor";
  return `#pragma once
#include <JuceHeader.h>
#include "PluginProcessor.h"

class ${editorClass} : public juce::AudioProcessorEditor
{
public:
    explicit ${editorClass}(${processorClass}&);
    ~${editorClass}() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    ${processorClass}& audioProcessor;

${project.parameters
  .map(
    (p) => `    juce::Slider ${p.id}Slider;
    juce::Label ${p.id}Label;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> ${p.id}Attachment;`,
  )
  .join("\n")}

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${editorClass})
};`;
}

function generateEditorSource(project: PluginProject): string {
  const processorClass = sanitizeName(project.name) + "AudioProcessor";
  const editorClass = sanitizeName(project.name) + "AudioProcessorEditor";
  const numParams = project.parameters.length;
  const cols = Math.min(numParams, 4);
  const rows = Math.ceil(numParams / cols);
  const width = cols * 120 + 40;
  const height = rows * 140 + 80;

  return `#include "PluginProcessor.h"
#include "PluginEditor.h"

${editorClass}::${editorClass}(${processorClass}& p)
    : AudioProcessorEditor(&p), audioProcessor(p)
{
${project.parameters
  .map(
    (p) => `    ${p.id}Slider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    ${p.id}Slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 80, 20);
    addAndMakeVisible(${p.id}Slider);
    ${p.id}Label.setText("${p.label}", juce::dontSendNotification);
    ${p.id}Label.setJustificationType(juce::Justification::centred);
    addAndMakeVisible(${p.id}Label);
    ${p.id}Attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, "${p.id}", ${p.id}Slider);`,
  )
  .join("\n\n")}

    setSize(${width}, ${height});
}

${editorClass}::~${editorClass}() {}

void ${editorClass}::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff1a1a2e));
    g.setColour(juce::Colours::white);
    g.setFont(18.0f);
    g.drawText("${project.name}", getLocalBounds().removeFromTop(40),
               juce::Justification::centred, true);
}

void ${editorClass}::resized()
{
    auto area = getLocalBounds().reduced(20);
    area.removeFromTop(40); // Title space

    const int cols = ${cols};
    const int knobWidth = area.getWidth() / cols;
    const int knobHeight = 120;

    int col = 0;
    int row = 0;

${project.parameters
  .map(
    (p) => `    {
        auto knobArea = juce::Rectangle<int>(
            area.getX() + col * knobWidth,
            area.getY() + row * knobHeight,
            knobWidth, knobHeight);
        ${p.id}Label.setBounds(knobArea.removeFromTop(20));
        ${p.id}Slider.setBounds(knobArea);
        if (++col >= cols) { col = 0; ++row; }
    }`,
  )
  .join("\n")}
}`;
}

function generateCMakeLists(project: PluginProject): string {
  const safeName = sanitizeName(project.name);
  const isInstrument = project.category === "Synthesizer" || project.category === "Sampler";

  let formats = "";
  switch (project.format) {
    case "AU":
      formats = "AU";
      break;
    case "VST3":
      formats = "VST3";
      break;
    case "AU+VST3":
    default:
      formats = "AU VST3";
      break;
  }

  return `cmake_minimum_required(VERSION 3.22)
project(${safeName} VERSION 1.0.0)

# Download JUCE automatically
include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 7.0.12
)
FetchContent_MakeAvailable(JUCE)

juce_add_plugin(${safeName}
    COMPANY_NAME "${project.manufacturer}"
    IS_SYNTH ${isInstrument ? "TRUE" : "FALSE"}
    NEEDS_MIDI_INPUT ${isInstrument ? "TRUE" : "FALSE"}
    NEEDS_MIDI_OUTPUT FALSE
    PLUGIN_MANUFACTURER_CODE Plgf
    PLUGIN_CODE ${safeName.substring(0, 4).padEnd(4, "x")}
    FORMATS ${formats}
    PRODUCT_NAME "${project.name}"
    DESCRIPTION "${project.description}"
    BUNDLE_ID "com.pluginforge.${safeName.toLowerCase()}"
    AU_MAIN_TYPE ${isInstrument ? "kAudioUnitType_MusicDevice" : "kAudioUnitType_Effect"}
    COPY_PLUGIN_AFTER_BUILD TRUE
)

target_sources(${safeName}
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
)

target_compile_features(${safeName} PRIVATE cxx_std_17)

target_link_libraries(${safeName}
    PRIVATE
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)`;
}

function generateReadme(project: PluginProject): string {
  return `# ${project.name}

${project.description}

**Category:** ${project.category}
**Format:** ${project.format}
**Manufacturer:** ${project.manufacturer}

## Building on macOS

### Prerequisites

1. **Xcode** (latest version from the Mac App Store)
2. **CMake** 3.22+: \`brew install cmake\`

### Build Steps

\`\`\`bash
# Clone or extract this project
cd ${sanitizeName(project.name)}

# Create build directory
mkdir build && cd build

# Configure (this downloads JUCE automatically)
cmake .. -G Xcode

# Build
cmake --build . --config Release

# Or open in Xcode
open ${sanitizeName(project.name)}.xcodeproj
\`\`\`

### Plugin Installation

After building, the plugins are automatically installed to:
- **AU:** \`~/Library/Audio/Plug-Ins/Components/${project.name}.component\`
- **VST3:** \`~/Library/Audio/Plug-Ins/VST3/${project.name}.vst3\`

### Using in Your DAW

1. Build the plugin using the steps above
2. Open your DAW (Logic Pro, GarageBand, Ableton, etc.)
3. Scan for new plugins (most DAWs do this on startup)
4. Find "${project.name}" in your plugin list

## Parameters

| Parameter | Range | Default | Unit |
|-----------|-------|---------|------|
${project.parameters.map((p) => `| ${p.name} | ${p.min} - ${p.max} | ${p.defaultValue} | ${p.unit} |`).join("\n")}

## DSP Reference

\`\`\`cpp
${project.templateId ? "// See PluginProcessor.cpp for the implementation scaffold" : "// Custom plugin - implement your DSP in PluginProcessor.cpp"}
\`\`\`

${project.aiDescription ? `## AI Design Notes\n\n${project.aiDescription}\n` : ""}

## Project Structure

\`\`\`
${sanitizeName(project.name)}/
├── CMakeLists.txt          # Build configuration (auto-downloads JUCE)
├── README.md               # This file
└── Source/
    ├── PluginProcessor.h   # Audio processor header
    ├── PluginProcessor.cpp # Audio processor (DSP logic)
    ├── PluginEditor.h      # GUI header
    └── PluginEditor.cpp    # GUI implementation
\`\`\`

---
*Generated by PluginForge - Audio Plugin Platform*
`;
}

export function generatePluginProject(project: PluginProject): GeneratedPluginFiles {
  const projectName = sanitizeName(project.name);

  return {
    projectName,
    files: [
      { path: "CMakeLists.txt", content: generateCMakeLists(project) },
      { path: "Source/PluginProcessor.h", content: generateProcessorHeader(project) },
      { path: "Source/PluginProcessor.cpp", content: generateProcessorSource(project) },
      { path: "Source/PluginEditor.h", content: generateEditorHeader(project) },
      { path: "Source/PluginEditor.cpp", content: generateEditorSource(project) },
      { path: "README.md", content: generateReadme(project) },
    ],
  };
}
