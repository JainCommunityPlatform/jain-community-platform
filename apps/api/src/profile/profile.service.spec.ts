import { ConflictException } from '@nestjs/common';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  const identity = { resolve: jest.fn() };
  const firestore = {
    updateUserProfile: jest.fn(),
    linkPhoneToUser: jest.fn(),
    setPrimaryPhone: jest.fn(),
    getUser: jest.fn(),
    getMembership: jest.fn(),
    provisionUserByPhone: jest.fn(),
    findUserByPhone: jest.fn(),
    listUserActivities: jest.fn(),
    recordUserActivity: jest.fn(),
    migrateRegistrationsToUsers: jest.fn(),
  };
  let service: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(firestore as never, identity as never);
    identity.resolve.mockResolvedValue({ id: 'user-1', authSubject: 'auth-1', email: 'a@b.test' });
  });

  it('delegates registration migration to Firestore', async () => {
    firestore.migrateRegistrationsToUsers.mockResolvedValue({ dryRun:true });
    await expect(service.migrateRegistrationsToUsers({ dryRun:true, limit:5 })).resolves.toEqual({ dryRun:true });
    expect(firestore.migrateRegistrationsToUsers).toHaveBeenCalledWith({ dryRun:true, limit:5 });
  });

  it('returns a profile and indicates when contact linking is required', async () => {
    firestore.getUser.mockResolvedValue({ id:'user-1', authSubject:'auth-1', email:'a@b.test', phoneNumbers:[] });
    await expect(service.getCurrent({ subject:'auth-1' })).resolves.toMatchObject({ id:'user-1', needsPhoneLink:true, phoneNumbers:[] });
  });

  it('updates editable profile fields', async () => {
    firestore.updateUserProfile.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:['9876543210'], address:'Pune' });
    await expect(service.updateCurrent({ subject:'auth-1' }, { address:'Pune' })).resolves.toMatchObject({ address:'Pune', primaryPhone:undefined });
    expect(firestore.updateUserProfile).toHaveBeenCalledWith('user-1', { address:'Pune' });
  });

  it('normalizes and links a valid Indian mobile', async () => {
    firestore.linkPhoneToUser.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:['9876543210'], primaryPhone:'9876543210' });
    await expect(service.linkCurrentContact({ subject:'auth-1' }, ' 9876543210 ')).resolves.toMatchObject({ primaryPhone:'9876543210', needsPhoneLink:false });
    expect(firestore.linkPhoneToUser).toHaveBeenCalledWith('user-1', '9876543210');
  });

  it('rejects invalid mobile input', async () => {
    await expect(service.linkCurrentContact({ subject:'auth-1' }, '123')).rejects.toBeInstanceOf(ConflictException);
    expect(firestore.linkPhoneToUser).not.toHaveBeenCalled();
  });

  it('propagates unexpected link errors', async () => {
    firestore.linkPhoneToUser.mockRejectedValue(new Error('database unavailable'));
    await expect(service.linkCurrentContact({ subject:'auth-1' }, '9876543210')).rejects.toThrow('database unavailable');
  });

  it('provisions and resolves profiles by mobile', async () => {
    firestore.provisionUserByPhone.mockResolvedValue({ id:'user-1', authSubject:'migration:1', phoneNumbers:['9876543210'], primaryPhone:'9876543210' });
    firestore.findUserByPhone.mockResolvedValue({ id:'user-1', authSubject:'migration:1', phoneNumbers:['9876543210'], primaryPhone:'9876543210' });
    await expect(service.provisionByContact({ value:'9876543210', displayName:'Member', address:'Pune' })).resolves.toMatchObject({ id:'user-1' });
    await expect(service.resolveByContact('9876543210')).resolves.toMatchObject({ id:'user-1' });
    firestore.findUserByPhone.mockResolvedValue(null);
    await expect(service.resolveByContact('9876543210')).resolves.toBeNull();
  });

  it('rejects missing profiles and enforces tenant membership for admin changes', async () => {
    firestore.getUser.mockResolvedValue(null);
    await expect(service.adminSetContact('missing','9876543210')).rejects.toThrow('User profile not found');
    firestore.getUser.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:[] });
    firestore.getMembership.mockResolvedValue(null);
    await expect(service.adminSetContact('user-1','9876543210','tenant-1')).rejects.toThrow('User is not a member of this tenant');
  });

  it('propagates unexpected admin update errors', async () => {
    firestore.getUser.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:[] });
    firestore.setPrimaryPhone.mockRejectedValue(new Error('database unavailable'));
    await expect(service.adminSetContact('user-1','9876543210')).rejects.toThrow('database unavailable');
  });

  it('handles admin updates without tenant context', async () => {
    firestore.getUser.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:[] });
    firestore.setPrimaryPhone.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:['9876543210'], primaryPhone:'9876543210' });
    await expect(service.adminSetContact('user-1','9876543210')).resolves.toMatchObject({ primaryPhone:'9876543210' });
  });

  it('records participation', async () => {
    await service.recordActivity({ userId:'user-1', eventType:'KSHAMAWANI', eventId:'k1', title:'Kshamawani', participatedAt:'2026-09-05T00:00:00Z' });
    expect(firestore.recordUserActivity).toHaveBeenCalledWith(expect.objectContaining({ userId:'user-1', eventType:'KSHAMAWANI' }));
  });

  it('returns participation history', async () => {
    firestore.listUserActivities.mockResolvedValue([{ id:'a1', userId:'user-1', eventType:'KSHAMAWANI', eventId:'k1', title:'Kshamawani', participatedAt:new Date('2026-09-05T00:00:00Z') }]);
    await expect(service.activities({ subject:'auth-1' })).resolves.toEqual([{ id:'a1', eventType:'KSHAMAWANI', eventId:'k1', title:'Kshamawani', participatedAt:'2026-09-05T00:00:00.000Z', tenantId:undefined }]);
  });

  it('rejects duplicate admin mobile ownership', async () => {
    firestore.getUser.mockResolvedValue({ id:'user-1', authSubject:'auth-1', phoneNumbers:[] });
    firestore.setPrimaryPhone.mockRejectedValue(new Error('Phone number is already linked to another profile'));
    await expect(service.adminSetContact('user-1','9876543210')).rejects.toBeInstanceOf(ConflictException);
  });
});
