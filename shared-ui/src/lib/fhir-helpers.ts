interface HumanName {
  use?: string
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
  period?: { start?: string; end?: string }
}

/** Get the display name from a FHIR HumanName array */
export function formatHumanName(name?: HumanName[]): string {
  if (!name?.length) return "Unknown"
  const n = name[0]
  const parts: string[] = []
  if (n.prefix?.length) parts.push(n.prefix.join(" "))
  if (n.given?.length) parts.push(n.given.join(" "))
  if (n.family) parts.push(n.family)
  return parts.join(" ") || n.text || "Unknown"
}
