import { ConfigService } from '@nestjs/config';

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

import { getAuth } from 'firebase-admin/auth';
import { FirestoreService } from '../database/firestore.service';
import { JwtAuthenticationService } from './jwt-authentication.service';

describe('JwtAuthenticationService', () => {
  const verifyIdToken = jest.fn();
  const firestore = {
    getFirebaseApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  } as unknown as FirestoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ verifyIdToken });
  });

  it('verifies a Firebase ID token and maps optional claims', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'subject-a',
      email: 'a@test',
      name: 'A',
    });

    const service = new JwtAuthenticationService(firestore);
    await expect(service.verify('token')).resolves.toEqual({
      subject: 'subject-a',
      email: 'a@test',
      displayName: 'A',
    });
    expect(getAuth).toHaveBeenCalledWith({ name: '[DEFAULT]' });
    expect(verifyIdToken).toHaveBeenCalledWith('token');
  });

  it('rejects a token without a subject', async () => {
    verifyIdToken.mockResolvedValue({});

    await expect(
      new JwtAuthenticationService(firestore).verify('token'),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects an invalid Firebase token', async () => {
    verifyIdToken.mockRejectedValue(new Error('FirebaseAuthError'));

    await expect(
      new JwtAuthenticationService(firestore).verify('token'),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects an empty bearer token', async () => {
    await expect(
      new JwtAuthenticationService(firestore).verify('   '),
    ).rejects.toMatchObject({ status: 401 });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
