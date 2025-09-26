// Minimal unified diff applier (single-file diffs) for applying backend suggestions.
// Supports multiple hunks; ignores file rename metadata.

export function applyUnifiedDiff(original: string, diff: string): string | null {
  try {
    const origLines = original.split(/\n/);
    let newLines: string[] = [];
    const lines = diff.split(/\n/);
    let i = 0;
    let idxOrig = 0; // 0-based index into origLines

    const hunkHeaderRe = /^@@ -([0-9]+)(?:,([0-9]+))? \+([0-9]+)(?:,([0-9]+))? @@/;

    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('@@')) {
        const m = hunkHeaderRe.exec(line);
        if (!m) { i++; continue; }
        const startOld = parseInt(m[1], 10); // 1-based
        // const countOld = m[2] ? parseInt(m[2],10) : 1; // not strictly needed
        // const startNew = parseInt(m[3],10);
        i++;
        // push unchanged lines before hunk
        while (idxOrig < startOld - 1) { newLines.push(origLines[idxOrig++] ?? ''); }
        // process hunk body until next hunk or EOF
        while (i < lines.length && !lines[i].startsWith('@@')) {
          const l = lines[i];
            if (l.startsWith('---') || l.startsWith('+++')) { i++; continue; }
          if (l.startsWith('+')) {
            newLines.push(l.substring(1));
          } else if (l.startsWith('-')) {
            // remove: advance original pointer
            idxOrig++;
          } else if (l.startsWith(' ')) {
            newLines.push(origLines[idxOrig++] ?? '');
          } else if (l.trim()==='') {
            // blank context line (treat as space)
            newLines.push('');
          } else {
            break;
          }
          i++;
        }
      } else {
        i++;
      }
    }
    // append remaining original lines
    while (idxOrig < origLines.length) newLines.push(origLines[idxOrig++]);
    return newLines.join('\n');
  } catch {
    return null;
  }
}
