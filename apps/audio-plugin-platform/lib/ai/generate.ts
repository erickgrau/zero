import type { AIGenerationRequest, AIGenerationResult } from '@/types/plugin';

const SYSTEM_PROMPT = `You are an audio plugin designer. Given a description of a desired audio plugin, generate a JSON object defining the plugin.

Return ONLY a valid JSON object with these fields:
- "name" (string): A concise, descriptive name for the plugin.
- "type" (string): One of "eq", "compressor", "reverb", "delay", "synth", "distortion", "chorus", or "phaser".
- "description" (string): A 1-3 sentence description of the plugin and its intended use.
- "parameters" (array): An array of parameter objects, each with:
  - "id" (string): kebab-case identifier (e.g. "filter-cutoff")
  - "name" (string): camelCase identifier (e.g. "filterCutoff")
  - "label" (string): Human-readable label (e.g. "Filter Cutoff")
  - "type" (string): One of "float", "int", "bool", or "choice"
  - "min" (number, optional): Minimum value for float/int types
  - "max" (number, optional): Maximum value for float/int types
  - "defaultValue" (number): Default value. For bool, use 0 or 1. For choice, use the index of the default choice.
  - "step" (number, optional): Step increment for float/int types
  - "unit" (string, optional): Unit label like "Hz", "dB", "ms", "%"
  - "choices" (string[], optional): Array of choice labels for "choice" type

Include 4-12 parameters that are musically relevant for the plugin type. Use realistic ranges and defaults based on professional audio plugins.

Do not include any explanation or markdown formatting. Return only the JSON object.`;

/**
 * Generates a plugin definition from a natural-language description using the
 * Anthropic Messages API.
 */
export async function generatePluginFromDescription(
  request: AIGenerationRequest,
): Promise<AIGenerationResult> {
  const model = request.model || 'claude-sonnet-4-20250514';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': request.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: request.description,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Anthropic API request failed (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  const data = await response.json();

  // Extract text content from the response
  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === 'text',
  );

  if (!textBlock?.text) {
    throw new Error('No text content in the API response');
  }

  const raw: string = textBlock.text;

  // Parse JSON -- handle both raw JSON and markdown-fenced JSON
  let jsonString = raw.trim();
  const fenceMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    jsonString = fenceMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error(
      `Failed to parse plugin JSON from model response. Raw text:\n${raw}`,
    );
  }

  const result = parsed as AIGenerationResult;

  // Basic validation
  if (!result.name || !result.type || !Array.isArray(result.parameters)) {
    throw new Error(
      'Invalid plugin definition: missing required fields (name, type, or parameters)',
    );
  }

  const validTypes = [
    'eq',
    'compressor',
    'reverb',
    'delay',
    'synth',
    'distortion',
    'chorus',
    'phaser',
  ];
  if (!validTypes.includes(result.type)) {
    throw new Error(
      `Invalid plugin type "${result.type}". Must be one of: ${validTypes.join(', ')}`,
    );
  }

  return {
    name: result.name,
    type: result.type,
    description: result.description || '',
    parameters: result.parameters,
  };
}
