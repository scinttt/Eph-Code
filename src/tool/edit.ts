import { z } from "zod"
import { Tool } from "./tool"
import * as fs from "fs/promises"
import * as path from "path"
import { createTwoFilesPatch } from "diff"

/** EditTool: search-replace editing with multiple fallback matching strategies */
export const EditTool = Tool.define("edit", {
  description: "Replace specific text in a file. oldString must match exactly (or closely). Use replaceAll to replace all occurrences.",
  parameters: z.object({
    filePath: z.string().describe("Absolute path to the file to modify"),
    oldString: z.string().describe("The text to replace"),
    newString: z.string().describe("The text to replace it with (must be different from oldString)"),
    replaceAll: z.boolean().optional().describe("Replace all occurrences of oldString (default false)"),
  }),
  execute: async (args, ctx) => {
    if (args.oldString === args.newString) {
      return { title: args.filePath, output: "Error: oldString and newString are identical." }
    }

    // oldString empty = create new file
    if (args.oldString === "") {
      const dir = path.dirname(args.filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(args.filePath, args.newString)
      const diff = createTwoFilesPatch(args.filePath, args.filePath, "", args.newString)
      return { title: args.filePath, output: `File created successfully.\n\n${trimDiff(diff)}` }
    }

    const content = await fs.readFile(args.filePath, "utf-8")
    const newContent = replace(content, args.oldString, args.newString, args.replaceAll)
    await fs.writeFile(args.filePath, newContent)

    const diff = createTwoFilesPatch(
      args.filePath, args.filePath,
      normalizeLineEndings(content),
      normalizeLineEndings(newContent),
    )
    return { title: args.filePath, output: `Edit applied successfully.\n\n${trimDiff(diff)}` }
  },
})

// --- Replacer types and strategies (ported from OpenCode) ---

type Replacer = (content: string, find: string) => Generator<string, void, unknown>

const SINGLE_CANDIDATE_SIMILARITY_THRESHOLD = 0.0
const MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD = 0.3

function normalizeLineEndings(text: string): string {
  return text.replaceAll("\r\n", "\n")
}

/** Levenshtein distance for similarity comparison */
function levenshtein(a: string, b: string): number {
  if (a === "" || b === "") return Math.max(a.length, b.length)
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(matrix[i - 1]![j]! + 1, matrix[i]![j - 1]! + 1, matrix[i - 1]![j - 1]! + cost)
    }
  }
  return matrix[a.length]![b.length]!
}

/** Strategy 1: Exact match */
const SimpleReplacer: Replacer = function* (_content, find) {
  yield find
}

/** Strategy 2: Match lines after trimming whitespace on each line */
const LineTrimmedReplacer: Replacer = function* (content, find) {
  const originalLines = content.split("\n")
  const searchLines = find.split("\n")
  if (searchLines.at(-1) === "") searchLines.pop()

  for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
    let matches = true
    for (let j = 0; j < searchLines.length; j++) {
      if (originalLines[i + j]!.trim() !== searchLines[j]!.trim()) {
        matches = false
        break
      }
    }
    if (matches) {
      let matchStartIndex = 0
      for (let k = 0; k < i; k++) matchStartIndex += originalLines[k]!.length + 1
      let matchEndIndex = matchStartIndex
      for (let k = 0; k < searchLines.length; k++) {
        matchEndIndex += originalLines[i + k]!.length
        if (k < searchLines.length - 1) matchEndIndex += 1
      }
      yield content.substring(matchStartIndex, matchEndIndex)
    }
  }
}

