/** Only declared defaults prefill a tool form; optional edits remain absent. */
export function initialToolArguments(
  properties: Record<string, { [key: string]: unknown; default?: unknown }>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([, schema]) => schema.default !== undefined)
      .map(([name, schema]) => [name, schema.default]),
  );
}
