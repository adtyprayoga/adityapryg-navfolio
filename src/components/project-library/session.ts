export function createSession() {
  let generation = 0;
  let loaded = false;
  let opened = false;
  return {
    begin() {
      generation += 1;
      loaded = false;
      opened = false;
      return generation;
    },
    accept(token: number) {
      return token === generation;
    },
    markLoaded(token: number) {
      if (token === generation) loaded = true;
    },
    markOpened(token: number) {
      if (token === generation) opened = true;
    },
    canRead(token: number) {
      return token === generation && loaded && opened;
    },
    cancel() {
      generation += 1;
      loaded = false;
      opened = false;
    },
  };
}
