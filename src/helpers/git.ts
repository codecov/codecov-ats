import * as core from '@actions/core';
import * as github from '@actions/github';

import {runExternalProgram} from './utils';

const getParentCommit = async (): Promise<string> => {
  const context = github.context;
  let parentCommit = '';
  if (context.eventName == 'pull_request') {
    const currentCommit = context.payload.pull_request.head.sha;
    parentCommit = await runExternalProgram(
        'git',
        ['rev-parse', `${currentCommit}^`],
    ) || '';
  } else {
    parentCommit = await runExternalProgram(
        'git',
        ['rev-parse', `HEAD^`],
    ) || '';
  }
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
  getParentCommit,
  getPRBaseCommit,
};
