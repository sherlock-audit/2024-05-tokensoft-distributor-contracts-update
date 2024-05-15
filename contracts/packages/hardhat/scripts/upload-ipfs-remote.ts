import fs from 'fs'
import { uploadBinaryContent, uploadStringContent } from './pinata'

/**
 * Usage: PINATA_API_KEY=<API_KEY> PINATA_SECRET_API_KEY=<SECRET_API_KEY> yarn run upload-ipfs-remote <PATH TO INPUT JSON>
 */
async function main() {
    const myArgs = process.argv.slice(2);
    const inputFile = myArgs[0]
    const fileType = myArgs[1] || 'json'


    if (fileType === 'json') {
      try {
        const content = fs.readFileSync(inputFile, { encoding: 'utf8' })
        const cid = await uploadStringContent(content);
        console.log('IPFS Uri: ipfs://', cid);
      } catch (e) {
        console.error(`failed to updload file: ${e}`);
        return
      }
    } else if (fileType === 'binary') {
      try {
        const cid = await uploadBinaryContent(inputFile);
        console.log('IPFS Uri: ipfs://', cid);
      } catch (e) {
        console.error(`failed to updload file: ${e}`);
        return
      }

    } else {
      console.error('File type must be one of json or binary');
    }


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });