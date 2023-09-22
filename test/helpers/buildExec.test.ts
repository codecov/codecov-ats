import {
  expect,
  test,
} from 'vitest';

import buildExec from '../../src/helpers/buildExec';

test('general args', () => {
  const envs = {
    url: 'https://codecov.enterprise.com',
    verbose: 't',
  };
  for (const env of Object.keys(envs)) {
    process.env['INPUT_' + env.toUpperCase()] = envs[env];
  }

  const {args, verbose} = buildExec();

  expect(args).toEqual(
      expect.arrayContaining([
        '--enterprise-url',
        'https://codecov.enterprise.com',
        '-v',
      ]));
  expect(verbose).toBeTruthy();
  for (const env of Object.keys(envs)) {
    delete process.env['INPUT_' + env.toUpperCase()];
  }
});
