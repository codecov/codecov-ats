import * as core from '@actions/core';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

import {CliArgs} from '../types';

import {PLATFORMS} from './constants';
import buildExec from './buildExec';
import {setFailure} from './utils';
import verify from './validate';
import versionInfo from './version';

const getCliName = (platform: string): string => {
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
  return `https://cli.codecov.io/${version}/${platform}/${getCliName(platform)}`;
};

const getCli = async (): Promise<CliArgs> => {
  const {args, failCi, os, verbose, uploaderVersion} = buildExec();
  const platform = getPlatform(os);

  const filename = path.join( __dirname, getCliName(platform));
  await https.get(getBaseUrl(platform, uploaderVersion), (res) => {
    // Image will be stored at this path
    const filePath = fs.createWriteStream(filename);
    res.pipe(filePath);
    filePath
        .on('error', (err) => {
          setFailure(
              `Codecov: Failed to write uploader binary: ${err.message}`,
              true,
          );
        }).on('finish', async () => {
          filePath.close();

          await verify(filename, platform, uploaderVersion, verbose, failCi);
          await versionInfo(platform, uploaderVersion);
          await fs.chmodSync(filename, '777');
          return {args, failCi, filename};
        });
  });
  return {args, failCi, filename};
};

export default getCli;
export {
  getBaseUrl,
  getCliName,
  getPlatform,
};
