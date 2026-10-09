import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';

import { FirestoreService } from '../database/firestore.service';

export interface UploadedMedia {
  path: string;
  url: string;
  contentType: string;
  size: number;
}

@Injectable()
export class FirebaseStorageService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly config: ConfigService,
  ) {}

  async uploadTenantImage(input: {
    tenantId: string;
    filename: string;
    contentType: string;
    buffer: Buffer;
  }): Promise<UploadedMedia> {
    const configuredBucket = this.config.get<string>('firebase.storageBucket')?.trim();
    const projectId = this.config.get<string>('firebase.projectId')?.trim();
    const bucketNames = [
      configuredBucket,
      projectId ? `${projectId}.firebasestorage.app` : undefined,
      projectId ? `${projectId}.appspot.com` : undefined,
    ].map((value) => normalizeBucketName(value))
      .filter((value, index, values): value is string =>
        Boolean(value) && values.indexOf(value) === index,
      );

    if (bucketNames.length === 0) {
      throw new ServiceUnavailableException(
        'Firebase Storage is not configured. Set FIREBASE_PROJECT_ID or FIREBASE_STORAGE_BUCKET.',
      );
    }

    // Mobile/browser file pickers sometimes label valid image bytes as
    // application/octet-stream. Trust a recognized image signature in that
    // case, but never allow an arbitrary non-image payload through.
    const detectedContentType = detectImageContentType(input.buffer);
    const suppliedContentType = input.contentType.trim().toLowerCase().split(';')[0];
    const contentType = suppliedContentType.startsWith('image/')
      ? suppliedContentType
      : detectedContentType;

    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Only image uploads are supported');
    }

    if (input.buffer.length === 0) {
      throw new Error('The uploaded image is empty');
    }

    if (input.buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image upload exceeds the 10 MB limit');
    }

    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = 'tenants/' + input.tenantId + '/website/' + Date.now() + '-' + safeName;
    const storage = getStorage(this.firestore.getFirebaseApp());
    let lastError: unknown;

    for (const bucketName of bucketNames) {
      try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(path);

        await file.save(input.buffer, {
          resumable: false,
          metadata: {
            contentType,
            cacheControl: 'public,max-age=31536000,immutable',
          },
        });

        // Temple website media is intentionally public-facing. Use a Firebase
        // download token rather than getSignedUrl(), which requires the runtime
        // service account to have IAM signBlob permission and can turn an
        // otherwise successful upload into a 500 response.
        const downloadToken = randomUUID();
        await file.setMetadata({
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        });
        const url =
          'https://firebasestorage.googleapis.com/v0/b/' +
          encodeURIComponent(bucketName) +
          '/o/' +
          encodeURIComponent(path) +
          '?alt=media&token=' +
          encodeURIComponent(downloadToken);

        return {
          path,
          url,
          contentType,
          size: input.buffer.length,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw new ServiceUnavailableException(
      `Firebase Storage upload failed for the configured project buckets: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }
}

function detectImageContentType(buffer: Buffer): string | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }
  return undefined;
}

function normalizeBucketName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^gs:\/\//i, '').replace(/\/$/, '');
  return trimmed || undefined;
}
