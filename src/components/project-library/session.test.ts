import { expect, test } from 'bun:test';
import { createSession } from './session';

test('stale content and unfinished opening cannot enter reading', () => {
  const session = createSession();
  const first = session.begin();
  session.cancel();
  const second = session.begin();
  session.markLoaded(first);
  session.markOpened(first);
  expect(session.accept(first)).toEqual(false);
  expect(session.canRead(second)).toEqual(false);
  session.markLoaded(second);
  expect(session.canRead(second)).toEqual(false);
  session.markOpened(second);
  expect(session.canRead(second)).toEqual(true);
});
