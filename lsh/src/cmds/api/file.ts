import fprint from 'fprint';
import fs from 'fs';

const IN_MEMORY_FILE_FINGERPRINTS = {};
const NO_CHANGE_TO_FILE = -1;

const encodeContent = async (path) => {
  const fileContents = fs.readFileSync(path);
  const fingerprint = await fprint(fileContents, 'md5');

  if (IN_MEMORY_FILE_FINGERPRINTS[path] !== fingerprint) {
    IN_MEMORY_FILE_FINGERPRINTS[path] = fingerprint;
    return fs.readFileSync(path, {
      encoding: 'base64',
    });
  } else {
    return NO_CHANGE_TO_FILE;
  }
};

export const FILE = {
  encodeContent,
  IN_MEMORY_FILE_FINGERPRINTS,
  NO_CHANGE_TO_FILE,
};
