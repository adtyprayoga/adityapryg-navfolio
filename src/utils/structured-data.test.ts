import { expect, test } from 'bun:test';
import { projectSchema, type ProjectSchemaInput } from './structured-data';

const input: ProjectSchemaInput = {
  url: 'https://adityapryg.dev/projects/resume/',
  name: 'Resume Builder',
  description: 'A bilingual resume builder.',
  dateCreated: new Date('2026-11-02'),
  language: 'en',
  links: [
    { href: 'https://resume.lab.adityapryg.dev' },
    { href: 'https://github.com/adtyprayoga/resume' },
  ],
  keywords: ['svelte', 'typescript'],
  authorId: 'https://adityapryg.dev/#person',
};

test('describes the project as a CreativeWork anchored to its page', () => {
  const schema = projectSchema(input);
  expect(schema['@type']).toBe('CreativeWork');
  expect(schema['@id']).toBe('https://adityapryg.dev/projects/resume/#project');
  expect(schema.name).toBe('Resume Builder');
  expect(schema.description).toBe('A bilingual resume builder.');
  expect(schema.url).toBe('https://adityapryg.dev/projects/resume/');
  expect(schema.dateCreated).toBe('2026-11-02T00:00:00.000Z');
  expect(schema.author).toEqual({ '@id': 'https://adityapryg.dev/#person' });
  expect(schema.keywords).toBe('svelte, typescript');
});

test('reports the page language', () => {
  expect(projectSchema(input).inLanguage).toBe('en-US');
  expect(projectSchema({ ...input, language: 'id' }).inLanguage).toBe('id-ID');
});

test('links the project to its live site and repository in order', () => {
  expect(projectSchema(input).sameAs).toEqual([
    'https://resume.lab.adityapryg.dev',
    'https://github.com/adtyprayoga/resume',
  ]);
});

test('omits sameAs when the project has no links', () => {
  expect('sameAs' in projectSchema({ ...input, links: [] })).toBe(false);
});
