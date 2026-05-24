export default function resolveUniqueDocumentName(
  baseName: string,
  existingNames: Iterable<string>,
): string {
  const takenNames = new Set(existingNames);
  if (!takenNames.has(baseName)) return baseName;

  for (let index = 1; ; index += 1) {
    const candidate = `${baseName}(${index})`;
    if (!takenNames.has(candidate)) return candidate;
  }
}
