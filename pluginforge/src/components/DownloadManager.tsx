import { useState } from "react";
import type { PluginProject } from "@/types/plugin";
import { generatePluginProject } from "@/lib/plugin-generator";

interface DownloadManagerProps {
  project: PluginProject;
}

export default function DownloadManager({ project }: DownloadManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 800));

    try {
      const { default: JSZip } = await import("jszip");
      const { saveAs } = await import("file-saver");

      const pluginFiles = generatePluginProject(project);
      const zip = new JSZip();

      const folder = zip.folder(pluginFiles.projectName);
      if (!folder) throw new Error("Failed to create zip folder");

      for (const file of pluginFiles.files) {
        // Handle nested paths
        const parts = file.path.split("/");
        if (parts.length > 1) {
          let current = folder;
          for (let i = 0; i < parts.length - 1; i++) {
            current = current.folder(parts[i])!;
          }
          current.file(parts[parts.length - 1], file.content);
        } else {
          folder.file(file.path, file.content);
        }
      }

      // Add sample file if present
      if (project.sampleFile) {
        const resourcesFolder = folder.folder("Resources");
        resourcesFolder?.file("sample.wav", project.sampleFile.arrayBuffer);
      }

      // Add build script
      folder.file(
        "build.sh",
        `#!/bin/bash
# ${project.name} - Build Script for macOS
# Requirements: Xcode and CMake (brew install cmake)

set -e

echo "Building ${project.name}..."
echo "========================="

# Create build directory
mkdir -p build
cd build

# Configure with CMake
cmake .. -G Xcode

# Build Release configuration
cmake --build . --config Release

echo ""
echo "Build complete!"
echo ""
echo "Plugin locations:"
echo "  AU:   ~/Library/Audio/Plug-Ins/Components/${project.name}.component"
echo "  VST3: ~/Library/Audio/Plug-Ins/VST3/${project.name}.vst3"
echo ""
echo "Restart your DAW to load the new plugin."
`,
      );

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${pluginFiles.projectName}.zip`);

      setGenerated(true);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to generate download. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const pluginFiles = generatePluginProject(project);

  return (
    <div className="glass-panel glow-border p-6">
      <h3 className="text-lg font-semibold text-white mb-2">Download Plugin Project</h3>
      <p className="text-sm text-surface-400 mb-6">
        Get a complete JUCE C++ project ready to compile on macOS. Includes CMake build system,
        source code, and build instructions.
      </p>

      {/* Project summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-800/50 rounded-xl p-3">
          <p className="text-xs text-surface-500">Format</p>
          <p className="text-sm font-medium text-white">{project.format}</p>
        </div>
        <div className="bg-surface-800/50 rounded-xl p-3">
          <p className="text-xs text-surface-500">Category</p>
          <p className="text-sm font-medium text-white">{project.category}</p>
        </div>
        <div className="bg-surface-800/50 rounded-xl p-3">
          <p className="text-xs text-surface-500">Parameters</p>
          <p className="text-sm font-medium text-white">{project.parameters.length}</p>
        </div>
        <div className="bg-surface-800/50 rounded-xl p-3">
          <p className="text-xs text-surface-500">Files</p>
          <p className="text-sm font-medium text-white">{pluginFiles.files.length + 1}</p>
        </div>
      </div>

      {/* File list */}
      <div className="mb-6">
        <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Project Files</p>
        <div className="bg-surface-800/30 rounded-xl p-3 space-y-1 font-mono text-sm">
          <div className="text-surface-300">
            <span className="text-brand-400">{pluginFiles.projectName}/</span>
          </div>
          {pluginFiles.files.map((file) => (
            <div key={file.path} className="text-surface-400 pl-4">
              {file.path}
            </div>
          ))}
          <div className="text-surface-400 pl-4">build.sh</div>
          {project.sampleFile && (
            <div className="text-surface-400 pl-4">Resources/sample.wav</div>
          )}
        </div>
      </div>

      {/* Build instructions preview */}
      <div className="mb-6 bg-surface-800/30 rounded-xl p-4">
        <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Quick Build Guide</p>
        <div className="font-mono text-sm space-y-1">
          <p className="text-surface-500"># 1. Install prerequisites</p>
          <p className="text-green-400">brew install cmake</p>
          <p className="text-surface-500 mt-2"># 2. Extract and build</p>
          <p className="text-green-400">unzip {pluginFiles.projectName}.zip</p>
          <p className="text-green-400">cd {pluginFiles.projectName}</p>
          <p className="text-green-400">chmod +x build.sh && ./build.sh</p>
          <p className="text-surface-500 mt-2"># 3. Open your DAW and scan for new plugins</p>
        </div>
      </div>

      {/* Download button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="btn-primary flex items-center gap-2 text-lg px-8 py-3 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download for macOS
            </>
          )}
        </button>

        {generated && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Downloaded! Extract and run build.sh on your Mac.
          </div>
        )}
      </div>
    </div>
  );
}
