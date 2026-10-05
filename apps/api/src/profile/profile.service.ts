import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { FirestoreService } from '../database/firestore.service';
import { UserIdentityService } from '../identity/user-identity.service';
import { UserActivity, UserProfile } from './profile.types';

@Injectable()
export class ProfileService {
  constructor(private readonly firestore: FirestoreService, private readonly identity: UserIdentityService) {}

  async getCurrent(authenticated: AuthenticatedUser): Promise<UserProfile> {
    return this.toProfile(await this.identity.resolve(authenticated));
  }

  async updateCurrent(authenticated: AuthenticatedUser, input: Parameters<FirestoreService['updateUserProfile']>[1]): Promise<UserProfile> {
    const user = await this.identity.resolve(authenticated);
    return this.toProfile(await this.firestore.updateUserProfile(user.id, input));
  }

  async linkCurrentContact(authenticated: AuthenticatedUser, value: string): Promise<UserProfile> {
    const normalized = normalizeIndianMobile(value);
    const user = await this.identity.resolve(authenticated);
    try { return this.toProfile(await this.firestore.linkPhoneToUser(user.id, normalized)); }
    catch (error) {
      if (error instanceof Error && error.message.includes('already linked')) throw new ConflictException(error.message);
      throw error;
    }
  }

  async provisionByContact(input: { value: string; displayName?: string; address?: string }): Promise<UserProfile> {
    const normalized = normalizeIndianMobile(input.value);
    return this.toProfile(await this.firestore.provisionUserByPhone({
      phone: normalized,
      displayName: input.displayName,
      address: input.address,
    }));
  }

  async resolveByContact(value: string): Promise<UserProfile | null> {
    const normalized = normalizeIndianMobile(value);
    return this.toProfileNullable(await this.firestore.findUserByPhone(normalized));
  }

  async adminSetContact(userId: string, value: string): Promise<UserProfile> {
    const normalized = normalizeIndianMobile(value);
    if (!(await this.firestore.getUser(userId))) throw new NotFoundException('User profile not found');
    try { return this.toProfile(await this.firestore.setPrimaryPhone(userId, normalized)); }
    catch (error) {
      if (error instanceof Error && error.message.includes('already linked')) throw new ConflictException(error.message);
      throw error;
    }
  }

  async activities(authenticated: AuthenticatedUser): Promise<UserActivity[]> {
    const user = await this.identity.resolve(authenticated);
    const activities = await this.firestore.listUserActivities(user.id);
    return activities.map(a => ({ id:a.id, eventType:a.eventType, eventId:a.eventId, title:a.title, participatedAt:a.participatedAt.toISOString(), tenantId:a.tenantId }));
  }

  async recordActivity(input: {userId:string; tenantId?:string; eventType:string; eventId:string; title:string; participatedAt:string}): Promise<void> {
    await this.firestore.recordUserActivity({ id:'', userId:input.userId, tenantId:input.tenantId, eventType:input.eventType, eventId:input.eventId, title:input.title, participatedAt:new Date(input.participatedAt) });
  }

  private toProfileNullable(user: Awaited<ReturnType<FirestoreService['getUser']>>): UserProfile | null {
    return user ? this.toProfile(user) : null;
  }

  private toProfile(user: Awaited<ReturnType<FirestoreService['getUser']>>): UserProfile {
    if (!user) throw new NotFoundException('User profile not found');
    return { id:user.id, displayName:user.displayName, email:user.email, primaryPhone:user.primaryPhone, phoneNumbers:user.phoneNumbers, address:user.address, city:user.city, state:user.state, postalCode:user.postalCode, needsPhoneLink:!user.primaryPhone };
  }
}

function normalizeIndianMobile(value: string): string {
  const normalized = String(value).replace(/\\D/g, '');
  if (!/^[6-9][0-9]{9}$/.test(normalized)) throw new ConflictException('A valid Indian mobile number is required');
  return normalized;
}
