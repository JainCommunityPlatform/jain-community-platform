import { UserIdentityService } from './user-identity.service';

describe('UserIdentityService', () => {
  it('creates a global user from the stable authentication subject', async () => {
    const upsertUser = jest.fn().mockResolvedValue({
      id: 'user-a',
      authSubject: 'provider|123',
      email: 'person@example.com',
      displayName: 'Person',
    });
    const firestore = { upsertUser };

    const service = new UserIdentityService(firestore as never);

    await expect(
      service.resolve({
        subject: 'provider|123',
        email: 'person@example.com',
        displayName: 'Person',
      }),
    ).resolves.toEqual({
      id: 'user-a',
      authSubject: 'provider|123',
      email: 'person@example.com',
      displayName: 'Person',
    });

    expect(upsertUser).toHaveBeenCalledWith({
      subject: 'provider|123',
      email: 'person@example.com',
      displayName: 'Person',
    });
  });

  it('supports authenticated identities without email or display name', async () => {
    const upsertUser = jest.fn().mockResolvedValue({
      id: 'user-a',
      authSubject: 'provider|123',
    });
    const firestore = { upsertUser };

    const service = new UserIdentityService(firestore as never);

    await expect(
      service.resolve({ subject: 'provider|123' }),
    ).resolves.toEqual({
      id: 'user-a',
      authSubject: 'provider|123',
    });

    expect(upsertUser).toHaveBeenCalledWith({
      subject: 'provider|123',
      email: undefined,
      displayName: undefined,
    });
  });
});
