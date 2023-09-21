import * as core from '@actions/core';
import * as github from '@actions/github';
import childprocess from 'child_process';

import {SPAWNPROCESSBUFFERSIZE} from './constants';

const PLATFORMS = [
  'linux',
  'macos',
  'windows',
];

const setFailure = (message: string, failCi: boolean): void => {
    failCi ? core.setFailed(message) : core.warning(message);
    if (failCi) {
      process.exit();
    }
};

const getUploaderName = (platform: string): string => {
  if (isWindows(platform)) {
    return 'codecov.exe';
  } else {
    return 'codecov';
  }
};

const isValidPlatform = (platform: string): boolean => {
  return PLATFORMS.includes(platform);
};

const isWindows = (platform: string): boolean => {
  return platform === 'windows';
};

const getPlatform = (os?: string): string => {
  if (isValidPlatform(os)) {
    core.info(`==> ${os} OS provided`);
    return os;
  }

  const platform = process.env.RUNNER_OS?.toLowerCase();
  if (isValidPlatform(platform)) {
    core.info(`==> ${platform} OS detected`);
    return platform;
  }

  core.info(
      '==> Could not detect OS or provided OS is invalid. Defaulting to linux',
  );
  return 'linux';
};

const getBaseUrl = (platform: string, version: string): string => {
  return `https://cli.codecov.io/${version}/${platform}/${getUploaderName(platform)}`;
};

const getCommand = (
    filename: string,
    generalArgs:string[],
    command: string,
): string[] => {
  const fullCommand = [filename, ...generalArgs, command];
  core.info(`==> Running command '${fullCommand.join(' ')}'`);
  return fullCommand;
};

const runExternalProgram = (
    programName: string,
    optionalArguments: string[] = [],
): string => {
  const result = childprocess.spawnSync(
      programName,
      optionalArguments,
      {maxBuffer: SPAWNPROCESSBUFFERSIZE},
  );
  if (result.error) {
    throw new Error(`Error running external program: ${result.error}`);
  }
  return result.stdout.toString().trim();
};

const getParentCommit = (): string => {
  return runExternalProgram('git', ['rev-parse', 'HEAD^']) || '';
};

const getPRBaseCommit = (): string => {
  const context = github.context;
  if (context.eventName == 'pull_request') {
    return context.payload.pull_request.base.sha;
  }
  return '';
};

export {
  PLATFORMS,
  getBaseUrl,
  getCommand,
  getPRBaseCommit,
  getParentCommit,
  getPlatform,
  getUploaderName,
  isValidPlatform,
  isWindows,
  runExternalProgram,
  setFailure,
};
