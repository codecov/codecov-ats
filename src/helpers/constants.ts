const PLATFORMS = [
  'linux',
  'macos',
  'windows',
];

const SPAWNPROCESSBUFFERSIZE = 1_048_576 * 100; // 100 MiB

const DEFAULTTESTARGS = '--cov-context=test';

export {
  DEFAULTTESTARGS,
  PLATFORMS,
  SPAWNPROCESSBUFFERSIZE,
};
