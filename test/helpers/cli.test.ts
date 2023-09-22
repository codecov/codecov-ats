import {
  afterAll,
  beforeEach,
  expect,
  test,
} from 'vitest';

import {
  getBaseUrl,
  getPlatform,
} from '../../src/helpers/cli';
import {PLATFORMS} from '../../src/helpers/constants';

let OLDOS = process.env.RUNNER_OS;

beforeEach(() => {
  OLDOS = process.env.RUNNER_OS;
});

afterAll(() => {
  process.env.RUNNER_OS = OLDOS;
});

test('getPlatform', () => {
  expect(getPlatform('linux')).toBe('linux');
  expect(getPlatform('windows')).toBe('windows');

  const defaultPlatform =
      process.env.RUNNER_OS ? process.env.RUNNER_OS.toLowerCase() : 'linux';
  expect(getPlatform('fakeos')).toBe(defaultPlatform);
  expect(getPlatform()).toBe(defaultPlatform);

  process.env.RUNNER_OS = 'macos';
  expect(getPlatform('fakeos')).toBe('macos');
  expect(getPlatform()).toBe('macos');

  process.env.RUNNER_OS = 'alsofakeos';
  expect(getPlatform()).toBe('linux');
  expect(getPlatform('fakeos')).toBe('linux');
});

test('getBaseUrl', () => {
  expect(PLATFORMS.map((platform) => {
    return getBaseUrl(platform, 'latest');
  })).toEqual([
    'https://cli.codecov.io/latest/linux/codecov',
    'https://cli.codecov.io/latest/macos/codecov',
    'https://cli.codecov.io/latest/windows/codecov.exe',
  ]);

  expect(PLATFORMS.map((platform) => {
    return getBaseUrl(platform, 'v0.3.02');
  })).toEqual([
    'https://cli.codecov.io/v0.3.02/linux/codecov',
    'https://cli.codecov.io/v0.3.02/macos/codecov',
    'https://cli.codecov.io/v0.3.02/windows/codecov.exe',
  ]);
});