/** Strategy 3: Match by first/last line anchors with similarity scoring */
const BlockAnchorReplacer: Replacer = function* (content, find) {
  const originalLines = content.split("\n")
  const searchLines = find.split("\n")
  if (searchLines.length < 3) return
  if (searchLines.at(-1) === "") searchLines.pop()

  const firstLineSearch = searchLines[0]!.trim()
  const lastLineSearch = searchLines.at(-1)!.trim()
  const searchBlockSize = searchLines.length

  const candidates: Array<{ startLine: number; endLine: number }> = []
  for (let i = 0; i < originalLines.length; i++) {
    if (originalLines[i]!.trim() !== firstLineSearch) continue
    for (let j = i + 2; j < originalLines.length; j++) {
      if (originalLines[j]!.trim() === lastLineSearch) {
        candidates.push({ startLine: i, endLine: j })
        break
      }
    }
  }

  if (candidates.length === 0) return

  const extractBlock = (startLine: number, endLine: number): string => {
    let matchStartIndex = 0
    for (let k = 0; k < startLine; k++) matchStartIndex += originalLines[k]!.length + 1
    let matchEndIndex = matchStartIndex
    for (let k = startLine; k <= endLine; k++) {
      matchEndIndex += originalLines[k]!.length
      if (k < endLine) matchEndIndex += 1
    }
    return content.substring(matchStartIndex, matchEndIndex)
  }

  const calcSimilarity = (startLine: number, endLine: number): number => {
    const actualBlockSize = endLine - startLine + 1
    let similarity = 0
    const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2)
    if (linesToCheck > 0) {
      for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
        const originalLine = originalLines[startLine + j]!.trim()
        const searchLine = searchLines[j]!.trim()
        const maxLen = Math.max(originalLine.length, searchLine.length)
        if (maxLen === 0) continue
        const distance = levenshtein(originalLine, searchLine)
        similarity += (1 - distance / maxLen) / linesToCheck
      }
    } else {
      similarity = 1.0
    }
    return similarity
  }

  if (candidates.length === 1) {
    const c = candidates[0]!
    const similarity = calcSimilarity(c.startLine, c.endLine)
    if (similarity >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
      yield extractBlock(c.startLine, c.endLine)
    }
    return
  }

  let bestMatch: { startLine: number; endLine: number } | null = null
  let maxSimilarity = -1
  for (const candidate of candidates) {
    const similarity = calcSimilarity(candidate.startLine, candidate.endLine)
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      bestMatch = candidate
    }
  }

  if (maxSimilarity >= MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD && bestMatch) {
    yield extractBlock(bestMatch.startLine, bestMatch.endLine)
  }
}

/** Strategy 4: Normalize all whitespace before matching */
const WhitespaceNormalizedReplacer: Replacer = function* (content, find) {
  const normalizeWhitespace = (text: string) => text.replace(/\s+/g, " ").trim()
  const normalizedFind = normalizeWhitespace(find)
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (normalizeWhitespace(line) === normalizedFind) {
      yield line
    } else {
      const normalizedLine = normalizeWhitespace(line)
      if (normalizedLine.includes(normalizedFind)) {
        const words = find.trim().split(/\s+/)
        if (words.length > 0) {
          const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")
          try {
            const regex = new RegExp(pattern)
            const match = line.match(regex)
            if (match && match[0]) yield match[0]
          } catch {}
        }
      }
    }
  }

  const findLines = find.split("\n")
  if (findLines.length > 1) {
    for (let i = 0; i <= lines.length - findLines.length; i++) {
      const block = lines.slice(i, i + findLines.length)
      if (normalizeWhitespace(block.join("\n")) === normalizedFind) {
        yield block.join("\n")
      }
    }
  }
}

/** Strategy 5: Remove common indentation before matching */
const IndentationFlexibleReplacer: Replacer = function* (content, find) {
  const removeIndentation = (text: string) => {
    const lines = text.split("\n")
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
    if (nonEmptyLines.length === 0) return text
    const minIndent = Math.min(
      ...nonEmptyLines.map((line) => {
        const match = line.match(/^(\s*)/)
        return match ? match[1]!.length : 0
      }),
    )
    return lines.map((line) => (line.trim().length === 0 ? line : line.slice(minIndent))).join("\n")
  }

  const normalizedFind = removeIndentation(find)
  const contentLines = content.split("\n")
  const findLines = find.split("\n")

  for (let i = 0; i <= contentLines.length - findLines.length; i++) {
    const block = contentLines.slice(i, i + findLines.length).join("\n")
    if (removeIndentation(block) === normalizedFind) yield block
  }
}

/** Strategy 6: Handle escape sequence differences */
const EscapeNormalizedReplacer: Replacer = function* (content, find) {
  const unescapeString = (str: string): string => {
    return str.replace(/\\(n|t|r|'|"|`|\\|\n|\$)/g, (match, c) => {
      switch (c) {
        case "n": return "\n"
        case "t": return "\t"
        case "r": return "\r"
        case "'": return "'"
        case '"': return '"'
        case "`": return "`"
        case "\\": return "\\"
        case "\n": return "\n"
        case "$": return "$"
        default: return match
      }
    })
  }

  const unescapedFind = unescapeString(find)
  if (content.includes(unescapedFind)) yield unescapedFind

  const lines = content.split("\n")
  const findLines = unescapedFind.split("\n")
  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join("\n")
    if (unescapeString(block) === unescapedFind) yield block
  }
}

