import { UserIdentityService } from './user-identity.service';

describe('UserIdentityService', () => {
  it('creates a global user from the stable authentication subject', async () => {
    const prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue({
          id: 'user-a',
          authSubject: 'provider|123',
          email: 'person@example.com',
          displayName: 'Person',
        }),
      },
    } as never;

    const service = new UserIdentityService(prisma);

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

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { authSubject: 'provider|123' },
      create: {
        authSubject: 'provider|123',
        email: 'person@example.com',
        displayName: 'Person',
      },
      update: {
        email: 'person@example.com',
        displayName: 'Person',
      },
    });
  });

  it('supports authenticated identities without email or display name', async () => {
    const prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue({
          id: 'user-a',
          authSubject: 'provider|123',
          email: null,
          displayName: null,
        }),
      },
    } as never;

    const service = new UserIdentityService(prisma);

    await expect(
      service.resolve({ subject: 'provider|123' }),
    ).resolves.toEqual({
      id: 'user-a',
      authSubject: 'provider|123',
    });
  });
});
