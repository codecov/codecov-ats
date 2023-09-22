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

const runExternalProgram = async (
    programName: string,
    optionalArguments: string[] = [],
): Promise<string> => {
  const result = await childprocess.spawnSync(
      programName,
      optionalArguments,
      {maxBuffer: SPAWNPROCESSBUFFERSIZE},
  );
  if (result.error) {
    throw new Error(`Error running external program: ${result.error}`);
  }
  return result.stdout.toString().trim();
};

const getParentCommit = async (): Promise<string> => {
  const context = github.context;
  const currentCommit = context.payload.pull_request.head.sha;
  const parentCommit = await runExternalProgram(
      'git',
      ['rev-parse', `${currentCommit}^`],
  ) || '';
  core.info(`Parent commit: ${parentCommit}`);
  return parentCommit;
};

const getPRBaseCommit = (): string => {
  const context = github.context;
  if (context.eventName == 'pull_request') {
    const baseSha = context.payload.pull_request.base.sha;
    core.info(`PR Base commit: ${baseSha}`);
    return baseSha;
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
