export function extractFirstJsonObject(raw: string): string {
  // Find first '{' and last '}' and slice.
  // This handles cases like: "Sure! { ...json... }"
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in model output");
  }
  return raw.slice(first, last + 1);
}
