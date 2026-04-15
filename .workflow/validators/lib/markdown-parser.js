/**
 * Minimal markdown parser for workflow validators.
 * Extracts YAML frontmatter and top-level sections from markdown files.
 */

/**
 * Parse a markdown file string.
 * @param {string} content
 * @returns {{ frontmatter: Record<string,string>, sections: Record<string,string> }}
 */
function parseMarkdown(content) {
  const frontmatter = {};
  let body = content;

  // Extract YAML frontmatter between --- delimiters
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const fmRaw = fmMatch[1];
    body = fmMatch[2];

    for (const line of fmRaw.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key) frontmatter[key] = value;
    }
  }

  // Extract sections — lines starting with ## (h2)
  const sections = {};
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const indices = [];

  while ((match = sectionRegex.exec(body)) !== null) {
    indices.push({ title: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index;
    const end = i + 1 < indices.length ? indices[i + 1].index : body.length;
    let sectionBody = body.slice(start, end);
    // Remove the heading line itself
    sectionBody = sectionBody.replace(/^## .+\n?/, '').trim();
    // Strip HTML comments
    sectionBody = sectionBody.replace(/<!--[\s\S]*?-->/g, '').trim();
    sections[indices[i].title] = sectionBody;
  }

  return { frontmatter, sections };
}

/**
 * Count lines matching a pattern in a string.
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {number}
 */
function countMatches(text, pattern) {
  const matches = text.match(new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g')));
  return matches ? matches.length : 0;
}

module.exports = { parseMarkdown, countMatches };
