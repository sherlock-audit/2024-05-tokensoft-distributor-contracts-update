import pinata, { PinataPinOptions } from '@pinata/sdk'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
const path = require('path');
const { Readable } = require('stream');

export async function uploadObjectToPinata(data: object, name: string) {
  try {
    const sdk = new pinata(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY)
    const options: PinataPinOptions = {
      pinataMetadata: {
        name
      },
      pinataOptions: {
        cidVersion: 0
      }
    }
    const response = await sdk.pinJSONToIPFS(data, options)
    return response.IpfsHash
  } catch (e) {
    console.error(`failed to upload to pinata: ${e}`)
    throw e
  }
}

export async function uploadStringContent(content: string) {
  const now = new Date();
  const formData = new FormData();
  formData.append('file', content, '/tmp/' + now.getTime());

  return await uploadToIpfs(formData);
}

export async function uploadBinaryContent(inputFile: string) {
  const filename = path.basename(inputFile);
  const buffer = fs.readFileSync(inputFile);
  const stream = Readable.from(buffer);

  const formData = new FormData();
  formData.append('file', stream, '/tmp/' + filename);

  return await uploadToIpfs(formData);
}

export async function uploadToIpfs(formData: FormData) {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  try {
    const response = await axios.post(url, formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + formData.getBoundary(),
        pinata_api_key: process.env.PINATA_API_KEY || '',
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY || ''
      }
    });

    return response.data;
  } catch (e: any) {
    console.error(`failed to upload to pinata: ${e.message || JSON.stringify(e)}`);
    throw e;
  }
}