import * as core from '@actions/core';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as openpgp from 'openpgp';
import * as path from 'path';

import {
  getBaseUrl,
  getCliName,
} from './cli';
import {
  setFailure,
} from './utils';

const verify = async (
    filename: string,
    platform: string,
    version: string,
    verbose: boolean,
    failCi: boolean,
): Promise<void> => {
  try {
    const cliName = getCliName(platform);

    // Read in public key
    const publicKeyArmored = await fs.readFileSync(
        path.join(__dirname, 'pgp_keys.asc'),
        'utf-8',
    );

    // Get SHASUM and SHASUM signature files
    console.log(`${getBaseUrl(platform, version)}.SHA256SUM`);
    const shasumRes = await fetch(
        `${getBaseUrl(platform, version)}.SHA256SUM`,
    );
    const shasum = await shasumRes.text();
    if (verbose) {
      console.log(`Received SHA256SUM ${shasum}`);
    }

    const shaSigRes = await fetch(
        `${getBaseUrl(platform, version)}.SHA256SUM.sig`,
    );
    const shaSig = await shaSigRes.text();
    if (verbose) {
      console.log(`Received SHA256SUM signature ${shaSig}`);
    }

    // Verify shasum
    const verified = await openpgp.verify({
      message: await openpgp.createMessage({text: shasum}),
      signature: await openpgp.readSignature({armoredSignature: shaSig}),
      verificationKeys: await openpgp.readKeys({armoredKeys: publicKeyArmored}),
    });
    const valid = await verified.signatures[0].verified;
    if (valid) {
      core.info('==> SHASUM file signed by key id ' +
          verified.signatures[0].keyID.toHex(),
      );
    } else {
      setFailure('Codecov: Error validating SHASUM signature', failCi);
    }

    const calculateHash = async (filename: string) => {
      const stream = fs.createReadStream(filename);
      const cliSha = crypto.createHash(`sha256`);
      stream.pipe(cliSha);

      return new Promise((resolve, reject) => {
        stream.on('end', () => resolve(
            `${cliSha.digest('hex')}  ${cliName}`,
        ));
        stream.on('error', reject);
      });
    };

    const hash = await calculateHash(filename);
    if (hash === shasum) {
      core.info(`==> CLI SHASUM verified (${hash})`);
    } else {
      setFailure(
          'Codecov: CLI SHASUM does not match -- ' +
            `CLI hash: ${hash}, public hash: ${shasum}`,
          failCi,
      );
    }
  } catch (err) {
    setFailure(`Codecov: Error validating CLI: ${err.message}`, failCi);
  }
};
export default verify;
