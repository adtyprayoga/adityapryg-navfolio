import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';

const projectDirs = ['src/content/projects', 'src/content-id/projects'];

function frontmatter(path: string) {
  const match = readFileSync(path, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? '';
}

// Prettier keeps single quotes unless the text has an apostrophe, so both forms occur.
function descriptionOf(frontmatterText: string) {
  const match = frontmatterText.match(/^description:\s*(['"])(.*)\1\s*$/m);
  if (!match) return undefined;
  return match[1] === "'" ? match[2].replaceAll("''", "'") : match[2];
}

test('reads single- and double-quoted descriptions', () => {
  expect(descriptionOf("description: 'Plain text.'")).toBe('Plain text.');
  expect(descriptionOf('description: "The maker\'s tool."')).toBe("The maker's tool.");
});

test('every project description is at most 160 characters', () => {
  for (const dir of projectDirs) {
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.mdx'))) {
      const path = `${dir}/${file}`;
      const description = descriptionOf(frontmatter(path));
      // A description this test cannot read must fail, not be skipped silently.
      expect({ path, readable: description !== undefined }).toEqual({ path, readable: true });
      expect({ path, length: description!.length }).toEqual({
        path,
        length: Math.min(description!.length, 160),
      });
    }
  }
});

test('the Resume Builder has an seoTitle in both languages', () => {
  for (const dir of projectDirs) {
    expect(frontmatter(`${dir}/resume.mdx`)).toMatch(/^seoTitle: '.+'$/m);
  }
});
