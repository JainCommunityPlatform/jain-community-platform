/* eslint-disable @typescript-eslint/no-explicit-any */
import { FirestoreService } from './firestore.service';

class Snapshot {
  constructor(private readonly value: any, readonly id = '') {}
  get exists() { return this.value !== undefined; }
  data() { return this.value; }
}

class Ref {
  constructor(private readonly db: FakeDb, readonly collectionName: string, readonly id: string) {}
  async get() { return new Snapshot(this.db.get(this.collectionName, this.id), this.id); }
  async create(value: any) { if (this.db.has(this.collectionName, this.id)) throw new Error('Already exists'); this.db.set(this.collectionName, this.id, value); }
  async set(value: any, options?: { merge?: boolean }) { this.db.set(this.collectionName, this.id, options?.merge ? { ...this.db.get(this.collectionName, this.id), ...value } : value); }
  async update(value: any) { return this.set(value, { merge: true }); }
  async delete() { this.db.delete(this.collectionName, this.id); }
}

class Query {
  constructor(private readonly db: FakeDb, private readonly collectionName: string, private readonly filters: Array<[string, string, any]> = []) {}
  where(field: string, op: string, value: any) { return new Query(this.db, this.collectionName, [...this.filters, [field, op, value]]); }
  orderBy() { return this; }
  async get() {
    const docs = this.db.entries(this.collectionName)
      .filter(([, value]) => this.filters.every(([field, op, expected]) => op === '==' && value?.[field] === expected))
      .map(([id, value]) => new Snapshot(value, id));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class FakeDb {
  private readonly data = new Map<string, any>();
  collection(name: string) {
    return {
      doc: (id: string) => new Ref(this, name, id),
      where: (field: string, op: string, value: any) => new Query(this, name).where(field, op, value),
      get: async () => {
        const docs = this.entries(name).map(([id, value]) => new Snapshot(value, id));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }
  get(collection: string, id: string) { return this.data.get(collection + '/' + id); }
  has(collection: string, id: string) { return this.data.has(collection + '/' + id); }
  set(collection: string, id: string, value: any) { this.data.set(collection + '/' + id, value); }
  delete(collection: string, id: string) { this.data.delete(collection + '/' + id); }
  entries(collection: string) { return [...this.data.entries()].filter(([key]) => key.startsWith(collection + '/')).map(([key, value]) => [key.slice(collection.length + 1), value] as const); }
  async runTransaction(callback: any) {
    const tx = { get: async (ref: Ref) => ref.get(), create: (ref: Ref, value: any) => ref.create(value), set: (ref: Ref, value: any, options?: any) => ref.set(value, options), update: (ref: Ref, value: any) => ref.update(value), delete: (ref: Ref) => ref.delete() };
    return callback(tx);
  }
  async getAll(...refs: Ref[]) { return Promise.all(refs.map(ref => ref.get())); }
  batch() {
    const db = this;
    return {
      create: (ref: Ref, value: any) => db.set(ref.collectionName, ref.id, value),
      update: (ref: Ref, value: any) => db.set(ref.collectionName, ref.id, { ...db.get(ref.collectionName, ref.id), ...value }),
      set: (ref: Ref, value: any, options?: any) => db.set(ref.collectionName, ref.id, options?.merge ? { ...db.get(ref.collectionName, ref.id), ...value } : value),
      delete: (ref: Ref) => db.delete(ref.collectionName, ref.id),
      commit: async () => {},
    };
  }
}

function service(db = new FakeDb()) {
  const instance = new FirestoreService({ get: jest.fn() } as never);
  (instance as any).firestore = db;
  (instance as any).app = {};
  return { instance, db };
}

describe('FirestoreService identity/profile persistence', () => {
  it('creates and reuses a stable auth identity', async () => {
    const { instance } = service();
    const first = await instance.upsertUser({ subject: 'google:a', email: 'a@test', displayName: 'A' });
    const second = await instance.upsertUser({ subject: 'google:a', email: 'new@test', displayName: 'New' });
    expect(second.id).toBe(first.id);
    expect((await instance.getUser(first.id))?.email).toBe('new@test');
  });

  it('supports multiple phones and links another Google identity to the same profile', async () => {
    const { instance } = service();
    const first = await instance.upsertUser({ subject: 'google:a' });
    await instance.linkPhoneToUser(first.id, '9876543210');
    await instance.linkPhoneToUser(first.id, '9123456789');
    const second = await instance.upsertUser({ subject: 'google:b' });
    const merged = await instance.linkPhoneToUser(second.id, '9876543210');
    expect(merged.id).toBe(first.id);
    expect((await instance.getUser(second.id))?.mergedInto).toBe(first.id);
    expect((await instance.findUserByPhone('9876543210'))?.id).toBe(first.id);
  });

  it('provisions phone-first profiles idempotently', async () => {
    const { instance } = service();
    const first = await instance.provisionUserByPhone({ phone: '9876543210', displayName: 'Member', address: 'Pune' });
    const second = await instance.provisionUserByPhone({ phone: '9876543210', displayName: 'Changed' });
    expect(second.id).toBe(first.id);
    expect(second.primaryPhone).toBe('9876543210');
  });

  it('changes primary phone and prevents collisions', async () => {
    const { instance } = service();
    const a = await instance.provisionUserByPhone({ phone: '9876543210' });
    const b = await instance.provisionUserByPhone({ phone: '9123456789' });
    await instance.setPrimaryPhone(a.id, '9000000000');
    expect((await instance.getUser(a.id))?.primaryPhone).toBe('9000000000');
    await expect(instance.setPrimaryPhone(b.id, '9000000000')).rejects.toThrow('already linked');
  });

  it('lists JCP activities and BadeBaba participation', async () => {
    const { instance, db } = service();
    db.set('userActivities', 'a1', { userId:'u1', eventType:'OTHER', eventId:'e1', title:'Other', participatedAt:new Date('2026-10-01') });
    db.set('registrations', 'KW26-1', { userId:'u1', eventId:'k1', createdAt:new Date('2026-10-02') });
    db.set('pratibhaSammanApplications', 'PS26-1', { userId:'u1', applicationId:'p1', createdAt:new Date('2026-10-03') });
    const result = await instance.listUserActivities('u1');
    expect(result.map(item => item.eventType)).toEqual(['PRATIBHA_SAMMAN', 'KSHAMAWANI', 'OTHER']);
  });

  it('writes idempotent activities, tenants, memberships and audit records', async () => {
    const { instance, db } = service();
    await instance.recordUserActivity({ userId:'u1', tenantId:'t1', eventType:'K', eventId:'e1', title:'K', participatedAt:new Date('2026-10-01') });
    await instance.recordUserActivity({ userId:'u1', tenantId:'t1', eventType:'K', eventId:'e1', title:'Updated', participatedAt:new Date('2026-10-01') });
    await instance.ensureTenant({ id:'t1', slug:'one', name:'One', hostname:'one.test' });
    await instance.createMembership({ userId:'u1', tenantId:'t1', role:'TENANT_ADMIN' });
    db.set('users','u1',{authSubject:'a1',email:'a@test',displayName:'A',phoneNumbers:[],primaryPhone:null});
    expect((await instance.listMemberships('t1'))[0].role).toBe('TENANT_ADMIN');
    await instance.recordAudit({ tenantId:'t1', action:'TEST', entity:'Profile', entityId:'u1' });
    expect(db.entries('auditLogs')).toHaveLength(1);
    expect((await instance.listUserActivities('u1')).length).toBe(1);
  });

  it('resolves tenants and membership lifecycle', async () => {
    const { instance, db } = service();
    expect(await instance.getTenantByHostname('missing.test')).toBeNull();
    db.set('tenantDomains','one.test',{tenantId:'t1',verified:true});
    db.set('tenants','t1',{name:'One',status:'ACTIVE'});
    expect(await instance.getTenantByHostname('one.test')).toEqual({id:'t1',name:'One',hostname:'one.test',status:'ACTIVE',verified:true});
    expect(await instance.getMembership('u1','t1')).toBeNull();
    await instance.createMembership({userId:'u1',tenantId:'t1',role:'TENANT_ADMIN'});
    await instance.updateMembership('u1','t1','CONTENT_MANAGER');
    expect((await instance.getMembership('u1','t1'))?.role).toBe('CONTENT_MANAGER');
    await instance.deleteMembership('u1','t1');
    expect(await instance.getMembership('u1','t1')).toBeNull();
  });
  it('covers tenant/domain lifecycle edge cases and directory filtering', async () => {
    const { instance, db } = service();

    await instance.ensureTenant({ id: 'existing', slug: 'existing', name: 'Existing', hostname: 'existing.jcp.test' });
    await instance.ensureTenant({ id: 'existing', slug: 'existing', name: 'Existing', hostname: 'existing.jcp.test' });

    db.set('tenants', 'inactive', { slug: 'inactive', name: 'Inactive', primaryHostname: 'inactive.jcp.test', status: 'INACTIVE' });
    db.set('tenants', 'active-b', { slug: 'b', name: 'B Temple', primaryHostname: 'b.jcp.test', status: 'ACTIVE' });
    db.set('tenants', 'active-a', { slug: 'a', name: 'A Temple', primaryHostname: 'a.jcp.test', status: 'ACTIVE' });
    expect((await instance.listPublicTenants()).map(item => item.name)).toEqual(['A Temple', 'B Temple']);

    await expect(instance.createTenant({
      id: 'existing',
      slug: 'new',
      name: 'Duplicate',
      hostname: 'existing.jcp.test',
    })).rejects.toThrow('Tenant ID already exists');

    await expect(instance.createTenant({
      id: 'new',
      slug: 'new',
      name: 'New',
      hostname: 'existing.jcp.test',
    })).rejects.toThrow('Tenant hostname already exists');

    expect(await instance.getTenantBySlug('missing')).toBeNull();
    expect(await instance.getTenantById('missing')).toBeNull();
    expect(await instance.getTenantPrimaryDomainDetails('missing')).toBeNull();
    await expect(instance.markTenantPrimaryDomainVerified('missing')).rejects.toThrow('Primary tenant domain not found');

    await instance.createMembership({ userId: 'u1', tenantId: 'existing', role: 'CONTENT_MANAGER' });
    await instance.assignTenantAdmin('u1', 'existing');
    expect((await instance.getMembership('u1', 'existing'))?.role).toBe('TENANT_ADMIN');
    await instance.assignTenantAdmin('u1', 'existing');
    expect((await instance.getMembership('u1', 'existing'))?.role).toBe('TENANT_ADMIN');

    await instance.createTenantAdminInvite({ tenantId: 'existing', email: '  ADMIN@EXAMPLE.COM ' });
    await instance.claimTenantAdminInvites('u2');
    await instance.claimTenantAdminInvites('u2', 'admin@example.com');
    expect((await instance.getMembership('u2', 'existing'))?.role).toBe('TENANT_ADMIN');
  });

  it('supports reusable tenant website onboarding, directory and media configuration records', async () => {
    const { instance, db } = service();

    const tenant = await instance.createTenant({
      id: 't2',
      slug: 'two',
      name: 'Two',
      hostname: 'two.jcp.test',
      address: 'Address',
      city: 'Pune',
      domainVerified: true,
    });
    expect(tenant).toEqual({ id: 't2', slug: 'two', name: 'Two', hostname: 'two.jcp.test' });

    await instance.setWebsiteConfig('t2', {
      tenantId: 't2',
      version: 1,
      theme: { primary: '#F57C00', secondary: '#8B2E1B', background: '#FFF4DE', surface: '#FFFDF8', accent: '#E65100' },
      header: { navItems: [], languages: ['हिन्दी'] },
      hero: { title: 'Two', imageUrl: 'https://example.test/two.jpg' },
      quickInfo: [],
      about: { title: 'Two', body: 'About' },
      templeDirectory: { enabled: true, title: 'Temples', showSearch: true, limit: 6 },
      events: { enabled: true, title: 'Events', items: [] },
      gallery: { enabled: true, title: 'Gallery', items: [] },
      seva: { enabled: true, title: 'Seva', items: [] },
      contact: {},
      footer: {},
    } as any);

    expect((await instance.getWebsiteConfig('t2'))?.hero.title).toBe('Two');

    const directory = await instance.listPublicTenants();
    expect(directory.find((item) => item.id === 't2')).toMatchObject({
      name: 'Two',
      hostname: 'two.jcp.test',
      primaryImageUrl: 'https://example.test/two.jpg',
    });

    await instance.setPlatformRoles('u2', ['PLATFORM_ADMIN']);
    expect((await instance.getUser('u2'))?.platformRoles).toEqual(['PLATFORM_ADMIN']);

    await instance.createTenantAdminInvite({ tenantId: 't2', email: 'admin@example.com' });
    const admin = await instance.upsertUser({ subject: 'google:admin', email: 'admin@example.com' });
    expect((await instance.getMembership(admin.id, 't2'))?.role).toBe('TENANT_ADMIN');

    const domain = await instance.getTenantPrimaryDomainDetails('t2');
    expect(domain?.verified).toBe(true);
    db.set('tenantDomains', 'two.jcp.test', {
      tenantId: 't2',
      hostname: 'two.jcp.test',
      type: 'CUSTOM',
      primary: true,
      verified: false,
      verificationToken: 'token',
    });
    expect((await instance.getTenantPrimaryDomainDetails('t2'))?.verificationToken).toBe('token');
    await instance.markTenantPrimaryDomainVerified('t2');
    expect((await instance.getTenantPrimaryDomainDetails('t2'))?.verified).toBe(true);

    expect(instance.getFirebaseApp()).toBeDefined();
  });

});
