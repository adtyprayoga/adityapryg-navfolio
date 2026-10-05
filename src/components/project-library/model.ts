import { sortBlogPostsForArchive } from '../../utils/content-dates';

export type Shelf = 'professional' | 'personal' | 'learning';
export const shelfOrder: Shelf[] = ['professional', 'personal', 'learning'];

export interface BookEntry {
  id: string;
  data: {
    date: Date;
    shelf?: Shelf;
    draft?: boolean;
    sticky?: boolean | number;
  };
}

export function groupBooks<T extends BookEntry>(entries: T[]): { id: Shelf; books: T[] }[] {
  const sorted = sortBlogPostsForArchive(
    entries.filter((entry) => entry.id !== 'index' && !entry.data.draft),
  );
  return shelfOrder
    .map((id) => ({ id, books: sorted.filter((entry) => (entry.data.shelf ?? 'personal') === id) }))
    .filter((group) => group.books.length);
}

export function readBookId(url: URL, allowedIds: ReadonlySet<string>): string | null {
  const id = url.searchParams.get('book');
  return id && allowedIds.has(id) ? id : null;
}

export function withBookId(url: URL, id: string | null): URL {
  const next = new URL(url.href);
  if (id) next.searchParams.set('book', id);
  else next.searchParams.delete('book');
  return next;
}
