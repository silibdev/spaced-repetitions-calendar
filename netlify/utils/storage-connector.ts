import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export const PHOTO_STORAGE_BUCKET = 'db-photos';

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const region = process.env['AWS_REGION'] || 'us-east-1';
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'] || '';
    const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'] || '';
    const endpoint = process.env['AWS_ENDPOINT_URL_S3'];

    s3ClientInstance = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

export const StorageClient = {
  async download(bucket: string, key: string): Promise<Buffer | null> {
    const client = getS3Client();
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        return null;
      }

      if (response.Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        return Buffer.concat(chunks);
      } else {
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
      }
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  },

  async upload(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<void> {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async remove(bucket: string, keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;
    const client = getS3Client();
    if (keys.length === 1) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: keys[0],
        }),
      );
    } else {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
          },
        }),
      );
    }
  },
};
