import { readBookId, withBookId } from './model';
import { createSession } from './session';

type BookContent = {
  title: string;
  date: string;
  tags: string;
  authors: string;
  links: { label: string; href: string }[];
  chapters: HTMLElement[];
};
const initialized = new WeakSet<HTMLDialogElement>();

function textOf(element: Element | null, value: string) {
  if (element) element.textContent = value;
}

export function initBookReader() {
  const root = document.querySelector<HTMLDialogElement>('[data-book-reader]');
  const library = document.querySelector<HTMLElement>('[data-project-library]');
  if (!root || !library || initialized.has(root)) return;
  initialized.add(root);
  const reader = root;
  const labels = JSON.parse(reader.dataset.labels ?? '{}') as Record<string, string>;
  const books = new Map(
    [...library.querySelectorAll<HTMLAnchorElement>('[data-book-link]')].map((link) => [
      link.dataset.bookId!,
      link,
    ]),
  );
  const allowedIds = new Set(books.keys());
  const session = createSession();
  const listeners = new AbortController();
  const listenerOptions = { signal: listeners.signal };
  const cache = new Map<string, BookContent>();
  const status = reader.querySelector<HTMLElement>('[data-reader-status]')!;
  const spread = reader.querySelector<HTMLElement>('[data-reader-spread]')!;
  const error = reader.querySelector<HTMLElement>('[data-reader-error]')!;
  const nav = reader.querySelector<HTMLElement>('[data-reader-nav]')!;
  const page = reader.querySelector<HTMLElement>('[data-reader-page]')!;
  const cover = reader.querySelector<HTMLElement>('[data-reader-cover]')!;
  const chapters = reader.querySelector<HTMLElement>('[data-reader-chapter-buttons]')!;
  const select = reader.querySelector<HTMLSelectElement>('[data-reader-chapters]')!;
  const prev = reader.querySelector<HTMLButtonElement>('[data-reader-previous]')!;
  const next = reader.querySelector<HTMLButtonElement>('[data-reader-next]')!;
  let activeId: string | null = null;
  let activeLink: HTMLAnchorElement | null = null;
  let data: BookContent | null = null;
  let chapter = 0;
  let request: AbortController | null = null;
  let turning = false;
  let closing = false;
  let oldOverflow = '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setStatus(message: string) {
    textOf(status, message);
    status.hidden = !message;
  }

  function updateChapter() {
    if (!data) return;
    const source = data.chapters[chapter];
    if (!source) return;
    const copy = document.importNode(source, true);
    const ids = new Map<string, string>();
    for (const element of [copy, ...copy.querySelectorAll<HTMLElement>('[id]')]) {
      if (!(element instanceof HTMLElement) || !element.id) continue;
      const old = element.id;
      const updated = `reader-${activeId}-${old}`;
      element.id = updated;
      ids.set(old, updated);
    }
    for (const link of copy.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      const id = ids.get(link.getAttribute('href')!.slice(1));
      if (id) link.href = `#${id}`;
    }
    page.replaceChildren(copy);
    page.scrollTop = 0;
    textOf(
      reader.querySelector('[data-reader-progress]'),
      (labels.progress ?? 'Chapter {current} of {total}')
        .replace('{current}', String(chapter + 1))
        .replace('{total}', String(data.chapters.length)),
    );
    select.value = String(chapter);
    prev.disabled = chapter === 0 || turning;
    next.disabled = chapter === data.chapters.length - 1 || turning;
    chapters.querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
      if (index === chapter) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const heading = page.querySelector<HTMLElement>('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }

  function showReading(token: number) {
    if (!session.canRead(token) || !data) return;
    setStatus('');
    error.hidden = true;
    spread.hidden = false;
    nav.hidden = false;
    textOf(reader.querySelector('[data-reader-title]'), data.title);
    textOf(
      reader.querySelector('[data-reader-meta]'),
      [data.date, data.tags, data.authors].filter(Boolean).join(' · '),
    );
    const source = activeLink?.querySelector('[data-book-cover]');
    cover.replaceChildren(...(source ? [document.importNode(source, true)] : []));
    const links = reader.querySelector<HTMLElement>('[data-reader-links]')!;
    links.replaceChildren();
    for (const link of data.links) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      links.append(a);
    }
    select.replaceChildren(
      ...data.chapters.map((item, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = item.dataset.chapterTitle ?? `Chapter ${index + 1}`;
        return option;
      }),
    );
    chapters.replaceChildren(
      ...data.chapters.map((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.chapterIndex = String(index);
        button.textContent = `${String(index + 1).padStart(2, '0')}  ${item.dataset.chapterTitle ?? `Chapter ${index + 1}`}`;
        return button;
      }),
    );
    updateChapter();
  }

  async function fetchBook(token: number, link: HTMLAnchorElement) {
    request?.abort();
    request = new AbortController();
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) throw new Error('Project link must be same-origin');
    let result = cache.get(url.href);
    if (!result) {
      const response = await fetch(url.href, { signal: request.signal });
      if (!response.ok) throw new Error(`Project response ${response.status}`);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const content = doc.querySelector<HTMLElement>('[data-book-content]');
      const meta = doc.querySelector<HTMLElement>('[data-book-meta]');
      const chapters = [...(content?.querySelectorAll<HTMLElement>('[data-book-chapter]') ?? [])];
      if (content?.dataset.projectId !== activeId || !meta || !chapters.length)
        throw new Error('Invalid project book content');
      let links: BookContent['links'] = [];
      try {
        links = JSON.parse(meta.dataset.projectLinks ?? '[]') as BookContent['links'];
      } catch {
        links = [];
      }
      result = {
        title: content.dataset.projectTitle ?? '',
        date: meta.dataset.projectDate ?? '',
        tags: meta.dataset.projectTags ?? '',
        authors: meta.dataset.projectAuthors ?? '',
        links,
        chapters,
      };
      cache.set(url.href, result);
    }
    if (!session.accept(token)) return;
    data = result;
    session.markLoaded(token);
    showReading(token);
  }

  function showError(message: string) {
    spread.hidden = true;
    nav.hidden = true;
    setStatus('');
    textOf(reader.querySelector('[data-reader-error-text]'), message);
    error.hidden = false;
    const pageLink = reader.querySelector<HTMLAnchorElement>('[data-reader-open-page]');
    if (pageLink && activeLink) pageLink.href = activeLink.href;
    reader.querySelector<HTMLButtonElement>('[data-reader-close]')?.focus();
  }

  function startOpening(id: string, trigger?: HTMLAnchorElement) {
    const link = trigger ?? books.get(id);
    if (!link || closing) return;
    session.cancel();
    request?.abort();
    activeId = id;
    activeLink = link;
    chapter = 0;
    data = null;
    error.hidden = true;
    spread.hidden = true;
    nav.hidden = true;
    setStatus(labels.loading ?? 'Opening book…');
    textOf(
      reader.querySelector('[data-reader-title]'),
      link.querySelector('.library-cover-title')?.textContent?.trim() ?? id,
    );
    const token = session.begin();
    if (!reader.open) {
      oldOverflow = document.body.style.overflow;
      reader.showModal();
      document.body.style.overflow = 'hidden';
    }
    reader.querySelector<HTMLButtonElement>('[data-reader-close]')?.focus({ preventScroll: true });
    session.markOpened(token);
    void fetchBook(token, link).catch((cause: unknown) => {
      if (session.accept(token) && !(cause instanceof DOMException && cause.name === 'AbortError'))
        showError(labels.error ?? 'This book could not be opened.');
    });
  }

  async function closeCurrent(fromHistory = false) {
    if (!reader.open || closing) return;
    closing = true;
    session.cancel();
    request?.abort();
    const link = activeLink;
    const id = activeId;
    const exit = reducedMotion.matches
      ? null
      : reader.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(.985)' },
          ],
          { duration: 180, easing: 'ease-in', fill: 'forwards' },
        );
    await exit?.finished.catch(() => undefined);
    const restoreFocus = () => {
      const target = link?.isConnected
        ? link
        : [...document.querySelectorAll<HTMLAnchorElement>('[data-book-link]')].find(
            (candidate) =>
              candidate.dataset.bookId === id &&
              candidate.dataset.bookPlacement === link?.dataset.bookPlacement,
          );
      target?.focus({ preventScroll: true });
      document.removeEventListener('astro:page-load', restoreFocus);
    };
    document.addEventListener('astro:page-load', restoreFocus, { once: true });
    reader.close();
    exit?.cancel();
    document.body.style.overflow = oldOverflow;
    if (!fromHistory && id && readBookId(new URL(location.href), allowedIds) === id) {
      if (history.state?.libraryBook) history.back();
      else history.replaceState(history.state, '', withBookId(new URL(location.href), null));
    }
    window.setTimeout(restoreFocus, 75);
    activeId = null;
    activeLink = null;
    data = null;
    closing = false;
  }

  async function changeChapter(index: number) {
    if (!data || turning || index < 0 || index >= data.chapters.length || index === chapter) return;
    turning = true;
    prev.disabled = true;
    next.disabled = true;
    const fadeOut = reducedMotion.matches
      ? null
      : page.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: 'forwards' });
    await fadeOut?.finished.catch(() => undefined);
    chapter = index;
    turning = false;
    updateChapter();
    fadeOut?.cancel();
    if (!reducedMotion.matches)
      await page
        .animate([{ opacity: 0 }, { opacity: 1 }], { duration: 90 })
        .finished.catch(() => undefined);
  }

  library.addEventListener(
    'click',
    (event) => {
      if (
        !(event instanceof MouseEvent) ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('[data-book-link]');
      if (!link || link.target === '_blank' || !link.dataset.bookId) return;
      event.preventDefault();
      history.pushState(
        { ...history.state, libraryBook: true },
        '',
        withBookId(new URL(location.href), link.dataset.bookId),
      );
      startOpening(link.dataset.bookId, link);
    },
    listenerOptions,
  );
  reader.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      void closeCurrent();
    },
    listenerOptions,
  );
  reader
    .querySelectorAll<HTMLButtonElement>('[data-reader-close]')
    .forEach((button) =>
      button.addEventListener('click', () => void closeCurrent(), listenerOptions),
    );
  reader.querySelector('[data-reader-retry]')?.addEventListener(
    'click',
    () => {
      if (activeId) startOpening(activeId, activeLink ?? undefined);
    },
    listenerOptions,
  );
  prev.addEventListener('click', () => void changeChapter(chapter - 1), listenerOptions);
  next.addEventListener('click', () => void changeChapter(chapter + 1), listenerOptions);
  select.addEventListener(
    'change',
    () => void changeChapter(Number(select.value)),
    listenerOptions,
  );
  chapters.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-chapter-index]');
      if (button) void changeChapter(Number(button.dataset.chapterIndex));
    },
    listenerOptions,
  );
  reader.addEventListener(
    'keydown',
    (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('button, select, a, input, textarea')) return;
      if (event.key === 'ArrowLeft') void changeChapter(chapter - 1);
      if (event.key === 'ArrowRight') void changeChapter(chapter + 1);
    },
    listenerOptions,
  );
  window.addEventListener(
    'popstate',
    () => {
      const id = readBookId(new URL(location.href), allowedIds);
      if (!id) {
        void closeCurrent(true);
        return;
      }
      if (id !== activeId) startOpening(id);
    },
    listenerOptions,
  );
  document.addEventListener(
    'astro:before-swap',
    () => {
      listeners.abort();
      session.cancel();
      request?.abort();
      if (reader.open) reader.close();
      document.body.style.overflow = oldOverflow;
    },
    { once: true, signal: listeners.signal },
  );
  const initial = new URL(location.href);
  const initialId = readBookId(initial, allowedIds);
  if (initialId) startOpening(initialId);
  else if (initial.searchParams.has('book')) {
    history.replaceState(history.state, '', withBookId(initial, null));
    const notice = document.createElement('p');
    notice.setAttribute('role', 'status');
    notice.textContent = labels.unavailable ?? 'This book is unavailable.';
    library.prepend(notice);
  }
}
