jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(),
}));

import { getStorage } from 'firebase-admin/storage';

import { FirebaseStorageService } from './firebase-storage.service';

describe('FirebaseStorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects uploads when storage is not configured', async () => {
    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn() } as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );

    await expect(service.uploadTenantImage({
      tenantId: 't1',
      filename: 'hero.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('image'),
    })).rejects.toThrow('FIREBASE_STORAGE_BUCKET');
  });

  it('uploads a tenant-scoped image and returns a signed URL', async () => {
    const file = {
      save: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue(['https://example.test/image.jpg']),
    };
    const bucket = { file: jest.fn().mockReturnValue(file) };
    (getStorage as jest.Mock).mockReturnValue({ bucket: jest.fn().mockReturnValue(bucket) });

    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn().mockReturnValue({}) } as never,
      { get: jest.fn().mockReturnValue('bucket') } as never,
    );

    const result = await service.uploadTenantImage({
      tenantId: 't1',
      filename: 'hero photo.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('image'),
    });

    expect(result.url).toBe('https://example.test/image.jpg');
    expect(file.save).toHaveBeenCalled();
    expect(bucket.file).toHaveBeenCalledWith(expect.stringContaining('tenants/t1/website/'));
  });

  it('rejects non-image uploads', async () => {
    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn() } as never,
      { get: jest.fn().mockReturnValue('bucket') } as never,
    );

    await expect(service.uploadTenantImage({
      tenantId: 't1',
      filename: 'file.txt',
      contentType: 'text/plain',
      buffer: Buffer.from('text'),
    })).rejects.toThrow('Only image uploads are supported');
  });
});
