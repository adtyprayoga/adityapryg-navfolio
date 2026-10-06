const initialized = new WeakSet<HTMLElement>();
const shelves = new Set(['all', 'professional', 'personal', 'learning']);

export function initLibraryFilters() {
  const library = document.querySelector<HTMLElement>('[data-project-library]');
  if (!library || initialized.has(library)) return;
  initialized.add(library);
  const labels = JSON.parse(library.dataset.labels ?? '{}') as Record<string, string>;
  const controls = [...library.querySelectorAll<HTMLElement>('[data-library-controls]')];
  const fallback = library.querySelector<HTMLElement>('[data-library-fallback]')!;
  const buttons = [...library.querySelectorAll<HTMLButtonElement>('[data-library-category]')];
  const search = library.querySelector<HTMLInputElement>('[data-library-search]')!;
  const clear = library.querySelector<HTMLButtonElement>('[data-library-clear]')!;
  const results = library.querySelector<HTMLElement>('[data-library-results]')!;
  const empty = library.querySelector<HTMLElement>('[data-library-empty]')!;
  const sections = [...library.querySelectorAll<HTMLElement>('[data-library-section]')];
  const saved = history.state?.projectLibraryFilter as
    { shelf?: string; query?: string } | undefined;
  const savedShelf = saved?.shelf;
  let selected = savedShelf && shelves.has(savedShelf) ? savedShelf : 'all';
  search.value = saved?.query ?? '';
  controls.forEach((control) => (control.hidden = false));
  fallback.hidden = true;

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    buttons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.libraryCategory === selected)),
    );
    for (const section of sections) {
      const matchesCategory = selected === 'all' || section.dataset.librarySection === selected;
      let sectionCount = 0;
      for (const book of section.querySelectorAll<HTMLElement>('.library-book')) {
        const matches = matchesCategory && (!query || (book.dataset.search ?? '').includes(query));
        book.hidden = !matches;
        if (matches) sectionCount += 1;
      }
      section.hidden = sectionCount === 0;
      visible += sectionCount;
    }
    clear.hidden = !query;
    empty.hidden = visible !== 0;
    results.hidden = selected === 'all' && !query;
    results.textContent = (
      (visible === 1 ? labels.result : labels.results) ?? '{count} projects'
    ).replace('{count}', String(visible));
    history.replaceState(
      { ...history.state, projectLibraryFilter: { shelf: selected, query: search.value } },
      '',
      location.href,
    );
  }

  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      selected = button.dataset.libraryCategory ?? 'all';
      update();
    }),
  );
  search.addEventListener('input', update);
  clear.addEventListener('click', () => {
    search.value = '';
    update();
    search.focus();
  });
  update();
}
