import { expect, test } from 'bun:test';
import { groupBooks, readBookId, withBookId } from './model';

test('shelves exclude drafts and index while preserving archive order', () => {
  const entry = (id: string, date: string, data: Record<string, unknown> = {}) => ({
    id,
    data: { date: new Date(date), ...data },
  });
  const input = [
    entry('index', '2026-01-01'),
    entry('hidden', '2026-01-01', { draft: true }),
    entry('old', '2024-01-01'),
    entry('new', '2026-01-01'),
    entry('pinned', '2023-01-01', { sticky: true }),
    entry('work', '2025-01-01', { shelf: 'professional' }),
    entry('study', '2024-01-01', { shelf: 'learning' }),
  ];
  expect(groupBooks(input).map((group) => [group.id, group.books.map((book) => book.id)])).toEqual([
    ['professional', ['work']],
    ['personal', ['pinned', 'new', 'old']],
    ['learning', ['study']],
  ]);
  expect(input[0]?.id).toEqual('index');
});

test('reader URLs preserve locale, unrelated parameters, and hash', () => {
  const source = new URL('https://example.test/id/projects/?ref=home#shelves');
  const opened = withBookId(source, 'weekly-journal-bot');
  expect(opened.pathname).toEqual('/id/projects/');
  expect(opened.searchParams.get('ref')).toEqual('home');
  expect(opened.hash).toEqual('#shelves');
  expect(withBookId(opened, null).href).toEqual(source.href);
  expect(readBookId(opened, new Set(['bukubook']))).toEqual(null);
  expect(readBookId(opened, new Set(['weekly-journal-bot']))).toEqual('weekly-journal-bot');
});
