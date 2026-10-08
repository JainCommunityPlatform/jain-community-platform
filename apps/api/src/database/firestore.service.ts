import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WebsiteSiteConfig } from '../website/website.types';
import { randomUUID, createHash } from 'node:crypto';
import {
  App,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';

export interface FirestoreUser {
  id: string;
  authSubject: string;
  email?: string;
  displayName?: string;
  primaryPhone?: string;
  phoneNumbers: string[];
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  mergedInto?: string;
  platformRoles: string[];
}

export interface FirestoreUserActivity {
  id: string;
  userId: string;
  tenantId?: string;
  eventType: string;
  eventId: string;
  title: string;
  participatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface FirestoreMembership {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  createdAt: Date;
  user?: { email: string | null; displayName: string | null; primaryPhone: string | null };
}

export interface FirestoreAuditLogInput {
  tenantId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FirestoreService implements OnModuleInit {
  private app?: App;
  private firestore?: Firestore;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    if (this.config.get<boolean>('firebase.bootstrapEnabled', false)) {
      await this.ensureBootstrapTenant();
    } else {
      await this.ensureBootstrapPlatformAdmin();
    }
  }

  private getDb(): Firestore {
    if (this.firestore) return this.firestore;

    this.app =
      getApps()[0] ??
      initializeApp({
        projectId: this.config.get<string>('firebase.projectId'),
        credential: this.createCredential(),
      });

    const databaseId =
      this.config.get<string>('firebase.databaseId')?.trim() ||
      '(default)';

    this.firestore = getFirestore(this.app, databaseId);
    return this.firestore;
  }

  private createCredential() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
    if (serviceAccountJson) {
      return cert(
        JSON.parse(
          Buffer.from(serviceAccountJson, 'base64').toString('utf8'),
        ),
      );
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey =
      process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim()
        ? Buffer.from(
            process.env.FIREBASE_PRIVATE_KEY_BASE64,
            'base64',
          ).toString('utf8')
        : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      return cert({
        projectId: this.config.get<string>('firebase.projectId'),
        clientEmail,
        privateKey,
      });
    }

    return applicationDefault();
  }

  async upsertUser(input: {
    subject: string;
    email?: string;
    displayName?: string;
  }): Promise<FirestoreUser> {
    const db = this.getDb();
    const indexRef = db
      .collection('userAuthIndexes')
      .doc(hashSubject(input.subject));

    const user = await db.runTransaction(async (transaction) => {
      const indexSnapshot = await transaction.get(indexRef);
      let userId = indexSnapshot.exists
        ? (indexSnapshot.data()?.userId as string)
        : undefined;

      if (!userId) userId = randomUUID();

      const userRef = db.collection('users').doc(userId);
      const existing = await transaction.get(userRef);
      const now = Timestamp.now();

      transaction.set(
        userRef,
        {
          authSubject: input.subject,
          email: input.email ?? null,
          displayName: input.displayName ?? null,
          ...(existing.exists ? {} : { createdAt: now }),
          updatedAt: now,
        },
        { merge: true },
      );

      transaction.set(
        indexRef,
        { userId, authSubject: input.subject },
        { merge: true },
      );

      const current = this.toUser(userId, existing.data() ?? {});
      return {
        ...current,
        id: userId,
        authSubject: input.subject,
        email: input.email ?? current.email,
        displayName: input.displayName ?? current.displayName,
        phoneNumbers: current.phoneNumbers,
        platformRoles: current.platformRoles,
      };
    });

    await this.claimTenantAdminInvites(user.id, input.email);
    return user;
  }

  async getUser(userId: string): Promise<FirestoreUser | null> {
    const snapshot = await this.getDb().collection('users').doc(userId).get();
    if (!snapshot.exists) return null;
    return this.toUser(snapshot.id, snapshot.data() ?? {});
  }

  async updateUserProfile(userId: string, input: {
    displayName?: string; address?: string; city?: string; state?: string; postalCode?: string;
  }): Promise<FirestoreUser> {
    const ref = this.getDb().collection('users').doc(userId);
    await ref.set({ ...input, updatedAt: Timestamp.now() }, { merge: true });
    const user = await this.getUser(userId);
    if (!user) throw new Error('User disappeared while updating profile');
    return user;
  }

  async linkPhoneToUser(userId: string, phone: string): Promise<FirestoreUser> {
    const db = this.getDb();
    const indexRef = db.collection('userPhoneIndexes').doc(hashPhone(phone));
    const userRef = db.collection('users').doc(userId);
    const userBefore = await this.getUser(userId);
    if (!userBefore) throw new Error('User not found');
    const authIndexRef = db.collection('userAuthIndexes').doc(hashSubject(userBefore.authSubject));

    return db.runTransaction(async (transaction) => {
      const [userSnapshot, phoneSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(indexRef)]);
      if (!userSnapshot.exists) throw new Error('User not found');
      const current = this.toUser(userId, userSnapshot.data() ?? {});
      const indexedUserId = phoneSnapshot.exists ? phoneSnapshot.data()?.userId as string | undefined : undefined;

      if (indexedUserId && indexedUserId !== userId) {
        const targetRef = db.collection('users').doc(indexedUserId);
        const targetSnapshot = await transaction.get(targetRef);
        if (!targetSnapshot.exists) throw new Error('Phone index is inconsistent');
        const target = this.toUser(indexedUserId, targetSnapshot.data() ?? {});
        const phones = uniquePhones([...target.phoneNumbers, phone]);
        transaction.set(targetRef, { phoneNumbers: phones, primaryPhone: target.primaryPhone ?? phone, updatedAt: Timestamp.now() }, { merge: true });
        transaction.set(indexRef, { userId: indexedUserId, phone }, { merge: true });
        transaction.set(authIndexRef, { userId: indexedUserId }, { merge: true });
        transaction.set(userRef, { mergedInto: indexedUserId, updatedAt: Timestamp.now() }, { merge: true });
        return { ...target, phoneNumbers: phones, primaryPhone: target.primaryPhone ?? phone };
      }

      const phones = uniquePhones([...current.phoneNumbers, phone]);
      transaction.set(userRef, { phoneNumbers: phones, primaryPhone: current.primaryPhone ?? phone, updatedAt: Timestamp.now() }, { merge: true });
      transaction.set(indexRef, { userId, phone }, { merge: true });
      return { ...current, phoneNumbers: phones, primaryPhone: current.primaryPhone ?? phone };
    });
  }

  async provisionUserByPhone(input: { phone: string; displayName?: string; address?: string }): Promise<FirestoreUser> {
    const db = this.getDb();
    const indexRef = db.collection('userPhoneIndexes').doc(hashPhone(input.phone));
    return db.runTransaction(async (transaction) => {
      const index = await transaction.get(indexRef);
      if (index.exists) {
        const existing = await transaction.get(db.collection('users').doc(index.data()?.userId as string));
        if (existing.exists) return this.toUser(existing.id, existing.data() ?? {});
      }
      const userId = randomUUID();
      const subject = 'migration:' + hashPhone(input.phone);
      const now = Timestamp.now();
      transaction.create(db.collection('users').doc(userId), {
        authSubject: subject,
        displayName: input.displayName ?? null,
        address: input.address ?? null,
        phoneNumbers: [input.phone],
        primaryPhone: input.phone,
        createdAt: now,
        updatedAt: now,
      });
      transaction.create(indexRef, { userId, phone: input.phone, createdAt: now });
      transaction.create(db.collection('userAuthIndexes').doc(hashSubject(subject)), { userId, authSubject: subject });
      return { id:userId, authSubject:subject, displayName:input.displayName, address:input.address, primaryPhone:input.phone, phoneNumbers:[input.phone], platformRoles: [] };
    });
  }

  async findUserByPhone(phone: string): Promise<FirestoreUser | null> {
    const snapshot = await this.getDb().collection('userPhoneIndexes').doc(hashPhone(phone)).get();
    if (!snapshot.exists) return null;
    const userId = snapshot.data()?.userId as string | undefined;
    return userId ? this.getUser(userId) : null;
  }

  async setPrimaryPhone(userId: string, phone: string): Promise<FirestoreUser> {
    const db = this.getDb();
    const indexRef = db.collection('userPhoneIndexes').doc(hashPhone(phone));
    const userRef = db.collection('users').doc(userId);
    return db.runTransaction(async (transaction) => {
      const [userSnapshot, indexSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(indexRef)]);
      if (!userSnapshot.exists) throw new Error('User not found');
      const owner = indexSnapshot.exists ? indexSnapshot.data()?.userId as string | undefined : undefined;
      if (owner && owner !== userId) throw new Error('Phone number is already linked to another profile');
      const user = this.toUser(userId, userSnapshot.data() ?? {});
      const phones = uniquePhones([...user.phoneNumbers, phone]);
      transaction.set(userRef, { phoneNumbers: phones, primaryPhone: phone, updatedAt: Timestamp.now() }, { merge: true });
      transaction.set(indexRef, { userId, phone }, { merge: true });
      return { ...user, phoneNumbers: phones, primaryPhone: phone };
    });
  }

  async migrateRegistrationsToUsers(input: { dryRun?: boolean; limit?: number } = {}): Promise<{
    dryRun: boolean;
    registrationsScanned: number;
    registrationsLinked: number;
    registrationsSkipped: number;
    uniqueMobiles: number;
    existingUsersLinked: number;
    usersCreated: number;
    duplicateRegistrationLinks: number;
  }> {
    const db = this.getDb();
    const dryRun = input.dryRun === true;
    const snapshot = await db.collection('registrations').get();
    const docs = input.limit && input.limit > 0
      ? snapshot.docs.slice(0, input.limit)
      : snapshot.docs;

    const groups = new Map<string, {
      phone: string;
      docs: QueryDocumentSnapshot[];
      displayName?: string;
      address?: string;
    }>();

    let registrationsSkipped = 0;

    for (const doc of docs) {
      const data = doc.data();
      const phone = normalizeIndianMobileForMigration(data.mobile);
      if (!phone) {
        registrationsSkipped += 1;
        continue;
      }

      const existing = groups.get(phone);
      if (existing) {
        existing.docs.push(doc);
        if (!existing.displayName && typeof data.name === 'string' && data.name.trim()) {
          existing.displayName = data.name.trim();
        }
        if (!existing.address && typeof data.address === 'string' && data.address.trim()) {
          existing.address = data.address.trim();
        }
        continue;
      }

      groups.set(phone, {
        phone,
        docs: [doc],
        displayName: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
        address: typeof data.address === 'string' && data.address.trim() ? data.address.trim() : undefined,
      });
    }

    const result = {
      dryRun,
      registrationsScanned: docs.length,
      registrationsLinked: 0,
      registrationsSkipped,
      uniqueMobiles: groups.size,
      existingUsersLinked: 0,
      usersCreated: 0,
      duplicateRegistrationLinks: 0,
    };

    const batchWrites: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];

    for (const group of groups.values()) {
      const existingUser = await this.findUserByPhone(group.phone);

      if (dryRun) {
        if (existingUser) result.existingUsersLinked += 1;
        else result.usersCreated += 1;
      } else {
        let user = existingUser;
        if (user) {
          result.existingUsersLinked += 1;
          const profilePatch: { displayName?: string; address?: string } = {};
          if (!user.displayName && group.displayName) profilePatch.displayName = group.displayName;
          if (!user.address && group.address) profilePatch.address = group.address;
          if (Object.keys(profilePatch).length) {
            user = await this.updateUserProfile(user.id, profilePatch);
          }
        } else {
          user = await this.provisionUserByPhone({
            phone: group.phone,
            displayName: group.displayName,
            address: group.address,
          });
          result.usersCreated += 1;
        }

        const linkedAt = Timestamp.now();
        for (const doc of group.docs) {
          batchWrites.push({
            ref: doc.ref,
            data: {
              userId: user.id,
              jcpUserId: user.id,
              identityMigration: 'registrations-to-users-v1',
              identityLinkedAt: linkedAt,
            },
          });
        }
        result.registrationsLinked += group.docs.length;
        result.duplicateRegistrationLinks += Math.max(0, group.docs.length - 1);
      }
    }

    if (!dryRun) {
      for (let i = 0; i < batchWrites.length; i += 400) {
        const batch = db.batch();
        for (const write of batchWrites.slice(i, i + 400)) {
          batch.set(write.ref, write.data, { merge: true });
        }
        await batch.commit();
      }
    }

    return result;
  }

  async listUserActivities(userId: string): Promise<FirestoreUserActivity[]> {
    const db = this.getDb();
    const [activitySnapshot, kshamawaniSnapshot, pratibhaSnapshot] = await Promise.all([
      db.collection('userActivities').where('userId', '==', userId).get(),
      db.collection('registrations').where('userId', '==', userId).get(),
      db.collection('pratibhaSammanApplications').where('userId', '==', userId).get(),
    ]);

    const activities: FirestoreUserActivity[] = activitySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, userId, tenantId: data.tenantId as string | undefined, eventType: data.eventType as string, eventId: data.eventId as string, title: data.title as string, participatedAt: toDate(data.participatedAt), metadata: data.metadata as Record<string, unknown> | undefined };
    });

    for (const doc of kshamawaniSnapshot.docs) {
      const data = doc.data();
      activities.push({
        id: 'kshamawani:' + doc.id, userId, tenantId: 'bade-baba-kharadi',
        eventType: 'KSHAMAWANI', eventId: data.eventId as string || doc.id,
        title: 'Kshamawani 2026', participatedAt: toDate(data.createdAt),
      });
    }

    for (const doc of pratibhaSnapshot.docs) {
      const data = doc.data();
      activities.push({
        id: 'pratibha:' + doc.id, userId, tenantId: 'bade-baba-kharadi',
        eventType: 'PRATIBHA_SAMMAN', eventId: data.applicationId as string || doc.id,
        title: 'Pratibha Samman 2026', participatedAt: toDate(data.createdAt),
      });
    }

    return activities.sort((a, b) => b.participatedAt.getTime() - a.participatedAt.getTime());
  }

  async recordUserActivity(input: Omit<FirestoreUserActivity, 'id'>): Promise<void> {
    const id = hashActivity(input.userId, input.eventType, input.eventId);
    await this.getDb().collection('userActivities').doc(id).set({
      userId: input.userId, tenantId: input.tenantId ?? null, eventType: input.eventType,
      eventId: input.eventId, title: input.title, participatedAt: input.participatedAt,
      metadata: input.metadata ?? null, updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  private toUser(id: string, data: Record<string, unknown>): FirestoreUser {
    return {
      id, authSubject: data.authSubject as string,
      email: (data.email as string | null) ?? undefined,
      displayName: (data.displayName as string | null) ?? undefined,
      primaryPhone: (data.primaryPhone as string | null) ?? undefined,
      phoneNumbers: Array.isArray(data.phoneNumbers) ? data.phoneNumbers as string[] : [],
      address: (data.address as string | null) ?? undefined,
      city: (data.city as string | null) ?? undefined,
      state: (data.state as string | null) ?? undefined,
      postalCode: (data.postalCode as string | null) ?? undefined,
      mergedInto: (data.mergedInto as string | null) ?? undefined,
      platformRoles: Array.isArray(data.platformRoles) ? data.platformRoles as string[] : [],
    };
  }

  getFirebaseApp(): App {
    this.getDb();
    if (!this.app) throw new Error('Firebase Admin app is not initialized');
    return this.app;
  }

  async getTenantByHostname(hostname: string): Promise<{
    id: string;
    name: string;
    hostname: string;
    status: string;
    verified: boolean;
  } | null> {
    const db = this.getDb();
    const domainSnapshot = await db
      .collection('tenantDomains')
      .doc(hostname)
      .get();

    if (!domainSnapshot.exists) return null;

    const domain = domainSnapshot.data() ?? {};
    const tenantId = domain.tenantId as string | undefined;
    if (!tenantId) return null;

    const tenantSnapshot = await db.collection('tenants').doc(tenantId).get();
    if (!tenantSnapshot.exists) return null;

    const tenant = tenantSnapshot.data() ?? {};
    return {
      id: tenantSnapshot.id,
      name: tenant.name as string,
      hostname,
      status: (tenant.status as string | null) ?? 'ACTIVE',
      verified: domain.verified === true,
    };
  }

  async ensureTenant(input: {
    id: string;
    slug: string;
    name: string;
    hostname: string;
  }): Promise<void> {
    const db = this.getDb();
    const tenantRef = db.collection('tenants').doc(input.id);
    const domainRef = db.collection('tenantDomains').doc(input.hostname);
    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Firestore transactions require every read to happen before any write.
      const [tenant, domain] = await Promise.all([
        transaction.get(tenantRef),
        transaction.get(domainRef),
      ]);

      if (!tenant.exists) {
        transaction.create(tenantRef, {
          slug: input.slug,
          name: input.name,
          primaryHostname: input.hostname,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        });
      }

      if (!domain.exists) {
        transaction.create(domainRef, {
          tenantId: input.id,
          hostname: input.hostname,
          createdAt: now,
        });
      }
    });
  }

  async getMembership(
    userId: string,
    tenantId: string,
  ): Promise<FirestoreMembership | null> {
    const snapshot = await this.getDb()
      .collection('memberships')
      .doc(membershipId(userId, tenantId))
      .get();

    if (!snapshot.exists) return null;
    return this.toMembership(snapshot);
  }

  async listMemberships(tenantId: string): Promise<FirestoreMembership[]> {
    const snapshot = await this.getDb()
      .collection('memberships')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'asc')
      .get();

    const memberships = snapshot.docs.map((doc) => this.toMembership(doc));
    await Promise.all(
      memberships.map(async (membership) => {
        const user = await this.getUser(membership.userId);
        membership.user = {
          email: user?.email ?? null,
          displayName: user?.displayName ?? null,
          primaryPhone: user?.primaryPhone ?? null,
        };
      }),
    );

    return memberships;
  }

  async createMembership(input: {
    userId: string;
    tenantId: string;
    role: string;
  }): Promise<FirestoreMembership> {
    const db = this.getDb();
    const ref = db
      .collection('memberships')
      .doc(membershipId(input.userId, input.tenantId));
    const now = Timestamp.now();

    await ref.create({
      userId: input.userId,
      tenantId: input.tenantId,
      role: input.role,
      createdAt: now,
    });

    return this.toMembership(await ref.get());
  }

  async updateMembership(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<FirestoreMembership> {
    const ref = this.getDb()
      .collection('memberships')
      .doc(membershipId(userId, tenantId));
    await ref.update({ role });

    return this.toMembership(await ref.get());
  }

  async deleteMembership(userId: string, tenantId: string): Promise<void> {
    await this.getDb()
      .collection('memberships')
      .doc(membershipId(userId, tenantId))
      .delete();
  }

  async recordAudit(input: FirestoreAuditLogInput): Promise<void> {
    await this.getDb().collection('auditLogs').doc(randomUUID()).create({
      ...input,
      metadata: input.metadata ?? null,
      createdAt: Timestamp.now(),
    });
  }

  private toMembership(snapshot: DocumentSnapshot): FirestoreMembership {
    const data = snapshot.data() ?? {};
    return {
      id: snapshot.id,
      userId: data.userId as string,
      tenantId: data.tenantId as string,
      role: data.role as string,
      createdAt: toDate(data.createdAt),
    };
  }


  async getTenantById(tenantId: string): Promise<{
    id: string;
    slug: string;
    name: string;
    hostname: string;
    status: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } | null> {
    const snapshot = await this.getDb().collection('tenants').doc(tenantId).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    const domain = (data.primaryHostname as string | null) ?? '';
    return {
      id: snapshot.id,
      slug: data.slug as string,
      name: data.name as string,
      hostname: domain,
      status: (data.status as string) ?? 'ACTIVE',
      address: (data.address as string | null) ?? undefined,
      city: (data.city as string | null) ?? undefined,
      state: (data.state as string | null) ?? undefined,
      postalCode: (data.postalCode as string | null) ?? undefined,
    };
  }

  async getTenantBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
    const snapshot = await this.getDb().collection('tenants').where('slug', '==', slug).limit(1).get();
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return { id: snapshot.docs[0].id, name: data.name as string, slug: data.slug as string };
  }

  async listPublicTenants(): Promise<Array<{
    id: string;
    slug: string;
    name: string;
    hostname: string;
    city?: string;
    state?: string;
    address?: string;
    primaryImageUrl?: string;
  }>> {
    const snapshot = await this.getDb().collection('tenants').get();
    const active = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
      .filter((tenant) => (tenant.data.status as string | undefined) !== 'INACTIVE');

    const results = await Promise.all(active.map(async (tenant) => {
      const site = await this.getWebsiteConfig(tenant.id);
      return {
        id: tenant.id,
        slug: tenant.data.slug as string,
        name: tenant.data.name as string,
        hostname: (tenant.data.primaryHostname as string | null) ?? '',
        city: (tenant.data.city as string | null) ?? undefined,
        state: (tenant.data.state as string | null) ?? undefined,
        address: (tenant.data.address as string | null) ?? undefined,
        primaryImageUrl: site?.hero?.imageUrl,
      };
    }));

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTenant(input: {
    id: string;
    slug: string;
    name: string;
    hostname: string;
    customHostname?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    domainVerified?: boolean;
    domainVerificationToken?: string;
  }): Promise<{ id: string; slug: string; name: string; hostname: string }> {
    const db = this.getDb();
    const tenantRef = db.collection('tenants').doc(input.id);
    const domainRef = db.collection('tenantDomains').doc(input.hostname);
    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      const [tenant, domain] = await Promise.all([
        transaction.get(tenantRef),
        transaction.get(domainRef),
      ]);
      if (tenant.exists) throw new Error('Tenant ID already exists');
      if (domain.exists) throw new Error('Tenant hostname already exists');

      transaction.create(tenantRef, {
        slug: input.slug,
        name: input.name,
        primaryHostname: input.hostname,
        status: 'ACTIVE',
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        publicSiteEnabled: true,
        directoryVisible: true,
        createdAt: now,
        updatedAt: now,
      });
      transaction.create(domainRef, {
        tenantId: input.id,
        hostname: input.hostname,
        type: input.customHostname ? 'CUSTOM' : 'PLATFORM_SUBDOMAIN',
        verified: input.domainVerified ?? !input.customHostname,
        verificationToken: input.domainVerificationToken ?? null,
        primary: true,
        createdAt: now,
      });
    });

    return { id: input.id, slug: input.slug, name: input.name, hostname: input.hostname };
  }

  async getTenantPrimaryDomainDetails(tenantId: string): Promise<{
    hostname: string;
    type?: string;
    verified: boolean;
    verificationToken?: string;
  } | null> {
    const snapshot = await this.getDb().collection('tenantDomains')
      .where('tenantId', '==', tenantId)
      .where('primary', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return {
      hostname: data.hostname as string,
      type: data.type as string | undefined,
      verified: data.verified === true,
      verificationToken: data.verificationToken as string | undefined,
    };
  }

  async markTenantPrimaryDomainVerified(tenantId: string): Promise<void> {
    const snapshot = await this.getDb().collection('tenantDomains')
      .where('tenantId', '==', tenantId)
      .where('primary', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) throw new Error('Primary tenant domain not found');
    await snapshot.docs[0].ref.update({
      verified: true,
      verifiedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async getPrimaryTenantDomain(tenantId: string): Promise<{ hostname: string; type?: string } | null> {
    const snapshot = await this.getDb()
      .collection('tenantDomains')
      .where('tenantId', '==', tenantId)
      .where('primary', '==', true)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return { hostname: data.hostname as string, type: data.type as string | undefined };
  }

  async findUserByEmail(email: string): Promise<FirestoreUser | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    const snapshot = await this.getDb().collection('users').where('email', '==', normalized).limit(1).get();
    if (snapshot.empty) return null;
    return this.toUser(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async setPlatformRoles(userId: string, platformRoles: string[]): Promise<FirestoreUser> {
    const ref = this.getDb().collection('users').doc(userId);
    await ref.set({ platformRoles, updatedAt: Timestamp.now() }, { merge: true });
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async assignTenantAdmin(userId: string, tenantId: string): Promise<void> {
    const existing = await this.getMembership(userId, tenantId);
    if (existing) {
      if (existing.role !== 'TENANT_ADMIN') {
        await this.updateMembership(userId, tenantId, 'TENANT_ADMIN');
      }
      return;
    }
    await this.createMembership({ userId, tenantId, role: 'TENANT_ADMIN' });
  }

  async createTenantAdminInvite(input: { tenantId: string; email: string }): Promise<void> {
    const normalized = input.email.trim().toLowerCase();
    await this.getDb().collection('tenantAdminInvites').doc(
      createHash('sha256').update(input.tenantId + ':' + normalized).digest('hex'),
    ).set({
      tenantId: input.tenantId,
      email: normalized,
      status: 'PENDING',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  async claimTenantAdminInvites(userId: string, email?: string): Promise<void> {
    if (!email) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    const snapshot = await this.getDb().collection('tenantAdminInvites')
      .where('email', '==', normalized)
      .where('status', '==', 'PENDING')
      .get();
    if (snapshot.empty) return;

    const batch = this.getDb().batch();
    for (const invite of snapshot.docs) {
      const tenantId = invite.data().tenantId as string;
      const membershipRef = this.getDb().collection('memberships').doc(membershipId(userId, tenantId));
      batch.set(membershipRef, {
        userId,
        tenantId,
        role: 'TENANT_ADMIN',
        createdAt: Timestamp.now(),
      }, { merge: true });
      batch.update(invite.ref, { status: 'CLAIMED', userId, claimedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }
    await batch.commit();
  }

  async getWebsiteConfig(tenantId: string): Promise<WebsiteSiteConfig | null> {
    const snapshot = await this.getDb().collection('tenantSiteConfigs').doc(tenantId).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as WebsiteSiteConfig;
  }

  async setWebsiteConfig(tenantId: string, config: WebsiteSiteConfig): Promise<void> {
    await this.getDb().collection('tenantSiteConfigs').doc(tenantId).set({
      ...config,
      tenantId,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  private async ensureBootstrapPlatformAdmin(): Promise<void> {
    const subject = this.config.get<string>('firebase.bootstrapPlatformAdminSubject')?.trim();
    if (!subject) return;

    const user = await this.upsertUser({
      subject,
      email: this.config.get<string>('firebase.bootstrapAdminEmail'),
      displayName: this.config.get<string>('firebase.bootstrapAdminName'),
    });
    if (!user.platformRoles.includes('PLATFORM_ADMIN')) {
      await this.setPlatformRoles(user.id, ['PLATFORM_ADMIN']);
    }
  }

  private async ensureBootstrapTenant(): Promise<void> {
    const tenantId = this.config.get<string>('firebase.bootstrapTenantId');
    const hostname = normalizeHostname(
      this.config.get<string>('firebase.bootstrapTenantHostname'),
    );
    const name = this.config.get<string>('firebase.bootstrapTenantName');
    const slug = this.config.get<string>('firebase.bootstrapTenantSlug');

    if (!tenantId || !hostname || !name || !slug) {
      throw new Error(
        'Firebase bootstrap is enabled but tenant bootstrap configuration is incomplete',
      );
    }

    await this.ensureTenant({ id: tenantId, slug, name, hostname });

    const subject = this.config.get<string>('firebase.bootstrapAdminSubject');
    if (!subject) return;

    const user = await this.upsertUser({
      subject,
      email: this.config.get<string>('firebase.bootstrapAdminEmail'),
      displayName: this.config.get<string>('firebase.bootstrapAdminName'),
    });

    const platformAdminSubject = this.config.get<string>('firebase.bootstrapPlatformAdminSubject');
    if (platformAdminSubject && platformAdminSubject === subject) {
      await this.setPlatformRoles(user.id, ['PLATFORM_ADMIN']);
    }

    if (!(await this.getMembership(user.id, tenantId))) {
      await this.createMembership({
        userId: user.id,
        tenantId,
        role: 'TENANT_ADMIN',
      });
    }
  }
}

function membershipId(userId: string, tenantId: string): string {
  return userId + '__' + tenantId;
}

function hashSubject(subject: string): string {
  return createHash('sha256').update(subject).digest('hex');
}

function hashPhone(phone: string): string { return createHash('sha256').update(phone).digest('hex'); }
function hashActivity(userId: string, eventType: string, eventId: string): string { return createHash('sha256').update(userId + ':' + eventType + ':' + eventId).digest('hex'); }
function uniquePhones(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }

function normalizeIndianMobileForMigration(value: unknown): string | null {
  const normalized = typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/\D/g, '')
    : '';
  return /^[6-9][0-9]{9}$/.test(normalized) ? normalized : null;
}

function normalizeHostname(hostname: string | undefined): string | null {
  if (!hostname) return null;
  const normalized = hostname.trim().toLowerCase().replace(/^www\./, '');
  return normalized || null;
}

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string | number);
}
