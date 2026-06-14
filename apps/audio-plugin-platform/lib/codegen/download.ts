import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { PluginProject } from '@/types/plugin';
import { generateJuceProject } from './juce';

/**
 * Generates a complete JUCE audio plugin project and triggers a browser
 * download of the resulting ZIP archive.
 *
 * The archive mirrors the directory layout expected by CMake so the user
 * can unzip, run `cmake -B build`, and compile immediately.
 */
export async function downloadProject(project: PluginProject): Promise<void> {
  const files = generateJuceProject(project);
  const zip = new JSZip();

  const rootFolder = `${project.name}-juce-project`;

  for (const [path, content] of files) {
    zip.file(`${rootFolder}/${path}`, content);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(blob, `${project.name}-juce-project.zip`);
}
