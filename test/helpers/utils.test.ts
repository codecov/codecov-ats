import {
  expect,
  test,
} from 'vitest';

import {
  getCommand,
} from '../../src/helpers/utils';

test('getCommand', () => {
  expect(getCommand('path', ['-v', '-x'], 'do-upload'))
      .toEqual(['path', '-v', '-x', 'do-upload']);
});
