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
  DocumentSnapshot,
  Firestore,
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
  roles: string[];
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
    const subject = 'migration:' + hashPhone(input.phone);
    const authIndexRef = db.collection('userAuthIndexes').doc(hashSubject(subject));

    return db.runTransaction(async (transaction) => {
      const [index, authIndex] = await Promise.all([
        transaction.get(indexRef),
        transaction.get(authIndexRef),
      ]);

      const indexedUserId = index.exists ? index.data()?.userId as string | undefined : undefined;
      const authIndexedUserId = authIndex.exists ? authIndex.data()?.userId as string | undefined : undefined;

      for (const candidateUserId of [indexedUserId, authIndexedUserId]) {
        if (!candidateUserId) continue;
        const existing = await transaction.get(db.collection('users').doc(candidateUserId));
        if (existing.exists) {
          // Repair either stale index so both identity indexes converge on the
          // same canonical user rather than attempting a duplicate create.
          transaction.set(indexRef, { userId: existing.id, phone: input.phone }, { merge: true });
          transaction.set(authIndexRef, { userId: existing.id, authSubject: subject }, { merge: true });
          return this.toUser(existing.id, existing.data() ?? {});
        }
      }

      const userId = randomUUID();
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
      transaction.set(indexRef, { userId, phone: input.phone, createdAt: now }, { merge: true });
      transaction.set(authIndexRef, { userId, authSubject: subject }, { merge: true });
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
    // Filter by tenant without requiring a composite Firestore index on
    // (tenantId, createdAt). Sort the small tenant-scoped result set in memory
    // so administrator management keeps working in newly provisioned projects.
    const snapshot = await this.getDb()
      .collection('memberships')
      .where('tenantId', '==', tenantId)
      .get();

    const memberships = snapshot.docs
      .map((doc) => this.toMembership(doc))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
    roles?: string[];
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
      roles: [...new Set(input.roles ?? [input.role])],
      createdAt: now,
    });

    return this.toMembership(await ref.get());
  }

  async updateMembership(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<FirestoreMembership> {
    return this.updateMembershipRoles(userId, tenantId, [role]);
  }

  async updateMembershipRoles(
    userId: string,
    tenantId: string,
    roles: string[],
    preferredRole?: string,
  ): Promise<FirestoreMembership> {
    const normalizedRoles = [...new Set(roles.map((role) => role.trim()).filter(Boolean))];
    if (normalizedRoles.length === 0) {
      throw new Error('A membership must have at least one role');
    }
    const ref = this.getDb()
      .collection('memberships')
      .doc(membershipId(userId, tenantId));
    const current = await ref.get();
    const currentRole = current.data()?.role as string | undefined;
    const role = preferredRole && normalizedRoles.includes(preferredRole)
      ? preferredRole
      : currentRole && normalizedRoles.includes(currentRole)
          ? currentRole
          : normalizedRoles[0];
    await ref.update({ role, roles: normalizedRoles, updatedAt: Timestamp.now() });

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
      roles: Array.isArray(data.roles)
        ? (data.roles as unknown[]).filter((role): role is string => typeof role === 'string')
        : typeof data.role === 'string' ? [data.role] : [],
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

  async updateTenant(tenantId: string, input: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    customHostname?: string;
  }): Promise<{
    id: string;
    slug: string;
    name: string;
    hostname: string;
    status: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }> {
    const db = this.getDb();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const snapshot = await tenantRef.get();
    if (!snapshot.exists) throw new Error('Tenant not found');

    const current = snapshot.data() ?? {};
    const nextHostname = input.customHostname?.trim()
      ? normalizeHostname(input.customHostname)
      : undefined;

    if (nextHostname && nextHostname !== current.primaryHostname) {
      const domain = await db.collection('tenantDomains').doc(nextHostname).get();
      if (domain.exists && domain.data()?.tenantId !== tenantId) {
        throw new Error('Tenant hostname is already in use');
      }
    }

    const patch: Record<string, unknown> = {
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.state !== undefined ? { state: input.state.trim() } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode.trim() } : {}),
      updatedAt: Timestamp.now(),
    };

    if (nextHostname) {
      patch.primaryHostname = nextHostname;
      const oldDomain = current.primaryHostname
        ? db.collection('tenantDomains').doc(current.primaryHostname as string)
        : null;
      const newDomain = db.collection('tenantDomains').doc(nextHostname);
      await db.runTransaction(async (transaction) => {
        const newDomainSnapshot = await transaction.get(newDomain);
        if (newDomainSnapshot.exists && newDomainSnapshot.data()?.tenantId !== tenantId) {
          throw new Error('Tenant hostname is already in use');
        }
        transaction.set(tenantRef, patch, { merge: true });
        if (oldDomain && current.primaryHostname !== nextHostname) {
          transaction.delete(oldDomain);
        }
        transaction.set(newDomain, {
          tenantId,
          hostname: nextHostname,
          type: 'CUSTOM',
          verified: false,
          primary: true,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      });
    } else {
      await tenantRef.set(patch, { merge: true });
    }

    const updated = await tenantRef.get();
    const data = updated.data() ?? {};
    return {
      id: updated.id,
      slug: data.slug as string,
      name: data.name as string,
      hostname: data.primaryHostname as string,
      status: (data.status as string) ?? 'ACTIVE',
      address: (data.address as string | null) ?? undefined,
      city: (data.city as string | null) ?? undefined,
      state: (data.state as string | null) ?? undefined,
      postalCode: (data.postalCode as string | null) ?? undefined,
    };
  }

  async listTenantAdmins(tenantId: string): Promise<FirestoreMembership[]> {
    const memberships = await this.listMemberships(tenantId);
    return memberships.filter((membership) => membership.roles.includes('TENANT_ADMIN'));
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
      if (!existing.roles.includes('TENANT_ADMIN')) {
        await this.updateMembershipRoles(
          userId,
          tenantId,
          [...existing.roles, 'TENANT_ADMIN'],
          'TENANT_ADMIN',
        );
      }
      return;
    }
    await this.createMembership({ userId, tenantId, role: 'TENANT_ADMIN', roles: ['TENANT_ADMIN'] });
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
      const existing = await membershipRef.get();
      const data = existing.data() ?? {};
      const existingRoles = Array.isArray(data.roles)
        ? (data.roles as unknown[]).filter((role): role is string => typeof role === 'string')
        : typeof data.role === 'string' ? [data.role as string] : [];
      const roles = [...new Set([...existingRoles, 'TENANT_ADMIN'])];
      batch.set(membershipRef, {
        userId,
        tenantId,
        role: 'TENANT_ADMIN',
        roles,
        createdAt: data.createdAt ?? Timestamp.now(),
        updatedAt: Timestamp.now(),
      }, { merge: true });
      batch.update(invite.ref, { status: 'CLAIMED', userId, claimedAt: Timestamp.now(), updatedAt: Timestamp.now() });
    }
    await batch.commit();
  }

  async createGivingCampaign(input: {
    tenantId: string;
    actorUserId: string;
    name: string;
    description?: string;
    targetAmountPaise?: number;
  }) {
    if (!Number.isSafeInteger(input.targetAmountPaise ?? 1) || (input.targetAmountPaise ?? 1) < 1) {
      throw new Error('Campaign target amount must be a positive safe integer in paise');
    }
    const id = randomUUID();
    const now = Timestamp.now();
    const campaign = {
      id,
      tenantId: input.tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      targetAmountPaise: input.targetAmountPaise ?? null,
      currency: 'INR',
      status: 'DRAFT',
      createdBy: input.actorUserId,
      createdAt: now,
      updatedAt: now,
    };
    await this.getDb().collection('givingCampaigns').doc(id).create(campaign);
    return { ...campaign, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async listGivingCampaigns(tenantId: string, includeInactive = false) {
    const snapshot = await this.getDb().collection('givingCampaigns')
      .where('tenantId', '==', tenantId).get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          tenantId: data.tenantId as string,
          name: data.name as string,
          description: (data.description as string | null) ?? undefined,
          targetAmountPaise: (data.targetAmountPaise as number | null) ?? undefined,
          currency: 'INR' as const,
          status: data.status as 'DRAFT' | 'ACTIVE' | 'CLOSED',
          createdBy: data.createdBy as string,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      })
      .filter((campaign) => includeInactive || campaign.status === 'ACTIVE')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateGivingCampaignStatus(
    tenantId: string,
    campaignId: string,
    status: 'DRAFT' | 'ACTIVE' | 'CLOSED',
  ) {
    const ref = this.getDb().collection('givingCampaigns').doc(campaignId);
    const updated = await this.getDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.tenantId !== tenantId) return false;
      transaction.update(ref, { status, updatedAt: Timestamp.now() });
      return true;
    });
    if (!updated) return null;
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.tenantId !== tenantId) return null;
    const data = snapshot.data() ?? {};
    return {
      id: snapshot.id,
      tenantId: data.tenantId as string,
      name: data.name as string,
      description: (data.description as string | null) ?? undefined,
      targetAmountPaise: (data.targetAmountPaise as number | null) ?? undefined,
      currency: 'INR' as const,
      status: data.status as 'DRAFT' | 'ACTIVE' | 'CLOSED',
      createdBy: data.createdBy as string,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }


  async createDonationPledge(input: {
    tenantId: string;
    donorUserId: string;
    campaignId: string;
    pledgedAmountPaise: number;
    idempotencyKey: string;
  }) {
    if (!Number.isSafeInteger(input.pledgedAmountPaise) || input.pledgedAmountPaise < 1) {
      throw new Error('Pledge amount must be a positive safe integer in paise');
    }
    const user = await this.getUser(input.donorUserId);
    if (!user) throw new Error('Donor user not found');
    const id = createHash('sha256')
      .update('pledge:' + input.tenantId + ':' + input.donorUserId + ':' + input.idempotencyKey.trim())
      .digest('hex');
    const db = this.getDb();
    const campaignRef = db.collection('givingCampaigns').doc(input.campaignId);
    const pledgeRef = db.collection('donationPledges').doc(id);
    const donorId = createHash('sha256')
      .update('tenant-donor:' + input.tenantId + ':' + input.donorUserId)
      .digest('hex');
    const donorRef = db.collection('tenantDonors').doc(donorId);
    const notificationId = randomUUID();
    const notificationRef = db.collection('notifications').doc(notificationId);
    return db.runTransaction(async (transaction) => {
      const [campaignSnapshot, pledgeSnapshot, donorSnapshot] = await Promise.all([
        transaction.get(campaignRef),
        transaction.get(pledgeRef),
        transaction.get(donorRef),
      ]);
      if (pledgeSnapshot.exists) {
        const existing = pledgeSnapshot.data() ?? {};
        if (
          existing.tenantId !== input.tenantId ||
          existing.donorUserId !== input.donorUserId ||
          existing.campaignId !== input.campaignId ||
          existing.pledgedAmountPaise !== input.pledgedAmountPaise
        ) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        return this.toDonationPledge(pledgeSnapshot.id, existing);
      }
      if (donorSnapshot.exists && donorSnapshot.data()?.status === 'INACTIVE') {
        throw new Error('DONOR_INACTIVE');
      }
      if (
        !campaignSnapshot.exists ||
        campaignSnapshot.data()?.tenantId !== input.tenantId ||
        campaignSnapshot.data()?.status !== 'ACTIVE'
      ) {
        throw new Error('CAMPAIGN_NOT_FOUND');
      }
      const now = Timestamp.now();
      if (!donorSnapshot.exists) {
        transaction.create(donorRef, {
          tenantId: input.tenantId,
          userId: input.donorUserId,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        });
      }
      const data = {
        tenantId: input.tenantId,
        campaignId: input.campaignId,
        donorId,
        donorUserId: input.donorUserId,
        pledgedAmountPaise: input.pledgedAmountPaise,
        paidAmountPaise: 0,
        currency: 'INR',
        status: 'PLEDGED',
        createdAt: now,
        updatedAt: now,
      };
      transaction.create(pledgeRef, data);
      transaction.create(notificationRef, {
        id: notificationId,
        tenantId: input.tenantId,
        userId: input.donorUserId,
        type: 'PLEDGE_CREATED',
        title: 'Pledge recorded',
        body: 'Your pledge for ' + String(campaignSnapshot.data()?.name ?? 'this campaign') + ' has been recorded.',
        entityType: 'DonationPledge',
        entityId: id,
        metadata: { campaignId: input.campaignId, pledgedAmountPaise: input.pledgedAmountPaise },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return this.toDonationPledge(id, data);
    });
  }

  async listDonationPledgesForTenant(tenantId: string) {
    const snapshot = await this.getDb().collection('donationPledges')
      .where('tenantId', '==', tenantId).get();
    return snapshot.docs
      .map((doc) => this.toDonationPledge(doc.id, doc.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listDonationPledgesForDonor(tenantId: string, donorUserId: string) {
    const pledges = await this.listDonationPledgesForTenant(tenantId);
    return pledges.filter((pledge) => pledge.donorUserId === donorUserId);
  }

  async recordDonationPayment(input: {
    tenantId: string;
    pledgeId: string;
    actorUserId: string;
    amountPaise: number;
    method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
    reference?: string;
    note?: string;
    idempotencyKey: string;
  }) {
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1) {
      throw new Error('PAYMENT_AMOUNT_INVALID');
    }
    const id = createHash('sha256')
      .update('payment:' + input.tenantId + ':' + input.pledgeId + ':' + input.actorUserId + ':' + input.idempotencyKey.trim())
      .digest('hex');
    const db = this.getDb();
    const paymentRef = db.collection('donationPayments').doc(id);
    const pledgeRef = db.collection('donationPledges').doc(input.pledgeId);
    return db.runTransaction(async (transaction) => {
      const [paymentSnapshot, pledgeSnapshot] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(pledgeRef),
      ]);
      if (paymentSnapshot.exists) {
        const existing = paymentSnapshot.data() ?? {};
        if (
          existing.tenantId !== input.tenantId ||
          existing.pledgeId !== input.pledgeId ||
          existing.recordedBy !== input.actorUserId ||
          existing.amountPaise !== input.amountPaise ||
          existing.method !== input.method ||
          (existing.reference ?? undefined) !== (input.reference?.trim() || undefined)
        ) {
          throw new Error('PAYMENT_IDEMPOTENCY_CONFLICT');
        }
        return this.toDonationPayment(paymentSnapshot.id, existing);
      }
      if (!pledgeSnapshot.exists || pledgeSnapshot.data()?.tenantId !== input.tenantId) {
        throw new Error('PLEDGE_NOT_FOUND');
      }
      const pledge = pledgeSnapshot.data() ?? {};
      if (pledge.status === 'CANCELLED') throw new Error('PLEDGE_CANCELLED');
      const paid = Number(pledge.paidAmountPaise ?? 0);
      const pledged = Number(pledge.pledgedAmountPaise ?? 0);
      if (input.amountPaise > pledged - paid) throw new Error('PAYMENT_EXCEEDS_BALANCE');
      const now = Timestamp.now();
      const payment = {
        tenantId: input.tenantId,
        pledgeId: input.pledgeId,
        donorUserId: pledge.donorUserId as string,
        amountPaise: input.amountPaise,
        currency: 'INR',
        method: input.method,
        reference: input.reference?.trim() || null,
        note: input.note?.trim() || null,
        status: 'PENDING_APPROVAL',
        adjustedAmountPaise: 0,
        pendingAdjustmentAmountPaise: 0,
        recordedBy: input.actorUserId,
        approvedBy: null,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      };
      transaction.create(paymentRef, payment);
      return this.toDonationPayment(id, payment);
    });
  }

  async approveDonationPayment(tenantId: string, paymentId: string, approverUserId: string) {
    const db = this.getDb();
    const paymentRef = db.collection('donationPayments').doc(paymentId);
    const receiptRef = db.collection('donationReceipts').doc(paymentId);
    const notificationId = randomUUID();
    const notificationRef = db.collection('notifications').doc(notificationId);
    const updated = await db.runTransaction(async (transaction) => {
      const paymentSnapshot = await transaction.get(paymentRef);
      if (!paymentSnapshot.exists || paymentSnapshot.data()?.tenantId !== tenantId) return { error: 'PAYMENT_NOT_FOUND' as const };
      const payment = paymentSnapshot.data() ?? {};
      if (payment.status !== 'PENDING_APPROVAL') return { error: 'PAYMENT_NOT_PENDING' as const };
      if (payment.recordedBy === approverUserId) return { error: 'PAYMENT_SELF_APPROVAL' as const };
      const pledgeRef = db.collection('donationPledges').doc(payment.pledgeId as string);
      const pledgeSnapshot = await transaction.get(pledgeRef);
      if (!pledgeSnapshot.exists || pledgeSnapshot.data()?.tenantId !== tenantId) return { error: 'PLEDGE_NOT_FOUND' as const };
      const pledge = pledgeSnapshot.data() ?? {};
      if (pledge.status === 'CANCELLED') return { error: 'PLEDGE_CANCELLED' as const };
      const amount = Number(payment.amountPaise);
      const paid = Number(pledge.paidAmountPaise ?? 0);
      const pledged = Number(pledge.pledgedAmountPaise ?? 0);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > pledged - paid) return { error: 'PAYMENT_EXCEEDS_BALANCE' as const };

      const now = Timestamp.now();
      const year = now.toDate().getUTCFullYear();
      const sequenceId = createHash('sha256').update('receipt-sequence:' + tenantId + ':' + year).digest('hex');
      const sequenceRef = db.collection('donationReceiptSequences').doc(sequenceId);
      const sequenceSnapshot = await transaction.get(sequenceRef);
      const sequenceData = sequenceSnapshot.data() ?? {};
      const sequence = Number(sequenceData.nextSequence ?? 1);
      const tenantCode = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'TENANT';
      const receiptNumber = 'JCP-' + tenantCode + '-' + year + '-' + String(sequence).padStart(6, '0');
      const receipt = {
        tenantId,
        paymentId,
        pledgeId: payment.pledgeId,
        donorUserId: payment.donorUserId,
        campaignId: pledge.campaignId,
        amountPaise: amount,
        currency: 'INR',
        method: payment.method,
        receiptNumber,
        issuedAt: now,
        issuedBy: approverUserId,
      };
      const nextPaid = paid + amount;
      const nextPledgeStatus = nextPaid >= pledged ? 'PAID' : 'PARTIALLY_PAID';
      transaction.update(paymentRef, { status: 'VERIFIED', approvedBy: approverUserId, receiptNumber, updatedAt: now });
      transaction.update(pledgeRef, { paidAmountPaise: nextPaid, status: nextPledgeStatus, updatedAt: now });
      transaction.set(sequenceRef, { tenantId, year, nextSequence: sequence + 1, updatedAt: now }, { merge: true });
      transaction.create(receiptRef, receipt);
      transaction.create(notificationRef, {
        id: notificationId,
        tenantId,
        userId: payment.donorUserId as string,
        type: 'PAYMENT_VERIFIED',
        title: 'Donation payment verified',
        body: 'Your payment of ₹' + (amount / 100).toFixed(2) + ' has been verified. Receipt ' + receiptNumber + ' is ready.',
        entityType: 'DonationReceipt',
        entityId: paymentId,
        metadata: { paymentId, pledgeId: payment.pledgeId, receiptNumber, amountPaise: amount },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return {
        payment: { ...payment, id: paymentSnapshot.id, status: 'VERIFIED', approvedBy: approverUserId, receiptNumber, updatedAt: now, createdAt: payment.createdAt },
        error: null,
      };
    });
    if (updated.error) throw new Error(updated.error);
    return this.toDonationPayment(updated.payment.id as string, updated.payment);
  }

  async rejectDonationPayment(
    tenantId: string,
    paymentId: string,
    approverUserId: string,
    reason: string,
  ) {
    const db = this.getDb();
    const paymentRef = db.collection('donationPayments').doc(paymentId);
    const notificationId = randomUUID();
    const notificationRef = db.collection('notifications').doc(notificationId);
    const updated = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(paymentRef);
      if (!snapshot.exists || snapshot.data()?.tenantId !== tenantId) return { error: 'PAYMENT_NOT_FOUND' as const };
      const payment = snapshot.data() ?? {};
      if (payment.status !== 'PENDING_APPROVAL') return { error: 'PAYMENT_NOT_PENDING' as const };
      if (payment.recordedBy === approverUserId) return { error: 'PAYMENT_SELF_APPROVAL' as const };
      const now = Timestamp.now();
      transaction.update(paymentRef, {
        status: 'REJECTED',
        approvedBy: approverUserId,
        rejectionReason: reason.trim(),
        updatedAt: now,
      });
      transaction.create(notificationRef, {
        id: notificationId,
        tenantId,
        userId: payment.donorUserId as string,
        type: 'PAYMENT_REJECTED',
        title: 'Donation payment needs attention',
        body: 'Your payment of ₹' + (Number(payment.amountPaise) / 100).toFixed(2) + ' was not verified. Reason: ' + reason.trim(),
        entityType: 'DonationPayment',
        entityId: paymentId,
        metadata: { paymentId, pledgeId: payment.pledgeId, reason: reason.trim(), amountPaise: payment.amountPaise },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { payment: { ...payment, id: snapshot.id, status: 'REJECTED', approvedBy: approverUserId, rejectionReason: reason.trim(), updatedAt: now }, error: null };
    });
    if (updated.error) throw new Error(updated.error);
    return this.toDonationPayment(updated.payment.id as string, updated.payment);
  }

  async listDonationPaymentsForTenant(tenantId: string) {
    const snapshot = await this.getDb().collection('donationPayments')
      .where('tenantId', '==', tenantId).get();
    return snapshot.docs
      .map((doc) => this.toDonationPayment(doc.id, doc.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDonationExpense(input: {
    tenantId: string; actorUserId: string; category: string; description: string;
    amountPaise: number; incurredAt?: string; reference?: string; evidenceReferences?: string[]; idempotencyKey: string;
  }) {
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1) throw new Error('EXPENSE_AMOUNT_INVALID');
    const id = createHash('sha256').update('expense:' + input.tenantId + ':' + input.actorUserId + ':' + input.idempotencyKey.trim()).digest('hex');
    const db = this.getDb(); const ref = db.collection('donationExpenses').doc(id);
    return db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.exists) {
        const old = snap.data() ?? {};
        if (old.tenantId !== input.tenantId || old.createdBy !== input.actorUserId || old.category !== input.category.trim() ||
          old.description !== input.description.trim() || old.amountPaise !== input.amountPaise ||
          old.reference !== (input.reference?.trim() || null) ||
          JSON.stringify(old.evidenceReferences ?? []) !== JSON.stringify(input.evidenceReferences ?? [])) throw new Error('EXPENSE_IDEMPOTENCY_CONFLICT');
        return this.toDonationExpense(snap.id, old);
      }
      const now = Timestamp.now(); const incurredAt = input.incurredAt ? new Date(input.incurredAt) : now.toDate();
      if (Number.isNaN(incurredAt.getTime())) throw new Error('EXPENSE_DATE_INVALID');
      const expense = { tenantId: input.tenantId, category: input.category.trim(), description: input.description.trim(),
        amountPaise: input.amountPaise, currency: 'INR', incurredAt: Timestamp.fromDate(incurredAt),
        reference: input.reference?.trim() || null, evidenceReferences: input.evidenceReferences ?? [],
        status: 'PENDING_APPROVAL', createdBy: input.actorUserId, approvedBy: null, rejectionReason: null, createdAt: now, updatedAt: now };
      transaction.create(ref, expense);
      return this.toDonationExpense(id, expense);
    });
  }

  async approveDonationExpense(tenantId: string, expenseId: string, approverUserId: string) {
    const ref = this.getDb().collection('donationExpenses').doc(expenseId);
    const result = await this.getDb().runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.tenantId !== tenantId) return { error: 'EXPENSE_NOT_FOUND' as const };
      const expense = snap.data() ?? {};
      if (expense.status !== 'PENDING_APPROVAL') return { error: 'EXPENSE_NOT_PENDING' as const };
      if (expense.createdBy === approverUserId) return { error: 'EXPENSE_SELF_APPROVAL' as const };
      const now = Timestamp.now();
      transaction.update(ref, { status: 'APPROVED', approvedBy: approverUserId, updatedAt: now });
      return { expense: { ...expense, id: snap.id, status: 'APPROVED', approvedBy: approverUserId, updatedAt: now }, error: null };
    });
    if (result.error) throw new Error(result.error);
    return this.toDonationExpense(result.expense.id as string, result.expense);
  }

  async rejectDonationExpense(tenantId: string, expenseId: string, approverUserId: string, reason: string) {
    if (!reason.trim()) throw new Error('EXPENSE_REJECTION_REASON_REQUIRED');
    const ref = this.getDb().collection('donationExpenses').doc(expenseId);
    const result = await this.getDb().runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.tenantId !== tenantId) return { error: 'EXPENSE_NOT_FOUND' as const };
      const expense = snap.data() ?? {};
      if (expense.status !== 'PENDING_APPROVAL') return { error: 'EXPENSE_NOT_PENDING' as const };
      if (expense.createdBy === approverUserId) return { error: 'EXPENSE_SELF_APPROVAL' as const };
      const now = Timestamp.now();
      transaction.update(ref, { status: 'REJECTED', approvedBy: approverUserId, rejectionReason: reason.trim(), updatedAt: now });
      return { expense: { ...expense, id: snap.id, status: 'REJECTED', approvedBy: approverUserId, rejectionReason: reason.trim(), updatedAt: now }, error: null };
    });
    if (result.error) throw new Error(result.error);
    return this.toDonationExpense(result.expense.id as string, result.expense);
  }

  async listDonationExpensesForTenant(tenantId: string) {
    const snapshot = await this.getDb().collection('donationExpenses').where('tenantId', '==', tenantId).get();
    return snapshot.docs.map((doc) => this.toDonationExpense(doc.id, doc.data())).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDonationAdjustment(input: {
    tenantId: string;
    paymentId: string;
    actorUserId: string;
    amountPaise: number;
    kind: 'REFUND' | 'REVERSAL';
    reason: string;
    reference?: string;
    evidenceReferences?: string[];
    idempotencyKey: string;
  }) {
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1) throw new Error('ADJUSTMENT_AMOUNT_INVALID');
    if (!input.reason.trim()) throw new Error('ADJUSTMENT_REASON_REQUIRED');
    const id = createHash('sha256')
      .update('adjustment:' + input.tenantId + ':' + input.paymentId + ':' + input.actorUserId + ':' + input.idempotencyKey.trim())
      .digest('hex');
    const db = this.getDb();
    const ref = db.collection('donationAdjustments').doc(id);
    const paymentRef = db.collection('donationPayments').doc(input.paymentId);
    return db.runTransaction(async (transaction) => {
      const [existingSnapshot, paymentSnapshot] = await Promise.all([
        transaction.get(ref),
        transaction.get(paymentRef),
      ]);
      const evidenceReferences = (input.evidenceReferences ?? []).map((item) => item.trim()).filter(Boolean);
      if (existingSnapshot.exists) {
        const existing = existingSnapshot.data() ?? {};
        if (
          existing.tenantId !== input.tenantId ||
          existing.paymentId !== input.paymentId ||
          existing.createdBy !== input.actorUserId ||
          existing.amountPaise !== input.amountPaise ||
          existing.kind !== input.kind ||
          existing.reason !== input.reason.trim() ||
          (existing.reference ?? undefined) !== (input.reference?.trim() || undefined) ||
          JSON.stringify(existing.evidenceReferences ?? []) !== JSON.stringify(evidenceReferences)
        ) throw new Error('ADJUSTMENT_IDEMPOTENCY_CONFLICT');
        return this.toDonationAdjustment(existingSnapshot.id, existing);
      }
      if (!paymentSnapshot.exists || paymentSnapshot.data()?.tenantId !== input.tenantId) {
        throw new Error('PAYMENT_NOT_FOUND');
      }
      const payment = paymentSnapshot.data() ?? {};
      if (payment.status !== 'VERIFIED') throw new Error('PAYMENT_NOT_VERIFIED');
      const amount = Number(payment.amountPaise);
      const adjusted = Number(payment.adjustedAmountPaise ?? 0);
      const pending = Number(payment.pendingAdjustmentAmountPaise ?? 0);
      if (input.amountPaise > amount - adjusted - pending) throw new Error('ADJUSTMENT_EXCEEDS_PAYMENT');
      const now = Timestamp.now();
      const data = {
        tenantId: input.tenantId,
        paymentId: input.paymentId,
        pledgeId: payment.pledgeId as string,
        donorUserId: payment.donorUserId as string,
        amountPaise: input.amountPaise,
        currency: 'INR',
        kind: input.kind,
        reason: input.reason.trim(),
        reference: input.reference?.trim() || null,
        evidenceReferences,
        status: 'PENDING_APPROVAL',
        createdBy: input.actorUserId,
        approvedBy: null,
        rejectionReason: null,
        adjustmentNumber: null,
        createdAt: now,
        updatedAt: now,
      };
      transaction.update(paymentRef, { pendingAdjustmentAmountPaise: pending + input.amountPaise, updatedAt: now });
      transaction.create(ref, data);
      return this.toDonationAdjustment(id, data);
    });
  }

  async approveDonationAdjustment(tenantId: string, adjustmentId: string, approverUserId: string) {
    const db = this.getDb();
    const adjustmentRef = db.collection('donationAdjustments').doc(adjustmentId);
    const notificationId = randomUUID();
    const notificationRef = db.collection('notifications').doc(notificationId);
    const result = await db.runTransaction(async (transaction) => {
      const adjustmentSnapshot = await transaction.get(adjustmentRef);
      if (!adjustmentSnapshot.exists || adjustmentSnapshot.data()?.tenantId !== tenantId) return { error: 'ADJUSTMENT_NOT_FOUND' as const };
      const adjustment = adjustmentSnapshot.data() ?? {};
      if (adjustment.status !== 'PENDING_APPROVAL') return { error: 'ADJUSTMENT_NOT_PENDING' as const };
      if (adjustment.createdBy === approverUserId) return { error: 'ADJUSTMENT_SELF_APPROVAL' as const };
      const paymentRef = db.collection('donationPayments').doc(adjustment.paymentId as string);
      const pledgeRef = db.collection('donationPledges').doc(adjustment.pledgeId as string);
      const [paymentSnapshot, pledgeSnapshot] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(pledgeRef),
      ]);
      if (!paymentSnapshot.exists || paymentSnapshot.data()?.tenantId !== tenantId) return { error: 'PAYMENT_NOT_FOUND' as const };
      if (!pledgeSnapshot.exists || pledgeSnapshot.data()?.tenantId !== tenantId) return { error: 'ADJUSTMENT_PLEDGE_NOT_FOUND' as const };
      const payment = paymentSnapshot.data() ?? {};
      const pledge = pledgeSnapshot.data() ?? {};
      if (payment.status !== 'VERIFIED') return { error: 'PAYMENT_NOT_VERIFIED' as const };
      const amount = Number(adjustment.amountPaise);
      const pending = Number(payment.pendingAdjustmentAmountPaise ?? 0);
      const adjusted = Number(payment.adjustedAmountPaise ?? 0);
      if (pending < amount || adjusted + amount > Number(payment.amountPaise)) return { error: 'ADJUSTMENT_BALANCE_INVALID' as const };
      const paid = Number(pledge.paidAmountPaise ?? 0);
      if (paid < amount) return { error: 'ADJUSTMENT_PLEDGE_BALANCE_INVALID' as const };
      const now = Timestamp.now();
      const year = now.toDate().getUTCFullYear();
      const tenantCode = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'TENANT';
      const adjustmentNumber = 'JCP-ADJ-' + tenantCode + '-' + year + '-' + adjustmentSnapshot.id.slice(0, 12).toUpperCase();
      const nextPaid = paid - amount;
      const nextPledgeStatus = pledge.status === 'CANCELLED'
        ? 'CANCELLED'
        : nextPaid === 0
          ? 'PLEDGED'
          : nextPaid >= Number(pledge.pledgedAmountPaise ?? 0)
            ? 'PAID'
            : 'PARTIALLY_PAID';
      transaction.update(paymentRef, {
        pendingAdjustmentAmountPaise: pending - amount,
        adjustedAmountPaise: adjusted + amount,
        updatedAt: now,
      });
      transaction.update(pledgeRef, { paidAmountPaise: nextPaid, status: nextPledgeStatus, updatedAt: now });
      transaction.update(adjustmentRef, {
        status: 'APPROVED',
        approvedBy: approverUserId,
        approvedAt: now,
        adjustmentNumber,
        updatedAt: now,
      });
      const kind = adjustment.kind as 'REFUND' | 'REVERSAL';
      transaction.create(notificationRef, {
        id: notificationId,
        tenantId,
        userId: adjustment.donorUserId as string,
        type: kind + '_APPROVED',
        title: kind === 'REFUND' ? 'Donation refund approved' : 'Donation reversal approved',
        body: 'An adjustment of ₹' + (amount / 100).toFixed(2) + ' has been approved. Reference ' + adjustmentNumber + '.',
        entityType: 'DonationAdjustment',
        entityId: adjustmentSnapshot.id,
        metadata: { paymentId: adjustment.paymentId, kind, amountPaise: amount, adjustmentNumber },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return {
        adjustment: {
          ...adjustment,
          id: adjustmentSnapshot.id,
          status: 'APPROVED',
          approvedBy: approverUserId,
          approvedAt: now,
          adjustmentNumber,
          updatedAt: now,
        },
        error: null,
      };
    });
    if (result.error) throw new Error(result.error);
    return this.toDonationAdjustment(result.adjustment.id as string, result.adjustment);
  }

  async rejectDonationAdjustment(tenantId: string, adjustmentId: string, approverUserId: string, reason: string) {
    if (!reason.trim()) throw new Error('ADJUSTMENT_REJECTION_REASON_REQUIRED');
    const db = this.getDb();
    const adjustmentRef = db.collection('donationAdjustments').doc(adjustmentId);
    const notificationId = randomUUID();
    const notificationRef = db.collection('notifications').doc(notificationId);
    const result = await db.runTransaction(async (transaction) => {
      const adjustmentSnapshot = await transaction.get(adjustmentRef);
      if (!adjustmentSnapshot.exists || adjustmentSnapshot.data()?.tenantId !== tenantId) return { error: 'ADJUSTMENT_NOT_FOUND' as const };
      const adjustment = adjustmentSnapshot.data() ?? {};
      if (adjustment.status !== 'PENDING_APPROVAL') return { error: 'ADJUSTMENT_NOT_PENDING' as const };
      if (adjustment.createdBy === approverUserId) return { error: 'ADJUSTMENT_SELF_APPROVAL' as const };
      const paymentRef = db.collection('donationPayments').doc(adjustment.paymentId as string);
      const paymentSnapshot = await transaction.get(paymentRef);
      if (!paymentSnapshot.exists || paymentSnapshot.data()?.tenantId !== tenantId) return { error: 'PAYMENT_NOT_FOUND' as const };
      const payment = paymentSnapshot.data() ?? {};
      const amount = Number(adjustment.amountPaise);
      const pending = Number(payment.pendingAdjustmentAmountPaise ?? 0);
      if (pending < amount) return { error: 'ADJUSTMENT_BALANCE_INVALID' as const };
      const now = Timestamp.now();
      const rejectionReason = reason.trim();
      transaction.update(paymentRef, {
        pendingAdjustmentAmountPaise: pending - amount,
        adjustedAmountPaise: Number(payment.adjustedAmountPaise ?? 0),
        updatedAt: now,
      });
      transaction.update(adjustmentRef, {
        status: 'REJECTED',
        approvedBy: approverUserId,
        rejectionReason,
        updatedAt: now,
      });
      const kind = adjustment.kind as 'REFUND' | 'REVERSAL';
      transaction.create(notificationRef, {
        id: notificationId,
        tenantId,
        userId: adjustment.donorUserId as string,
        type: kind + '_REJECTED',
        title: kind === 'REFUND' ? 'Donation refund not approved' : 'Donation reversal not approved',
        body: 'Your requested adjustment of ₹' + (amount / 100).toFixed(2) + ' was not approved. Reason: ' + rejectionReason,
        entityType: 'DonationAdjustment',
        entityId: adjustmentSnapshot.id,
        metadata: { paymentId: adjustment.paymentId, kind, amountPaise: amount, reason: rejectionReason },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return {
        adjustment: { ...adjustment, id: adjustmentSnapshot.id, status: 'REJECTED', approvedBy: approverUserId, rejectionReason, updatedAt: now },
        error: null,
      };
    });
    if (result.error) throw new Error(result.error);
    return this.toDonationAdjustment(result.adjustment.id as string, result.adjustment);
  }

  async listDonationAdjustmentsForTenant(tenantId: string) {
    const snapshot = await this.getDb().collection('donationAdjustments').where('tenantId', '==', tenantId).get();
    return snapshot.docs
      .map((doc) => this.toDonationAdjustment(doc.id, doc.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private toDonationAdjustment(id: string, data: Record<string, unknown>) {
    return {
      id,
      tenantId: data.tenantId as string,
      paymentId: data.paymentId as string,
      pledgeId: data.pledgeId as string,
      donorUserId: data.donorUserId as string,
      amountPaise: data.amountPaise as number,
      currency: 'INR' as const,
      kind: data.kind as 'REFUND' | 'REVERSAL',
      reason: data.reason as string,
      reference: (data.reference as string | null) ?? undefined,
      evidenceReferences: (data.evidenceReferences as string[] | undefined) ?? [],
      status: data.status as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
      createdBy: data.createdBy as string,
      approvedBy: (data.approvedBy as string | null) ?? undefined,
      rejectionReason: (data.rejectionReason as string | null) ?? undefined,
      adjustmentNumber: (data.adjustmentNumber as string | null) ?? undefined,
      approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  async getDonationReconciliationReport(tenantId: string) {
    const [payments, receipts, expenses, adjustments] = await Promise.all([
      this.listDonationPaymentsForTenant(tenantId), this.listDonationReceiptsForTenant(tenantId),
      this.listDonationExpensesForTenant(tenantId), this.listDonationAdjustmentsForTenant(tenantId),
    ]);
    const verified = payments.filter((p) => p.status === 'VERIFIED');
    const approved = expenses.filter((e) => e.status === 'APPROVED');
    const pending = expenses.filter((e) => e.status === 'PENDING_APPROVAL');
    const rejected = expenses.filter((e) => e.status === 'REJECTED');
    const approvedAdjustments = adjustments.filter((a) => a.status === 'APPROVED');
    const pendingAdjustments = adjustments.filter((a) => a.status === 'PENDING_APPROVAL');
    const rejectedAdjustments = adjustments.filter((a) => a.status === 'REJECTED');
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const receiptByPayment = new Map(receipts.map((receipt) => [receipt.paymentId, receipt]));
    const verifiedById = new Map(verified.map((payment) => [payment.id, payment]));
    const missingReceiptPaymentIds = verified.filter((p) => !receiptByPayment.has(p.id)).map((p) => p.id);
    const orphanReceiptPaymentIds = receipts.filter((r) => !verifiedById.has(r.paymentId)).map((r) => r.paymentId);
    const amountMismatchPaymentIds = receipts.filter((r) => { const p = verifiedById.get(r.paymentId); return p !== undefined && p.amountPaise !== r.amountPaise; }).map((r) => r.paymentId);
    const verifiedAmountPaise = sum(verified.map((p) => p.amountPaise));
    const receiptAmountPaise = sum(receipts.map((r) => r.amountPaise));
    const approvedExpenseAmountPaise = sum(approved.map((e) => e.amountPaise));
    return {
      tenantId, currency: 'INR' as const, generatedAt: new Date(),
      donations: { verifiedAmountPaise, verifiedPaymentCount: verified.length },
      receipts: { issuedAmountPaise: receiptAmountPaise, issuedReceiptCount: receipts.length,
        amountDifferencePaise: verifiedAmountPaise - receiptAmountPaise, missingReceiptPaymentIds, orphanReceiptPaymentIds, amountMismatchPaymentIds,
        isBalanced: !missingReceiptPaymentIds.length && !orphanReceiptPaymentIds.length && !amountMismatchPaymentIds.length && verifiedAmountPaise === receiptAmountPaise },
      expenses: { approvedAmountPaise: approvedExpenseAmountPaise, approvedCount: approved.length,
        pendingAmountPaise: sum(pending.map((e) => e.amountPaise)), pendingCount: pending.length,
        rejectedAmountPaise: sum(rejected.map((e) => e.amountPaise)), rejectedCount: rejected.length },
      adjustments: {
        approvedAmountPaise: sum(approvedAdjustments.map((a) => a.amountPaise)), approvedCount: approvedAdjustments.length,
        pendingAmountPaise: sum(pendingAdjustments.map((a) => a.amountPaise)), pendingCount: pendingAdjustments.length,
        rejectedAmountPaise: sum(rejectedAdjustments.map((a) => a.amountPaise)), rejectedCount: rejectedAdjustments.length,
      },
      netAfterApprovedExpensesPaise: verifiedAmountPaise - approvedExpenseAmountPaise,
      netAfterApprovedExpensesAndAdjustmentsPaise: verifiedAmountPaise - approvedExpenseAmountPaise - sum(approvedAdjustments.map((a) => a.amountPaise)),
    };
  }

  private toDonationExpense(id: string, data: Record<string, unknown>) {
    return { id, tenantId: data.tenantId as string, category: data.category as string, description: data.description as string,
      amountPaise: data.amountPaise as number, currency: 'INR' as const, incurredAt: toDate(data.incurredAt),
      reference: (data.reference as string | null) ?? undefined, evidenceReferences: (data.evidenceReferences as string[] | null) ?? [],
      status: data.status as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED', createdBy: data.createdBy as string,
      approvedBy: (data.approvedBy as string | null) ?? undefined, rejectionReason: (data.rejectionReason as string | null) ?? undefined,
      createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
  }

  async listDonationReceiptsForTenant(tenantId: string) {
    const snapshot = await this.getDb().collection('donationReceipts')
      .where('tenantId', '==', tenantId).get();
    return snapshot.docs
      .map((doc) => this.toDonationReceipt(doc.id, doc.data()))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  async listDonationReceiptsForDonor(tenantId: string, donorUserId: string) {
    const snapshot = await this.getDb().collection('donationReceipts')
      .where('tenantId', '==', tenantId)
      .where('donorUserId', '==', donorUserId).get();
    return snapshot.docs
      .map((doc) => this.toDonationReceipt(doc.id, doc.data()))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  async getDonationFinanceReport(tenantId: string) {
    const [campaigns, pledges, payments, adjustments] = await Promise.all([
      this.listGivingCampaigns(tenantId, true),
      this.listDonationPledgesForTenant(tenantId),
      this.listDonationPaymentsForTenant(tenantId),
      this.listDonationAdjustmentsForTenant(tenantId),
    ]);
    const activePledges = pledges.filter((pledge) => pledge.status !== 'CANCELLED');
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const verifiedPayments = payments.filter((payment) => payment.status === 'VERIFIED');
    const pendingPayments = payments.filter((payment) => payment.status === 'PENDING_APPROVAL');
    const rejectedPayments = payments.filter((payment) => payment.status === 'REJECTED');
    const approvedAdjustments = adjustments.filter((adjustment) => adjustment.status === 'APPROVED');
    const pendingAdjustments = adjustments.filter((adjustment) => adjustment.status === 'PENDING_APPROVAL');
    const rejectedAdjustments = adjustments.filter((adjustment) => adjustment.status === 'REJECTED');
    const sumApprovedAdjustmentsPaise = sum(approvedAdjustments.map((adjustment) => adjustment.amountPaise));
    const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
    const byCampaign = campaigns.map((campaign) => {
      const campaignPledges = activePledges.filter((pledge) => pledge.campaignId === campaign.id);
      const campaignPayments = verifiedPayments.filter((payment) => campaignPledges.some((pledge) => pledge.id === payment.pledgeId));
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        pledgedAmountPaise: sum(campaignPledges.map((pledge) => pledge.pledgedAmountPaise)),
        receivedAmountPaise: sum(campaignPayments.map((payment) => payment.amountPaise)),
        outstandingAmountPaise: sum(campaignPledges.map((pledge) => Math.max(0, pledge.pledgedAmountPaise - pledge.paidAmountPaise))),
        currency: 'INR' as const,
      };
    });
    const byPaymentMethod = (['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as const).map((method) => ({
      method,
      verifiedAmountPaise: sum(verifiedPayments.filter((payment) => payment.method === method).map((payment) => payment.amountPaise)),
      verifiedCount: verifiedPayments.filter((payment) => payment.method === method).length,
    }));
    return {
      tenantId,
      currency: 'INR' as const,
      generatedAt: new Date(),
      totals: {
        pledgedAmountPaise: sum(activePledges.map((pledge) => pledge.pledgedAmountPaise)),
        receivedAmountPaise: sum(verifiedPayments.map((payment) => payment.amountPaise)),
        adjustedAmountPaise: sumApprovedAdjustmentsPaise,
        netReceivedAmountPaise: sum(verifiedPayments.map((payment) => payment.amountPaise)) - sumApprovedAdjustmentsPaise,
        pendingAdjustmentAmountPaise: sum(pendingAdjustments.map((adjustment) => adjustment.amountPaise)),
        rejectedAdjustmentAmountPaise: sum(rejectedAdjustments.map((adjustment) => adjustment.amountPaise)),
        outstandingAmountPaise: sum(activePledges.map((pledge) => Math.max(0, pledge.pledgedAmountPaise - pledge.paidAmountPaise))),
        pendingApprovalAmountPaise: sum(pendingPayments.map((payment) => payment.amountPaise)),
        rejectedAmountPaise: sum(rejectedPayments.map((payment) => payment.amountPaise)),
        pledgeCount: activePledges.length,
        cancelledPledgeCount: pledges.length - activePledges.length,
        verifiedPaymentCount: verifiedPayments.length,
        pendingPaymentCount: pendingPayments.length,
        rejectedPaymentCount: rejectedPayments.length,
      },
      byPaymentMethod,
      byCampaign: byCampaign.filter((campaign) => campaignById.has(campaign.campaignId)),
    };
  }

  private toDonationReceipt(id: string, data: Record<string, unknown>) {
    return {
      id,
      tenantId: data.tenantId as string,
      paymentId: data.paymentId as string,
      pledgeId: data.pledgeId as string,
      donorUserId: data.donorUserId as string,
      campaignId: data.campaignId as string,
      amountPaise: data.amountPaise as number,
      currency: 'INR' as const,
      method: data.method as 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE',
      receiptNumber: data.receiptNumber as string,
      issuedAt: toDate(data.issuedAt),
      issuedBy: data.issuedBy as string,
    };
  }

  private toDonationPayment(id: string, data: Record<string, unknown>) {
    return {
      id,
      tenantId: data.tenantId as string,
      pledgeId: data.pledgeId as string,
      donorUserId: data.donorUserId as string,
      amountPaise: data.amountPaise as number,
      currency: 'INR' as const,
      method: data.method as 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE',
      reference: (data.reference as string | null) ?? undefined,
      note: (data.note as string | null) ?? undefined,
      status: data.status as 'PENDING_APPROVAL' | 'VERIFIED' | 'REJECTED' | 'REVERSED' | 'REFUNDED',
      recordedBy: data.recordedBy as string,
      approvedBy: (data.approvedBy as string | null) ?? undefined,
      rejectionReason: (data.rejectionReason as string | null) ?? undefined,
      receiptNumber: (data.receiptNumber as string | null) ?? undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  private toDonationPledge(id: string, data: Record<string, unknown>) {
    return {
      id,
      tenantId: data.tenantId as string,
      campaignId: data.campaignId as string,
      donorId: data.donorId as string,
      donorUserId: data.donorUserId as string,
      pledgedAmountPaise: data.pledgedAmountPaise as number,
      paidAmountPaise: data.paidAmountPaise as number,
      currency: 'INR' as const,
      status: data.status as 'PLEDGED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED',
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  async recordNotificationDelivery(input: {
    id: string;
    tenantId: string;
    notificationId: string;
    userId: string;
    channel: 'EMAIL' | 'WHATSAPP' | 'PUSH';
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';
    providerMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
  }) {
    const ref = this.getDb().collection('notificationDeliveries').doc(input.id);
    return this.getDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const previous = snapshot.data() ?? {};
      const now = Timestamp.now();
      const isAttempt = input.status === 'SENT' || input.status === 'FAILED';
      const data = {
        ...input,
        attempts: Number(previous.attempts ?? 0) + (isAttempt ? 1 : 0),
        createdAt: previous.createdAt ?? now,
        updatedAt: now,
      };
      transaction.set(ref, data, { merge: true });
      return {
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    });
  }

  async listNotificationDeliveries(tenantId: string, notificationId: string) {
    const snapshot = await this.getDb().collection('notificationDeliveries')
      .where('tenantId', '==', tenantId)
      .where('notificationId', '==', notificationId)
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tenantId: data.tenantId as string,
        notificationId: data.notificationId as string,
        userId: data.userId as string,
        channel: data.channel as 'EMAIL' | 'WHATSAPP' | 'PUSH',
        status: data.status as 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED',
        attempts: Number(data.attempts ?? 0),
        providerMessageId: data.providerMessageId as string | undefined,
        errorCode: data.errorCode as string | undefined,
        errorMessage: data.errorMessage as string | undefined,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listNotificationsForUser(tenantId: string, userId: string, limit = 50) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const snapshot = await this.getDb().collection('notifications')
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data() ?? {};
        return {
          id: doc.id,
          tenantId: data.tenantId as string,
          userId: data.userId as string,
          type: data.type as string,
          title: data.title as string,
          body: data.body as string,
          entityType: data.entityType as string,
          entityId: data.entityId as string,
          metadata: (data.metadata as Record<string, unknown> | undefined) ?? {},
          readAt: data.readAt ? toDate(data.readAt) : null,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, safeLimit);
  }

  async markNotificationRead(tenantId: string, userId: string, notificationId: string) {
    const ref = this.getDb().collection('notifications').doc(notificationId);
    const updated = await this.getDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return false;
      const data = snapshot.data() ?? {};
      if (data.tenantId !== tenantId || data.userId !== userId) return false;
      const now = Timestamp.now();
      transaction.update(ref, { readAt: data.readAt ?? now, updatedAt: now });
      return true;
    });
    if (!updated) return null;
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    return {
      id: snapshot.id,
      tenantId: data.tenantId as string,
      userId: data.userId as string,
      type: data.type as string,
      title: data.title as string,
      body: data.body as string,
      entityType: data.entityType as string,
      entityId: data.entityId as string,
      metadata: (data.metadata as Record<string, unknown> | undefined) ?? {},
      readAt: toDate(data.readAt),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
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
