import * as core from '@actions/core';
import * as fs from 'fs';
import childprocess from 'child_process';

import {SPAWNPROCESSBUFFERSIZE} from './constants';

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

const setFailure = (message: string, failCi: boolean): void => {
    failCi ? core.setFailed(message) : core.warning(message);
    if (failCi) {
      process.exit();
    }
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

const unlink = (filename: string, failCi: boolean) => {
  fs.unlink(filename, (err) => {
    if (err) {
      setFailure(`Codecov: Could not unlink uploader: ${err.message}`, failCi);
    }
  });
};

export {
  isTrue,
  getCommand,
  runExternalProgram,
  setFailure,
  unlink,
};
