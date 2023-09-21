/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as core from '@actions/core';
import * as github from '@actions/github';


const context = github.context;

const isTrue = (variable) => {
  const lowercase = variable.toLowerCase();
  return (
    lowercase === '1' ||
    lowercase === 't' ||
    lowercase === 'true' ||
    lowercase === 'y' ||
    lowercase === 'yes'
  );
};


const buildCommitExec = () => {
  const commitParent = core.getInput('commit_parent');
  const overrideBranch = core.getInput('override_branch');
  const overrideCommit = core.getInput('override_commit');
  const overridePr = core.getInput('override_pr');
  const slug = core.getInput('slug');
  const token = core.getInput('token');

  const commitCommand = 'create-commit';
  const commitExecArgs = [];

  const commitOptions:any = {};
  commitOptions.env = Object.assign(process.env, {
    GITHUB_ACTION: process.env.GITHUB_ACTION,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    GITHUB_REF: process.env.GITHUB_REF,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_SHA: process.env.GITHUB_SHA,
    GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || '',
  });

  if (token) {
    commitOptions.env.CODECOV_TOKEN = token;
  }
  if (commitParent) {
    commitExecArgs.push('--parent-sha', `${commitParent}`);
  }

  if (overrideBranch) {
    commitExecArgs.push('-B', `${overrideBranch}`);
  }
  if (overrideCommit) {
    commitExecArgs.push('-C', `${overrideCommit}`);
  } else if (
    `${context.eventName}` == 'pull_request' ||
    `${context.eventName}` == 'pull_request_target'
  ) {
    commitExecArgs.push('-C', `${context.payload.pull_request.head.sha}`);
  }
  if (overridePr) {
    commitExecArgs.push('--pr', `${overridePr}`);
  } else if (
    `${context.eventName}` == 'pull_request_target'
  ) {
    commitExecArgs.push('--pr', `${context.payload.number}`);
  }
  if (slug) {
    commitExecArgs.push('--slug', `${slug}`);
  }

  return {commitExecArgs, commitOptions, commitCommand};
};

const buildGeneralExec = () => {
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

const buildReportExec = () => {
  const overrideCommit = core.getInput('override_commit');
  const slug = core.getInput('slug');
  const token = core.getInput('token');


  const reportCommand = 'create-report';
  const reportExecArgs = [];

  const reportOptions:any = {};
  reportOptions.env = Object.assign(process.env, {
    GITHUB_ACTION: process.env.GITHUB_ACTION,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    GITHUB_REF: process.env.GITHUB_REF,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_SHA: process.env.GITHUB_SHA,
    GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || '',
  });


  if (token) {
    reportOptions.env.CODECOV_TOKEN = token;
  }
  if (overrideCommit) {
    reportExecArgs.push('-C', `${overrideCommit}`);
  } else if (
    `${context.eventName}` == 'pull_request' ||
    `${context.eventName}` == 'pull_request_target'
  ) {
    reportExecArgs.push('-C', `${context.payload.pull_request.head.sha}`);
  }
  if (slug) {
    reportExecArgs.push('--slug', `${slug}`);
  }

  return {reportExecArgs, reportOptions, reportCommand};
};

const buildStaticAnalysisExec = () => {
  const filePattern = core.getInput('file_pattern');
  const foldersToExclude = core.getInput('folders_to_exclude');
  const force = core.getInput('force');
  const overrideCommit = core.getInput('override_commit');
  const staticToken = core.getInput('static_token');

  const staticAnalysisCommand = 'static-analysis';
  const staticAnalysisExecArgs = [];

  const staticAnalysisOptions:any = {};
  staticAnalysisOptions.env = Object.assign(process.env, {
    GITHUB_ACTION: process.env.GITHUB_ACTION,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    GITHUB_REF: process.env.GITHUB_REF,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_SHA: process.env.GITHUB_SHA,
    GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || '',
  });

  if (staticToken) {
    staticAnalysisExecArgs.push('--token', `${staticToken}`);
  }
  if (filePattern) {
    staticAnalysisExecArgs.push('--pattern', `${filePattern}`);
  }
  if (foldersToExclude) {
    staticAnalysisExecArgs.push('--folders-to-exclude', `${foldersToExclude}`);
  }
  if (force) {
    staticAnalysisExecArgs.push('--force');
  }
  if (overrideCommit) {
    staticAnalysisExecArgs.push('-C', `${overrideCommit}`);
  } else if (
    `${context.eventName}` == 'pull_request' ||
    `${context.eventName}` == 'pull_request_target'
  ) {
    staticAnalysisExecArgs.push(
        '--commit-sha',
        `${context.payload.pull_request.head.sha}`,
    );
  }

  return {staticAnalysisExecArgs, staticAnalysisOptions, staticAnalysisCommand};
};

export {
  buildCommitExec,
  buildGeneralExec,
  buildReportExec,
  buildStaticAnalysisExec,
};
