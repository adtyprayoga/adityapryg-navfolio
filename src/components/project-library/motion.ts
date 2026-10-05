export type MotionHandle = { finished: Promise<void>; finish(): void; cancel(): void };

function runSteps(steps: (() => Animation[])[]): MotionHandle {
  let active: Animation[] = [];
  let stopped = false;
  let resolve!: () => void;
  const finished = new Promise<void>((done) => {
    resolve = done;
  });
  void (async () => {
    for (const step of steps) {
      if (stopped) break;
      active = step();
      await Promise.all(active.map((animation) => animation.finished.catch(() => undefined)));
    }
    resolve();
  })();
  return {
    finished,
    finish() {
      stopped = true;
      active.forEach((animation) => animation.finish());
    },
    cancel() {
      stopped = true;
      active.forEach((animation) => animation.cancel());
    },
  };
}

export function openBook(stage: HTMLElement, source: DOMRect, target: DOMRect): MotionHandle {
  const cover = stage.querySelector<HTMLElement>('[data-motion-cover]')!;
  const hand = stage.querySelector<SVGElement>('.book-hand')!;
  const face = cover.querySelector<HTMLElement>('.library-cover')!;
  cover.style.left = `${source.left}px`;
  cover.style.top = `${source.top}px`;
  cover.style.width = `${source.width}px`;
  cover.style.height = `${source.height}px`;
  const fromHand = `translate(${source.right - 90}px, ${source.bottom - 20}px)`;
  const gripHand = `translate(${source.right - 70}px, ${source.bottom - 75}px)`;
  const liftHand = `translate(${source.right - 70}px, ${source.bottom - 110}px)`;
  const toHand = `translate(${target.left + target.width - 80}px, ${target.top + target.height - 90}px)`;
  const dx = target.left - source.left;
  const dy = target.top - source.top;
  const scale = Math.min(target.width / source.width, target.height / source.height, 1.45);
  const base = { fill: 'forwards' as FillMode, easing: 'cubic-bezier(.2,.75,.2,1)' };
  return runSteps([
    () => [
      hand.animate(
        [
          { transform: fromHand, opacity: 0 },
          { transform: gripHand, opacity: 1 },
        ],
        { ...base, duration: 300 },
      ),
    ],
    () => [
      hand.animate([{ transform: gripHand }, { transform: liftHand }], { ...base, duration: 250 }),
      cover.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-35px)' }], {
        ...base,
        duration: 250,
      }),
    ],
    () => [
      hand.animate([{ transform: liftHand }, { transform: toHand }], { ...base, duration: 450 }),
      cover.animate(
        [
          { transform: 'translateY(-35px)' },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        ],
        { ...base, duration: 450 },
      ),
    ],
    () => [
      face.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-145deg)' }], {
        ...base,
        duration: 400,
      }),
      hand.animate(
        [
          { transform: toHand, opacity: 1 },
          { transform: `translate(${target.right}px, ${target.bottom}px)`, opacity: 0 },
        ],
        { ...base, duration: 400 },
      ),
    ],
  ]);
}

export function turnPage(page: HTMLElement, direction: 1 | -1): MotionHandle {
  const turn = direction === 1 ? -12 : 12;
  return runSteps([
    () => [
      page.animate(
        [
          { transform: 'rotateY(0deg)', opacity: 1 },
          { transform: `rotateY(${turn}deg)`, opacity: 0.35, offset: 0.5 },
          { transform: 'rotateY(0deg)', opacity: 1 },
        ],
        { duration: 280, easing: 'ease-in-out' },
      ),
    ],
  ]);
}

export function closeBook(stage: HTMLElement, target: DOMRect): MotionHandle {
  const cover = stage.querySelector<HTMLElement>('[data-motion-cover]')!;
  const face = cover.querySelector<HTMLElement>('.library-cover')!;
  cover.style.left = `${target.left}px`;
  cover.style.top = `${target.top}px`;
  cover.style.width = `${target.width}px`;
  cover.style.height = `${target.height}px`;
  return runSteps([
    () => [
      cover.animate(
        [
          { transform: 'translateY(-20px) scale(1.1)', opacity: 1 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ],
        { duration: 300, easing: 'ease-out' },
      ),
      face.animate([{ transform: 'rotateY(-100deg)' }, { transform: 'rotateY(0deg)' }], {
        duration: 300,
        easing: 'ease-out',
      }),
    ],
  ]);
}
