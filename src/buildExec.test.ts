import * as github from '@actions/github';

import {
  buildCommitExec,
  buildGeneralExec,
  buildReportExec,
} from './buildExec';


const context = github.context;

test('general args', () => {
  const envs = {
    url: 'https://codecov.enterprise.com',
    verbose: 't',
  };
  for (const env of Object.keys(envs)) {
    process.env['INPUT_' + env.toUpperCase()] = envs[env];
  }

  const {args, verbose} = buildGeneralExec();

  expect(args).toEqual(
      expect.arrayContaining([
        '--enterprise-url',
        'https://codecov.enterprise.com',
        '-v',
      ]));
  expect(verbose).toBeTruthy();
  for (const env of Object.keys(envs)) {
    delete process.env['INPUT_' + env.toUpperCase()];
  }
});

test('report args', () => {
  const envs = {
    override_commit: '9caabca5474b49de74ef5667deabaf74cdacc244',
    slug: 'fakeOwner/fakeRepo',
    token: 'd3859757-ab80-4664-924d-aef22fa7557b',
  };
  for (const env of Object.keys(envs)) {
    process.env['INPUT_' + env.toUpperCase()] = envs[env];
  }

  const {reportExecArgs, reportCommand} = buildReportExec();

  expect(reportExecArgs).toEqual(
      expect.arrayContaining([
        '-C',
        '9caabca5474b49de74ef5667deabaf74cdacc244',
        '--slug',
        'fakeOwner/fakeRepo',
      ]));
  expect(reportCommand).toEqual('create-report');
  for (const env of Object.keys(envs)) {
    delete process.env['INPUT_' + env.toUpperCase()];
  }
});


test('report args using context', () => {
  const envs = {
    token: 'd3859757-ab80-4664-924d-aef22fa7557b',
  };
  for (const env of Object.keys(envs)) {
    process.env['INPUT_' + env.toUpperCase()] = envs[env];
  }
  const expectedArgs: string[] = [];
  if (context.eventName == 'pull_request') {
    expectedArgs.push('-C', `${context.payload.pull_request.head.sha}`);
  }

  const {reportExecArgs, reportCommand} = buildReportExec();

  expect(reportExecArgs).toEqual(expectedArgs);
  expect(reportCommand).toEqual('create-report');
  for (const env of Object.keys(envs)) {
    delete process.env['INPUT_' + env.toUpperCase()];
  }
});


test('commit args', () => {
  const envs = {
    override_commit: '9caabca5474b49de74ef5667deabaf74cdacc244',
    slug: 'fakeOwner/fakeRepo',
    token: 'd3859757-ab80-4664-924d-aef22fa7557b',
    override_branch: 'thomasrockhu/test',
    override_pr: '2',
    commit_parent: '83231650328f11695dfb754ca0f540516f188d27',
  };
  for (const env of Object.keys(envs)) {
    process.env['INPUT_' + env.toUpperCase()] = envs[env];
  }

  const {commitExecArgs, commitCommand} = buildCommitExec();

  expect(commitExecArgs).toEqual(
      expect.arrayContaining([
        '-C',
        '9caabca5474b49de74ef5667deabaf74cdacc244',
        '--slug',
        'fakeOwner/fakeRepo',
        '-B',
        'thomasrockhu/test',
        '--pr',
        '2',
        '--parent-sha',
        '83231650328f11695dfb754ca0f540516f188d27',
      ]));
  expect(commitCommand).toEqual('create-commit');
  for (const env of Object.keys(envs)) {
    delete process.env['INPUT_' + env.toUpperCase()];
  }
});

test('commit args using context', () => {
  const expectedArgs :string[] = [];

  const {commitExecArgs, commitCommand} = buildCommitExec();
  if (context.eventName == 'pull_request') {
    expectedArgs.push('-C', `${context.payload.pull_request.head.sha}`);
  }
  if (context.eventName == 'pull_request_target') {
    expectedArgs.push('-P', `${context.payload.number}`);
  }

  expect(commitExecArgs).toEqual(expectedArgs);
  expect(commitCommand).toEqual('create-commit');
});
