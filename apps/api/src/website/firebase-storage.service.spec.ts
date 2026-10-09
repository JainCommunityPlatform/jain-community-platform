jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(),
}));

import { getStorage } from 'firebase-admin/storage';

import { FirebaseStorageService } from './firebase-storage.service';

describe('FirebaseStorageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the Firebase project default bucket when no explicit bucket is configured', async () => {
    const file = {
      save: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue(['https://example.test/default.jpg']),
    };
    const bucket = { file: jest.fn().mockReturnValue(file) };
    (getStorage as jest.Mock).mockReturnValue({ bucket: jest.fn().mockReturnValue(bucket) });

    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn().mockReturnValue({}) } as never,
      {
        get: jest.fn((key: string) =>
          key === 'firebase.projectId' ? 'jain-community-platform' : undefined,
        ),
      } as never,
    );

    await expect(service.uploadTenantImage({
      tenantId: 't1',
      filename: 'hero.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('image'),
    })).resolves.toMatchObject({ url: 'https://example.test/default.jpg' });

    expect((getStorage as jest.Mock).mock.results[0].value.bucket)
      .toHaveBeenCalledWith('jain-community-platform.firebasestorage.app');
  });

  it('falls back to the legacy bucket when the current Firebase bucket is unavailable', async () => {
    const file = {
      save: jest.fn()
        .mockRejectedValueOnce(new Error('new bucket unavailable'))
        .mockResolvedValueOnce(undefined),
      setMetadata: jest.fn().mockResolvedValue(undefined),
    };
    const bucket = { file: jest.fn().mockReturnValue(file) };
    const storage = {
      bucket: jest.fn()
        .mockImplementationOnce(() => bucket)
        .mockImplementationOnce(() => bucket),
    };
    (getStorage as jest.Mock).mockReturnValue(storage);

    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn().mockReturnValue({}) } as never,
      {
        get: jest.fn((key: string) =>
          key === 'firebase.projectId' ? 'jain-community-platform' : undefined,
        ),
      } as never,
    );

    await expect(service.uploadTenantImage({
      tenantId: 't1',
      filename: 'hero.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('image'),
    })).resolves.toMatchObject({ url: 'https://example.test/legacy.jpg' });

    expect(file.setMetadata).toHaveBeenCalledWith({
      metadata: expect.objectContaining({
        firebaseStorageDownloadTokens: expect.any(String),
      }),
    });
    expect(storage.bucket).toHaveBeenNthCalledWith(2, 'jain-community-platform.appspot.com');
  });

  it('accepts a gs:// bucket value and returns a tokenized Firebase download URL', async () => {
    const file = {
      save: jest.fn().mockResolvedValue(undefined),
      setMetadata: jest.fn().mockResolvedValue(undefined),
    };
    const bucket = { file: jest.fn().mockReturnValue(file) };
    const storage = { bucket: jest.fn().mockReturnValue(bucket) };
    (getStorage as jest.Mock).mockReturnValue(storage);

    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn().mockReturnValue({}) } as never,
      {
        get: jest.fn((key: string) =>
          key === 'firebase.storageBucket' ? 'gs://jain-community-platform.firebasestorage.app/' : undefined,
        ),
      } as never,
    );

    const result = await service.uploadTenantImage({
      tenantId: 't1',
      filename: 'temple hero.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('image'),
    });

    expect(storage.bucket).toHaveBeenCalledWith('jain-community-platform.firebasestorage.app');
    expect(result.url).toContain('https://firebasestorage.googleapis.com/v0/b/');
    expect(result.url).toContain('?alt=media&token=');
  });

  it('reports a useful error when every candidate bucket fails', async () => {
    const file = {
      save: jest.fn().mockRejectedValue(new Error('permission denied')),
      getSignedUrl: jest.fn(),
    };
    const bucket = { file: jest.fn().mockReturnValue(file) };
    (getStorage as jest.Mock).mockReturnValue({
      bucket: jest.fn().mockReturnValue(bucket),
    });

    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn().mockReturnValue({}) } as never,
      {
        get: jest.fn((key: string) =>
          key === 'firebase.projectId' ? 'jain-community-platform' : undefined,
        ),
      } as never,
    );

    await expect(service.uploadTenantImage({
      tenantId: 't1',
      filename: 'hero.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.from('image'),
    })).rejects.toThrow('Firebase Storage upload failed');
  });

  it('rejects images larger than 10 MB', async () => {
    const service = new FirebaseStorageService(
      { getFirebaseApp: jest.fn() } as never,
      { get: jest.fn().mockReturnValue('bucket') } as never,
    );

    await expect(service.uploadTenantImage({
      tenantId: 't1',
      filename: 'hero.jpg',
      contentType: 'image/jpeg',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    })).rejects.toThrow('10 MB limit');
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
