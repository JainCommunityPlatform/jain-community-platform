import { ProfileService } from './profile.service';

describe('ProfileService registration context', () => {
  it('returns canonical profile and participation for forms', async () => {
    const firestore = {
      getUser: jest.fn().mockResolvedValue({
        id: 'u1',
        displayName: 'Test User',
        email: 'test@example.com',
        primaryPhone: '9876543210',
        phoneNumbers: ['9876543210'],
        address: 'Pune',
        city: 'Pune',
        state: 'MH',
        postalCode: '411001',
      }),
      listUserActivities: jest.fn().mockResolvedValue([
        {
          id: 'a1',
          eventType: 'KSHAMAWANI',
          eventId: 'k26',
          title: 'Kshamawani 2026',
          participatedAt: new Date('2026-09-01T10:00:00.000Z'),
          tenantId: 'bade-baba-kharadi',
        },
      ]),
    };
    const identity = { resolve: jest.fn().mockResolvedValue({ id: 'u1' }) };
    const service = new ProfileService(firestore as never, identity as never);

    await expect(service.registrationContext({ subject: 'google-subject' } as never)).resolves.toEqual({
      profile: {
        id: 'u1',
        displayName: 'Test User',
        email: 'test@example.com',
        primaryPhone: '9876543210',
        phoneNumbers: ['9876543210'],
        address: 'Pune',
        city: 'Pune',
        state: 'MH',
        postalCode: '411001',
      },
      activities: [
        {
          id: 'a1',
          eventType: 'KSHAMAWANI',
          eventId: 'k26',
          title: 'Kshamawani 2026',
          participatedAt: '2026-09-01T10:00:00.000Z',
          tenantId: 'bade-baba-kharadi',
        },
      ],
    });
  });
});
