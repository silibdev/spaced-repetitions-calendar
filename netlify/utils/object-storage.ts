import { S3Client, DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export const PHOTO_BUCKET = 'db-photos';

let client: S3Client | undefined;
function s3(): S3Client {
  if (client) return client;
  const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3 } = process.env;
  if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3) {
    throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_ENDPOINT_URL_S3 must be configured');
  }
  client = new S3Client({
    region: AWS_REGION,
    endpoint: AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  });
  return client;
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key }));
    if (!result.Body) return null;
    return Buffer.from(await result.Body.transformToByteArray());
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3().send(new PutObjectCommand({ Bucket: PHOTO_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  for (let offset = 0; offset < keys.length; offset += 1000) {
    const batch = keys.slice(offset, offset + 1000);
    if (!batch.length) continue;
    const result = await s3().send(new DeleteObjectsCommand({
      Bucket: PHOTO_BUCKET,
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: false },
    }));
    if (result.Errors?.length) {
      throw new Error(`S3 object deletion failed for ${result.Errors.length} object(s)`);
    }
  }
}
