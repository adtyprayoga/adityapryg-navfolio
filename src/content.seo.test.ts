import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';

const projectDirs = ['src/content/projects', 'src/content-id/projects'];

function frontmatter(path: string) {
  const match = readFileSync(path, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? '';
}

test('every project description is at most 160 characters', () => {
  for (const dir of projectDirs) {
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.mdx'))) {
      const path = `${dir}/${file}`;
      const description = frontmatter(path).match(/^description: '(.*)'$/m)?.[1];
      if (description === undefined) continue;
      expect({ path, length: description.length }).toEqual({
        path,
        length: Math.min(description.length, 160),
      });
    }
  }
});

test('the Resume Builder has an seoTitle in both languages', () => {
  for (const dir of projectDirs) {
    expect(frontmatter(`${dir}/resume.mdx`)).toMatch(/^seoTitle: '.+'$/m);
  }
});
