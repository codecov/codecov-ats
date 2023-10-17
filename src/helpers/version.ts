import * as core from '@actions/core';
import fetch from 'node-fetch';

const versionInfo = async (
    platform: string,
    version?: string,
): Promise<void> => {
  if (version) {
    core.info(`==> Running version ${version}`);
  } else {
    core.info(`==> Defaulting to 0.3.9`);
    version = 'v0.3.9';
  }

  try {
    const metadataRes = await fetch(`https://cli.codecov.io/${platform}/${version}`, {
      headers: {'Accept': 'application/json'},
    });
    const metadata = await metadataRes.json();
    core.info(`==> Running version ${metadata['version']}`);
  } catch (err) {
    core.info(`Could not pull latest version information: ${err}`);
  }
};
export default versionInfo;
