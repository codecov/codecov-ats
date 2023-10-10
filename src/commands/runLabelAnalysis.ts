/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

import {getParentCommit, getPRBaseCommit} from '../helpers/git';
import {getCommand} from '../helpers/utils';

const runLabelAnalysis = async (args, filename) => {
  let labelsSet = false;
  const {execArgs, options, command} = await buildExec();
  core.info(`${options.baseCommits}`);
  for (const baseCommit of options.baseCommits) {
    const success = await runLabelAnalysisForCommit(execArgs, args, options, command, filename, baseCommit);
    if (success) {
      labelsSet = true;
      break;
    }
  }

  if (!labelsSet) {
    core.info(`Codecov: Could not find labels from commits: ${options.baseCommits} Defaulting to run all tests.`);
    core.exportVariable(options.outputVariable, '');
  }
};

const runLabelAnalysisForCommit = async (execArgs, args, options, command, filename, baseCommit) => {
  let labelsSet = false;
  if (baseCommit == '') {
    return false;
  }
  core.info(`Attempting label analysis on ${baseCommit}`);

  core.warning('meow2');
  const labelArgs = [...execArgs];
  labelArgs.push('--base-sha', `${baseCommit}`);

  core.warning('meow1');

  let labels = '';
  options.listeners = {
    stdout: (data: Buffer) => {
      core.warning('meow3');
      labels += data.toString();
    },
  };


  await exec.exec(getCommand(filename, args, command).join(' '), labelArgs, options)
      .then(async (exitCode) => {
        core.warning('meow4');
        if (exitCode == 0) {
          core.warning('meow5');
          let testsToRun = '';
          for (const line of labels.split('\n')) {
            core.warning('meow6');
            if (line.startsWith('ATS_TESTS_TO_RUN')) {
              testsToRun = line.replace('ATS_TESTS_TO_RUN=', '');
              break;
            }
          }

          if (testsToRun != '') {
            core.warning('meow7');
            labelsSet = true;
            core.exportVariable(
                options.outputVariable,
                testsToRun,
            );
          }
        }
      }).catch((err) => {
        core.warning('meow8');
        core.warning(`Codecov: Failed to properly retrieve labels: ${err.message}`);
      });
  return labelsSet;
};

const buildExec = async () => {
  const outputVariable = core.getInput('output_variable');
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

  if (outputVariable) {
    options.outputVariable = outputVariable;
  } else {
    options.outputVariable = 'CODECOV_ATS_TESTS';
  }
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
