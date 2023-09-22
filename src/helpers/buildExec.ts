/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as core from '@actions/core';

import {Exec} from '../types';
import {isTrue} from './utils';

const buildExec = (): Exec => {
  const failCi = isTrue(core.getInput('fail_ci_if_error'));
  const os = core.getInput('os');
  const url = core.getInput('url');
  const verbose = isTrue(core.getInput('verbose'));
  let uploaderVersion = core.getInput('version');

  const args = [];

  if (url) {
    args.push('--enterprise-url', `${url}`);
  }
  if (verbose) {
    args.push('-v');
  }
  if (uploaderVersion == '') {
    uploaderVersion = 'latest';
  }
  return {args, failCi, os, verbose, uploaderVersion};
};

export default buildExec;
