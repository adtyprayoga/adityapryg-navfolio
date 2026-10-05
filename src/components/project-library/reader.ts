import { readBookId, withBookId } from './model';
import { createSession } from './session';
import { closeBook, openBook, turnPage, type MotionHandle } from './motion';

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
  const stage = reader.querySelector<HTMLElement>('[data-reader-stage]')!;
  const motionCover = stage.querySelector<HTMLElement>('[data-motion-cover]')!;
  const status = reader.querySelector<HTMLElement>('[data-reader-status]')!;
  const spread = reader.querySelector<HTMLElement>('[data-reader-spread]')!;
  const error = reader.querySelector<HTMLElement>('[data-reader-error]')!;
  const nav = reader.querySelector<HTMLElement>('[data-reader-nav]')!;
  const page = reader.querySelector<HTMLElement>('[data-reader-page]')!;
  const select = reader.querySelector<HTMLSelectElement>('[data-reader-chapters]')!;
  const skip = reader.querySelector<HTMLButtonElement>('[data-reader-skip]')!;
  const prev = reader.querySelector<HTMLButtonElement>('[data-reader-previous]')!;
  const next = reader.querySelector<HTMLButtonElement>('[data-reader-next]')!;
  const closeButton = reader.querySelector<HTMLButtonElement>('[data-reader-close]')!;
  let activeId: string | null = null;
  let activeLink: HTMLAnchorElement | null = null;
  let data: BookContent | null = null;
  let chapter = 0;
  let request: AbortController | null = null;
  let motion: MotionHandle | null = null;
  let turning = false;
  let closing = false;
  let oldOverflow = '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function hideStage() {
    motion?.cancel();
    motion = null;
    stage.classList.remove('is-active');
    motionCover.replaceChildren();
    const source = activeLink?.querySelector<HTMLElement>('[data-book-cover]');
    if (source) source.style.visibility = '';
    skip.hidden = true;
  }

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
    textOf(reader.querySelector('[data-reader-chapter-title]'), source.dataset.chapterTitle ?? '');
    textOf(
      reader.querySelector('[data-reader-progress]'),
      (labels.progress ?? 'Chapter {current} of {total}')
        .replace('{current}', String(chapter + 1))
        .replace('{total}', String(data.chapters.length)),
    );
    select.value = String(chapter);
    prev.disabled = chapter === 0 || turning;
    next.disabled = chapter === data.chapters.length - 1 || turning;
    const heading = page.querySelector<HTMLElement>('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }

  function showReading(token: number) {
    if (!session.canRead(token) || !data) return;
    hideStage();
    setStatus('');
    error.hidden = true;
    spread.hidden = false;
    nav.hidden = false;
    textOf(reader.querySelector('[data-reader-title]'), data.title);
    textOf(
      reader.querySelector('[data-reader-meta]'),
      [data.date, data.tags, data.authors].filter(Boolean).join(' · '),
    );
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
    hideStage();
    spread.hidden = true;
    nav.hidden = true;
    setStatus('');
    textOf(reader.querySelector('[data-reader-error-text]'), message);
    error.hidden = false;
    const pageLink = reader.querySelector<HTMLAnchorElement>('[data-reader-open-page]');
    if (pageLink && activeLink) pageLink.href = activeLink.href;
    closeButton.focus();
  }

  function startOpening(id: string, animated: boolean, trigger?: HTMLAnchorElement) {
    const link = trigger ?? books.get(id);
    if (!link || closing) return;
    session.cancel();
    request?.abort();
    hideStage();
    activeId = id;
    activeLink = link;
    textOf(
      reader.querySelector('[data-reader-title]'),
      link.querySelector('.library-cover-title')?.textContent?.trim() ?? id,
    );
    chapter = 0;
    data = null;
    error.hidden = true;
    spread.hidden = true;
    nav.hidden = true;
    setStatus(labels.loading ?? 'Opening book…');
    const token = session.begin();
    const source = link.querySelector<HTMLElement>('[data-book-cover]');
    const rect = source?.getBoundingClientRect();
    if (!reader.open) {
      oldOverflow = document.body.style.overflow;
      reader.showModal();
      document.body.style.overflow = 'hidden';
    }
    closeButton.focus({ preventScroll: true });
    void fetchBook(token, link).catch((cause: unknown) => {
      if (session.accept(token) && !(cause instanceof DOMException && cause.name === 'AbortError'))
        showError(labels.error ?? 'This book could not be opened.');
    });
    if (!animated || reducedMotion.matches || !rect || !source) {
      session.markOpened(token);
      showReading(token);
      return;
    }
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    motionCover.replaceChildren(clone);
    stage.classList.add('is-active');
    source.style.visibility = 'hidden';
    skip.hidden = false;
    const bounds = reader.getBoundingClientRect();
    const target = new DOMRect(
      bounds.left + bounds.width * 0.12,
      bounds.top + bounds.height * 0.19,
      Math.min(260, bounds.width * 0.32),
      Math.min(360, bounds.height * 0.55),
    );
    motion = openBook(stage, rect, target);
    void motion.finished.then(() => {
      if (!session.accept(token)) return;
      session.markOpened(token);
      showReading(token);
      if (!session.canRead(token)) hideStage();
    });
  }

  async function closeCurrent(fromHistory = false) {
    if (!reader.open || closing) return;
    closing = true;
    session.cancel();
    request?.abort();
    const link = activeLink;
    const id = activeId;
    if (!fromHistory && id && readBookId(new URL(location.href), allowedIds) === id) {
      if (history.state?.libraryBook) history.back();
      else history.replaceState(history.state, '', withBookId(new URL(location.href), null));
    }
    motion?.cancel();
    const source = link?.querySelector<HTMLElement>('[data-book-cover]');
    const rect = source?.getBoundingClientRect();
    if (!reducedMotion.matches && rect && source && data) {
      motionCover.replaceChildren(source.cloneNode(true));
      stage.classList.add('is-active');
      motion = closeBook(stage, rect);
      await motion.finished;
    }
    hideStage();
    const restoreFocus = () => {
      const target = link?.isConnected
        ? link
        : [...document.querySelectorAll<HTMLAnchorElement>('[data-book-link]')].find(
            (candidate) =>
              candidate.dataset.bookId === id &&
              candidate.dataset.bookPlacement === link?.dataset.bookPlacement,
          );
      if (!target) return;
      target.focus({ preventScroll: true });
      document.removeEventListener('astro:page-load', restoreFocus);
    };
    document.addEventListener('astro:page-load', restoreFocus, { once: true });
    reader.close();
    window.setTimeout(restoreFocus, 75);
    document.body.style.overflow = oldOverflow;
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
    if (!reducedMotion.matches) await turnPage(page, index > chapter ? 1 : -1).finished;
    chapter = index;
    turning = false;
    updateChapter();
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
      startOpening(link.dataset.bookId, true, link);
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
  closeButton.addEventListener('click', () => void closeCurrent(), listenerOptions);
  skip.addEventListener('click', () => motion?.finish(), listenerOptions);
  reader.querySelector('[data-reader-retry]')?.addEventListener(
    'click',
    () => {
      if (activeId) startOpening(activeId, false, activeLink ?? undefined);
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
  window.addEventListener('resize', () => motion?.finish(), listenerOptions);
  window.addEventListener(
    'popstate',
    () => {
      const id = readBookId(new URL(location.href), allowedIds);
      if (!id) {
        void closeCurrent(true);
        return;
      }
      if (id !== activeId) startOpening(id, false);
    },
    listenerOptions,
  );
  document.addEventListener(
    'astro:before-swap',
    () => {
      listeners.abort();
      session.cancel();
      request?.abort();
      hideStage();
      if (reader.open) reader.close();
      document.body.style.overflow = oldOverflow;
    },
    { once: true, signal: listeners.signal },
  );
  const initial = new URL(location.href);
  const initialId = readBookId(initial, allowedIds);
  if (initialId) startOpening(initialId, false);
  else if (initial.searchParams.has('book')) {
    history.replaceState(history.state, '', withBookId(initial, null));
    const notice = document.createElement('p');
    notice.setAttribute('role', 'status');
    notice.textContent = labels.unavailable ?? 'This book is unavailable.';
    library.prepend(notice);
  }
}
