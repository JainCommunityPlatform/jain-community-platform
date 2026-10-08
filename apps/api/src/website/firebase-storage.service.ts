import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    const bucketName = this.config.get<string>('firebase.storageBucket')?.trim();
    if (!bucketName) {
      throw new ServiceUnavailableException(
        'Firebase Storage is not configured. Set FIREBASE_STORAGE_BUCKET.',
      );
    }

    if (!input.contentType.startsWith('image/')) {
      throw new Error('Only image uploads are supported');
    }

    if (input.buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image upload exceeds the 10 MB limit');
    }

    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = 'tenants/' + input.tenantId + '/website/' + Date.now() + '-' + safeName;
    const bucket = getStorage(this.firestore.getFirebaseApp()).bucket(bucketName);
    const file = bucket.file(path);

    await file.save(input.buffer, {
      resumable: false,
      metadata: {
        contentType: input.contentType,
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '2036-01-01',
    });

    return {
      path,
      url,
      contentType: input.contentType,
      size: input.buffer.length,
    };
  }
}
