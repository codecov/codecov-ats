import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';

import {
  buildCommitExec,
  buildGeneralExec,
  buildLabelAnalysisExec,
  buildReportExec,
  buildStaticAnalysisExec,
} from './buildExec';
import {
  getBaseUrl,
  getPlatform,
  getUploaderName,
  setFailure,
  getCommand,
} from './helpers';

import verify from './validate';
import versionInfo from './version';

let failCi;

try {
  const {commitExecArgs, commitOptions, commitCommand} = buildCommitExec();
  const {reportExecArgs, reportOptions, reportCommand} = buildReportExec();
  const {args, failCi, os, verbose, uploaderVersion} = buildGeneralExec();
  const {
    staticAnalysisExecArgs,
    staticAnalysisOptions,
    staticAnalysisCommand,
  } = buildStaticAnalysisExec();

  const platform = getPlatform(os);

  const filename = path.join( __dirname, getUploaderName(platform));
  https.get(getBaseUrl(platform, uploaderVersion), (res) => {
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

          const unlink = () => {
            fs.unlink(filename, (err) => {
              if (err) {
                setFailure(
                    `Codecov: Could not unlink uploader: ${err.message}`,
                    failCi,
                );
              }
            });
          };
          const createReport = async () => {
            await exec.exec(
                getCommand(filename, args, reportCommand).join(' '),
                reportExecArgs,
                reportOptions)
                .then(async (exitCode) => {
                  if (exitCode == 0) {
                    await staticAnalysis();
                  }
                }).catch((err) => {
                  setFailure(
                      `Codecov:
                      Failed to properly create report: ${err.message}`,
                      failCi,
                  );
                });
          };
          const staticAnalysis = async () => {
            await exec.exec(
                getCommand(filename, args, staticAnalysisCommand).join(' '),
                staticAnalysisExecArgs,
                staticAnalysisOptions)
                .then(async (exitCode) => {
                  if (exitCode == 0) {
                    await labelAnalysis();
                  }
                }).catch((err) => {
                  setFailure(
                      `Codecov:
                      Failed to properly create report: ${err.message}`,
                      failCi,
                  );
                });
          };
          const labelAnalysis = async () => {
            const {
              labelAnalysisExecArgs,
              labelAnalysisOptions,
              labelAnalysisCommand,
            } = await buildLabelAnalysisExec();
            core.info(`${labelAnalysisOptions}`);

            for (const baseCommit of labelAnalysisOptions.baseCommits) {
              if (baseCommit != '') {
                const labelArgs = [...labelAnalysisExecArgs];
                labelArgs.push(
                    '--base-sha',
                    '4abb01826b01e2693b469c51589fb6c2045d6ede',
                );

                let labels = '';
                labelAnalysisOptions.listeners = {
                  stdout: (data: Buffer) => {
                    labels += data.toString();
                  },
                };

                await exec.exec(
                    getCommand(filename, args, labelAnalysisCommand).join(' '),
                    labelArgs,
                    labelAnalysisOptions,
                ).then(async (exitCode) => {
                  if (exitCode == 0) {
                    const tests = labels.replace(
                        'ATS_TESTS_TO_RUN=', '',
                    ).replace('"', '');
                    core.exportVariable(
                        'CODECOV_ATS_TESTS_TO_RUN',
                        tests,
                    );
                    core.info(`${tests}`);
                  }
                }).catch((err) => {
                  setFailure(
                      `Codecov:
                      Failed to properly retrieve labels: ${err.message}`,
                      failCi,
                  );
                });
              }
            }
          };
          await exec.exec(
              getCommand(
                  filename,
                  args,
                  commitCommand,
              ).join(' '),
              commitExecArgs, commitOptions)
              .then(async (exitCode) => {
                if (exitCode == 0) {
                  await createReport();
                }
                unlink();
              }).catch((err) => {
                setFailure(
                    `Codecov: Failed to properly create commit: ${err.message}`,
                    failCi,
                );
              });
        });
  });
} catch (err) {
  setFailure(`Codecov: Encountered an unexpected error ${err.message}`, failCi);
}
