/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

import {getParentCommit, getPRBaseCommit} from '../helpers/git';
import {getCommand} from '../helpers/utils';

const runLabelAnalysis = async (args, failCi, filename) => {
  const {execArgs, options, command} = await buildExec();
  let labelsSet = false;

  core.info(`${options.baseCommits}`);
  for (const baseCommit of options.baseCommits) {
    core.info(`Trying ${baseCommit}`);
    if (baseCommit != '') {
      const labelArgs = [...execArgs];
      labelArgs.push('--base-sha', `${baseCommit}`);

      let labels = '';
      options.listeners = {
        stdout: (data: Buffer) => {
          labels += data.toString();
        },
      };

      await exec.exec(getCommand(filename, args, command).join(' '), labelArgs, options)
          .then(async (exitCode) => {
            if (exitCode == 0) {
              labelsSet = true;
              const tests = labels.replace('ATS_TESTS_TO_RUN=', '').replaceAll('"', '');
              core.exportVariable('CODECOV_ATS_TESTS_TO_RUN', tests);
            }
          }).catch((err) => {
            core.warning(`Codecov: Failed to properly retrieve labels: ${err.message}`);
          });

      if (labelsSet) {
        break;
      }
    }
  }
  if (!labelsSet) {
    core.info(`Codecov: Could not find labels from commits: ${options.baseCommits} Defaulting to run all tests.`);
    core.exportVariable('CODECOV_ATS_LABELS', '');
  }
};

const buildExec = async () => {
  const overrideCommit = core.getInput('override_commit');
  const overrideBaseCommit = core.getInput('override_base_commit');
  const maxWaitTime = core.getInput('max_wait_time');
  const testOutputPath = core.getInput('test_output_path');
  const staticToken = core.getInput('static_token');

  const command = 'label-analysis';
  const execArgs = ['--dry-run'];

  const options:any = {};
  options.env = Object.assign(process.env, {
    GITHUB_ACTION: process.env.GITHUB_ACTION,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    GITHUB_REF: process.env.GITHUB_REF,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_SHA: process.env.GITHUB_SHA,
    GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || '',
  });

  if (staticToken) {
    options.env.CODECOV_STATIC_TOKEN = staticToken;
  }
  if (overrideCommit) {
    execArgs.push('-C', `${overrideCommit}`);
  } else if (
    `${github.context.eventName}` == 'pull_request' ||
    `${github.context.eventName}` == 'pull_request_target'
  ) {
    execArgs.push(
        '--head-sha',
        `${github.context.payload.pull_request.head.sha}`,
    );
  }
  if (overrideBaseCommit) {
    options.baseCommits = [overrideBaseCommit];
  } else {
    const parentCommit = await getParentCommit();
    const prBaseCommit = getPRBaseCommit();
    options.baseCommits = [parentCommit, prBaseCommit];
  }
  if (maxWaitTime) {
    execArgs.push('--max-wait-time', `${maxWaitTime}`);
  }
  if (testOutputPath) {
    options.testOutputPath = testOutputPath;
  } else {
    options.testOutputPath = 'tmp-codecov-labels';
  }

  return {execArgs, options, command};
};

export default runLabelAnalysis;
