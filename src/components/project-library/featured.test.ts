import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { FEATURED_PROJECT_ID } from './featured';

test('featured project is the Resume Builder', () => {
  expect(FEATURED_PROJECT_ID).toBe('resume');
});

test('featured project exists in both languages', () => {
  for (const base of ['src/content/projects', 'src/content-id/projects']) {
    expect(existsSync(`${base}/${FEATURED_PROJECT_ID}.mdx`)).toBe(true);
  }
});
