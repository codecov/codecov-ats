import runCreateCommit from './commands/runCreateCommit';
import runCreateReport from './commands/runCreateReport';
import runLabelAnalysis from './commands/runLabelAnalysis';
import runStaticAnalysis from './commands/runStaticAnalysis';
import getCli from './helpers/cli';
import {setFailure, unlink} from './helpers/utils';

let failCi;

try {
  async () => {
    const {args, failCi, filename} = await getCli();
    await runCreateCommit(args, failCi, filename);
    await runCreateReport(args, failCi, filename);
    await runStaticAnalysis(args, failCi, filename);
    await runLabelAnalysis(args, failCi, filename);
    unlink(filename, failCi);
  };
} catch (err) {
  setFailure(`Codecov: Encountered an unexpected error ${err.message}`, failCi);
}
