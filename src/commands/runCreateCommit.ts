/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

import {getCommand, setFailure} from '../helpers/utils';

const runCreateCommit = async (args, failCi, filename) => {
  const {execArgs, options, command} = buildExec();
  await exec.exec(getCommand(filename, args, command).join(' '), execArgs, options)
      .then(async (exitCode) => {
        if (exitCode != 0) {
          core.warning(`Codecov: ${command} exited with status: ${exitCode}`);
        }
      }).catch((err) => {
        setFailure(`Codecov: Failed to properly create : ${err.message}`, failCi);
      });
};

const buildExec = () => {
  const commitParent = core.getInput('commit_parent');
  const overrideBranch = core.getInput('override_branch');
  const overrideCommit = core.getInput('override_commit');
  const overridePr = core.getInput('override_pr');
  const slug = core.getInput('slug');
  const token = core.getInput('token');

  const command = 'create-commit';
  const execArgs = [];

  const options:any = {};
  options.env = Object.assign(process.env, {
    GITHUB_ACTION: process.env.GITHUB_ACTION,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    GITHUB_REF: process.env.GITHUB_REF,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_SHA: process.env.GITHUB_SHA,
    GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || '',
  });

  if (token) {
    options.env.CODECOV_TOKEN = token;
  }
  if (commitParent) {
    execArgs.push('--parent-sha', `${commitParent}`);
  }

  if (overrideBranch) {
    execArgs.push('-B', `${overrideBranch}`);
  }
  if (overrideCommit) {
    execArgs.push('-C', `${overrideCommit}`);
  } else if (
    `${github.context.eventName}` == 'pull_request' ||
    `${github.context.eventName}` == 'pull_request_target'
  ) {
    execArgs.push('-C', `${github.context.payload.pull_request.head.sha}`);
  }
  if (overridePr) {
    execArgs.push('--pr', `${overridePr}`);
  } else if (
    `${github.context.eventName}` == 'pull_request_target'
  ) {
    execArgs.push('--pr', `${github.context.payload.number}`);
  }
  if (slug) {
    execArgs.push('--slug', `${slug}`);
  }

  return {execArgs, options, command};
};

export default runCreateCommit;