/** Strategy 7: Yield all exact matches for replaceAll support */
const MultiOccurrenceReplacer: Replacer = function* (content, find) {
  let startIndex = 0
  while (true) {
    const index = content.indexOf(find, startIndex)
    if (index === -1) break
    yield find
    startIndex = index + find.length
  }
}

/** Strategy 8: Try matching after trimming boundaries */
const TrimmedBoundaryReplacer: Replacer = function* (content, find) {
  const trimmedFind = find.trim()
  if (trimmedFind === find) return
  if (content.includes(trimmedFind)) yield trimmedFind

  const lines = content.split("\n")
  const findLines = find.split("\n")
  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join("\n")
    if (block.trim() === trimmedFind) yield block
  }
}

/** Strategy 9: Context-aware matching using first/last line anchors + 50% middle similarity */
const ContextAwareReplacer: Replacer = function* (content, find) {
  const findLines = find.split("\n")
  if (findLines.length < 3) return
  if (findLines.at(-1) === "") findLines.pop()

  const contentLines = content.split("\n")
  const firstLine = findLines[0]!.trim()
  const lastLine = findLines.at(-1)!.trim()

  for (let i = 0; i < contentLines.length; i++) {
    if (contentLines[i]!.trim() !== firstLine) continue
    for (let j = i + 2; j < contentLines.length; j++) {
      if (contentLines[j]!.trim() === lastLine) {
        const blockLines = contentLines.slice(i, j + 1)
        if (blockLines.length === findLines.length) {
          let matchingLines = 0
          let totalNonEmptyLines = 0
          for (let k = 1; k < blockLines.length - 1; k++) {
            const blockLine = blockLines[k]!.trim()
            const findLine = findLines[k]!.trim()
            if (blockLine.length > 0 || findLine.length > 0) {
              totalNonEmptyLines++
              if (blockLine === findLine) matchingLines++
            }
          }
          if (totalNonEmptyLines === 0 || matchingLines / totalNonEmptyLines >= 0.5) {
            yield blockLines.join("\n")
            break
          }
        }
        break
      }
    }
  }
}

/** Remove common leading whitespace from diff output */
function trimDiff(diff: string): string {
  const lines = diff.split("\n")
  const contentLines = lines.filter(
    (line) =>
      (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) &&
      !line.startsWith("---") &&
      !line.startsWith("+++"),
  )
  if (contentLines.length === 0) return diff

  let min = Infinity
  for (const line of contentLines) {
    const c = line.slice(1)
    if (c.trim().length > 0) {
      const match = c.match(/^(\s*)/)
      if (match) min = Math.min(min, match[1]!.length)
    }
  }
  if (min === Infinity || min === 0) return diff

  return lines.map((line) => {
    if (
      (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) &&
      !line.startsWith("---") &&
      !line.startsWith("+++")
    ) {
      return line[0] + line.slice(1).slice(min)
    }
    return line
  }).join("\n")
}

/** Core replace function: tries 9 strategies in sequence until one works */
function replace(content: string, oldString: string, newString: string, replaceAll = false): string {
  if (oldString === newString) {
    throw new Error("No changes to apply: oldString and newString are identical.")
  }

  let notFound = true
  for (const replacer of [
    SimpleReplacer,
    LineTrimmedReplacer,
    BlockAnchorReplacer,
    WhitespaceNormalizedReplacer,
    IndentationFlexibleReplacer,
    EscapeNormalizedReplacer,
    TrimmedBoundaryReplacer,
    ContextAwareReplacer,
    MultiOccurrenceReplacer,
  ]) {
    for (const search of replacer(content, oldString)) {
      const index = content.indexOf(search)
      if (index === -1) continue
      notFound = false
      if (replaceAll) return content.replaceAll(search, newString)
      const lastIndex = content.lastIndexOf(search)
      if (index !== lastIndex) continue
      return content.substring(0, index) + newString + content.substring(index + search.length)
    }
  }

  if (notFound) {
    throw new Error("Could not find oldString in the file. It must match exactly, including whitespace, indentation, and line endings.")
  }
  throw new Error("Found multiple matches for oldString. Provide more surrounding context to make the match unique.")
}
