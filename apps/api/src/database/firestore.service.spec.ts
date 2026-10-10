/* eslint-disable @typescript-eslint/no-explicit-any */
import { FirestoreService } from './firestore.service';

class Snapshot {
  constructor(
    private readonly value: any,
    readonly id = '',
    readonly ref?: Ref,
  ) {}
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
  limit() { return this; }
  async get() {
    const docs = this.db.entries(this.collectionName)
      .filter(([, value]) => this.filters.every(([field, op, expected]) => op === '==' && value?.[field] === expected))
      .map(([id, value]) => new Snapshot(value, id, new Ref(this.db, this.collectionName, id)));
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
        const docs = this.entries(name).map(([id, value]) => new Snapshot(value, id, new Ref(this, name, id)));
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
    const dbSet = this.set.bind(this);
    const dbGet = this.get.bind(this);
    const dbDelete = this.delete.bind(this);
    return {
      create: (ref: Ref, value: any) => dbSet(ref.collectionName, ref.id, value),
      update: (ref: Ref, value: any) => dbSet(ref.collectionName, ref.id, { ...dbGet(ref.collectionName, ref.id), ...value }),
      set: (ref: Ref, value: any, options?: any) => dbSet(ref.collectionName, ref.id, options?.merge ? { ...dbGet(ref.collectionName, ref.id), ...value } : value),
      delete: (ref: Ref) => dbDelete(ref.collectionName, ref.id),
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

  it('repairs an orphaned phone index during phone-first provisioning', async () => {
    const { instance, db } = service();
    const phone = '9876543210';
    const phoneIndexId = '7619ee8cea49187f309616e30ecf54be072259b43760f1f550a644945d5572f2';
    db.set('userPhoneIndexes', phoneIndexId, {
      userId: 'deleted-user',
      phone,
    });

    const user = await instance.provisionUserByPhone({ phone, displayName: 'Recovered Member' });

    expect(user.primaryPhone).toBe(phone);
    expect((await instance.findUserByPhone(phone))?.id).toBe(user.id);
    expect(db.get('userPhoneIndexes', phoneIndexId)?.userId).toBe(user.id);
  });

  it('repairs the phone index from an existing migration auth index', async () => {
    const { instance, db } = service();
    const phone = '9123456789';
    const phoneIndexId = 'bdf9248c72997bbb4ea647f0e650b0126bfa977ca0661ce4c12f9725e466353b';
    const authIndexId = 'a6ad1d235e70f9f57cc3497c926458ed860f908fbc2c55d3612a385f571e5feb';
    const user = await instance.provisionUserByPhone({ phone, displayName: 'Existing Member' });
    db.set('userPhoneIndexes', phoneIndexId, { userId: 'deleted-user', phone });

    const repaired = await instance.provisionUserByPhone({ phone, displayName: 'Ignored' });

    expect(repaired.id).toBe(user.id);
    expect(db.get('userPhoneIndexes', phoneIndexId)?.userId).toBe(user.id);
    expect(db.get('userAuthIndexes', authIndexId)?.userId).toBe(user.id);
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

  it('updates tenant profile fields and handles custom hostname changes', async () => {
    const { instance, db } = service();
    db.set('tenants', 't1', {
      slug: 'temple-one',
      name: 'Temple One',
      primaryHostname: 'temple-one.jcp.test',
      status: 'ACTIVE',
    });
    db.set('tenantDomains', 'temple-one.jcp.test', {
      tenantId: 't1',
      hostname: 'temple-one.jcp.test',
      primary: true,
      verified: true,
    });

    const updated = await instance.updateTenant('t1', {
      name: 'Updated Temple',
      city: 'Pune',
      customHostname: 'updated.example.com',
    });

    expect(updated).toMatchObject({
      id: 't1',
      name: 'Updated Temple',
      hostname: 'updated.example.com',
      city: 'Pune',
    });
    expect(db.get('tenantDomains', 'updated.example.com')?.tenantId).toBe('t1');
    expect(db.get('tenantDomains', 'temple-one.jcp.test')).toBeUndefined();

    const unchanged = await instance.updateTenant('t1', { address: 'New address' });
    expect(unchanged.address).toBe('New address');
    await expect(instance.updateTenant('missing', { name: 'Missing' })).rejects.toThrow('Tenant not found');
  });

  it('rejects changing a tenant hostname to another tenant domain', async () => {
    const { instance, db } = service();
    db.set('tenants', 't1', {
      slug: 'one',
      name: 'One',
      primaryHostname: 'one.jcp.test',
      status: 'ACTIVE',
    });
    db.set('tenantDomains', 'two.jcp.test', { tenantId: 't2', hostname: 'two.jcp.test' });

    await expect(instance.updateTenant('t1', { customHostname: 'two.jcp.test' }))
      .rejects.toThrow('Tenant hostname is already in use');
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

  it('lists tenant memberships in creation order without requiring orderBy index', async () => {
    const { instance, db } = service();
    db.set('memberships', 'u-new__t1', {
      userId: 'u-new',
      tenantId: 't1',
      role: 'TENANT_ADMIN',
      createdAt: new Date('2026-10-02T00:00:00Z'),
    });
    db.set('memberships', 'u-old__t1', {
      userId: 'u-old',
      tenantId: 't1',
      role: 'TENANT_ADMIN',
      createdAt: new Date('2026-10-01T00:00:00Z'),
    });
    db.set('users', 'u-old', { email: 'old@example.test', displayName: 'Older admin' });
    db.set('users', 'u-new', { email: 'new@example.test', displayName: 'Newer admin' });

    const memberships = await instance.listMemberships('t1');

    expect(memberships.map((membership) => membership.userId)).toEqual([
      'u-old',
      'u-new',
    ]);
    expect(memberships[0].user?.displayName).toBe('Older admin');
  });

  it('preserves existing roles when adding a tenant administrator role', async () => {
    const { instance } = service();
    await instance.createMembership({
      userId: 'user-finance',
      tenantId: 'tenant-1',
      role: 'FINANCE_VIEWER',
      roles: ['FINANCE_VIEWER'],
    });

    await instance.assignTenantAdmin('user-finance', 'tenant-1');

    const membership = await instance.getMembership('user-finance', 'tenant-1');
    expect(membership?.roles).toEqual(['FINANCE_VIEWER', 'TENANT_ADMIN']);
    expect((await instance.listTenantAdmins('tenant-1')).map((item) => item.userId))
      .toContain('user-finance');
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
    db.set('tenants', 'existing', { slug: 'existing', name: 'Existing', primaryHostname: 'existing.jcp.test', status: 'INACTIVE' });

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


describe('FirestoreService giving persistence', () => {
  it('creates campaigns in the owning tenant and only lists active campaigns publicly', async () => {
    const { instance, db } = service();
    const draft = await instance.createGivingCampaign({
      tenantId: 'tenant-a', actorUserId: 'finance-user', name: 'Temple Renovation',
      targetAmountPaise: 2500000,
    });
    expect(draft).toMatchObject({ tenantId: 'tenant-a', name: 'Temple Renovation', status: 'DRAFT', targetAmountPaise: 2500000 });
    await instance.updateGivingCampaignStatus('tenant-a', draft.id, 'ACTIVE');
    await instance.createGivingCampaign({ tenantId: 'tenant-b', actorUserId: 'finance-user-b', name: 'Other Temple' });
    expect(await instance.listGivingCampaigns('tenant-a')).toHaveLength(1);
    expect((await instance.listGivingCampaigns('tenant-a'))[0].id).toBe(draft.id);
    expect(db.get('givingCampaigns', draft.id)?.tenantId).toBe('tenant-a');
  });

  it('creates an idempotent pledge and refuses to reuse the key for different pledge data', async () => {
    const { instance, db } = service();
    const user = await instance.upsertUser({ subject: 'donor:1', email: 'donor@example.test' });
    const campaign = await instance.createGivingCampaign({ tenantId: 'tenant-a', actorUserId: 'finance-user', name: 'Renovation' });
    await instance.updateGivingCampaignStatus('tenant-a', campaign.id, 'ACTIVE');
    const input = { tenantId: 'tenant-a', donorUserId: user.id, campaignId: campaign.id, pledgedAmountPaise: 500000, idempotencyKey: 'request-123' };
    const first = await instance.createDonationPledge(input);
    const retry = await instance.createDonationPledge(input);
    expect(retry.id).toBe(first.id);
    expect(db.entries('donationPledges')).toHaveLength(1);
    expect(db.entries('tenantDonors')).toHaveLength(1);
    expect(first.donorId).toBeDefined();
    await expect(instance.createDonationPledge({ ...input, pledgedAmountPaise: 700000 }))
      .rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });

  it('does not allow pledges against another tenant campaign or a draft campaign', async () => {
    const { instance } = service();
    const user = await instance.upsertUser({ subject: 'donor:2' });
    const draft = await instance.createGivingCampaign({ tenantId: 'tenant-b', actorUserId: 'finance-user', name: 'Draft' });
    await expect(instance.createDonationPledge({
      tenantId: 'tenant-a', donorUserId: user.id, campaignId: draft.id,
      pledgedAmountPaise: 10000, idempotencyKey: 'wrong-tenant',
    })).rejects.toThrow('CAMPAIGN_NOT_FOUND');
  });

  it('returns only pledges belonging to the requested donor and tenant', async () => {
    const { instance } = service();
    const donorA = await instance.upsertUser({ subject: 'donor:a' });
    const donorB = await instance.upsertUser({ subject: 'donor:b' });
    const campaignA = await instance.createGivingCampaign({ tenantId: 'tenant-a', actorUserId: 'finance-user', name: 'A' });
    const campaignB = await instance.createGivingCampaign({ tenantId: 'tenant-b', actorUserId: 'finance-user', name: 'B' });
    await instance.updateGivingCampaignStatus('tenant-a', campaignA.id, 'ACTIVE');
    await instance.updateGivingCampaignStatus('tenant-b', campaignB.id, 'ACTIVE');
    await instance.createDonationPledge({ tenantId: 'tenant-a', donorUserId: donorA.id, campaignId: campaignA.id, pledgedAmountPaise: 10000, idempotencyKey: 'a1' });
    await instance.createDonationPledge({ tenantId: 'tenant-a', donorUserId: donorB.id, campaignId: campaignA.id, pledgedAmountPaise: 20000, idempotencyKey: 'b1' });
    await instance.createDonationPledge({ tenantId: 'tenant-b', donorUserId: donorA.id, campaignId: campaignB.id, pledgedAmountPaise: 30000, idempotencyKey: 'a2' });
    const own = await instance.listDonationPledgesForDonor('tenant-a', donorA.id);
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ tenantId: 'tenant-a', donorUserId: donorA.id, pledgedAmountPaise: 10000 });
    expect(await instance.listDonationPledgesForTenant('tenant-a')).toHaveLength(2);
  });
});
});


describe('FirestoreService donation payment workflow', () => {
  async function setup() {
    const { instance, db } = service();
    const donor = await instance.upsertUser({ subject: 'donor:payment-workflow' });
    const campaign = await instance.createGivingCampaign({
      tenantId: 'tenant-a', actorUserId: 'finance-admin', name: 'Temple Repair',
    });
    await instance.updateGivingCampaignStatus('tenant-a', campaign.id, 'ACTIVE');
    const pledge = await instance.createDonationPledge({
      tenantId: 'tenant-a', donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: 'pledge-key',
    });
    return { instance, db, donor, campaign, pledge };
  }

  it('requires a different approver and only counts a payment after verification', async () => {
    const { instance, pledge } = await setup();
    const payment = await instance.recordDonationPayment({
      tenantId: 'tenant-a', pledgeId: pledge.id,
      actorUserId: 'finance-operator', amountPaise: 25000, method: 'UPI',
      reference: 'UPI-123', idempotencyKey: 'payment-key',
    });
    expect(payment.status).toBe('PENDING_APPROVAL');
    await expect(instance.approveDonationPayment('tenant-a', payment.id, 'finance-operator'))
      .rejects.toThrow('PAYMENT_SELF_APPROVAL');
    const verified = await instance.approveDonationPayment('tenant-a', payment.id, 'finance-approver');
    expect(verified.status).toBe('VERIFIED');
    expect(verified.receiptNumber).toMatch(/^JCP-TENANTA-\\d{4}-\\d{6}$/);
    const receipts = await instance.listDonationReceiptsForTenant('tenant-a');
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      paymentId: payment.id, pledgeId: pledge.id, donorUserId: pledge.donorUserId,
      amountPaise: 25000, receiptNumber: verified.receiptNumber,
    });
    expect(await instance.listDonationReceiptsForDonor('tenant-a', pledge.donorUserId)).toHaveLength(1);
    expect(await instance.listDonationReceiptsForDonor('tenant-b', pledge.donorUserId)).toHaveLength(0);
    const updatedPledge = (await instance.listDonationPledgesForTenant('tenant-a')).find(p => p.id === payment.pledgeId);
    expect(updatedPledge).toMatchObject({ paidAmountPaise: 25000, status: 'PARTIALLY_PAID' });
  });

  it('builds a tenant-scoped summary from verified and pending payments only', async () => {
    const { instance, pledge } = await setup();
    await instance.recordDonationPayment({
      tenantId: 'tenant-a', pledgeId: pledge.id, actorUserId: 'operator-a',
      amountPaise: 20000, method: 'UPI', idempotencyKey: 'pending-payment',
    });
    const report = await instance.getDonationFinanceReport('tenant-a');
    expect(report.totals).toMatchObject({
      pledgedAmountPaise: 100000, receivedAmountPaise: 0, outstandingAmountPaise: 100000,
      pendingApprovalAmountPaise: 20000, pendingPaymentCount: 1, verifiedPaymentCount: 0,
    });
    expect(report.byPaymentMethod.find(item => item.method === 'UPI')?.verifiedAmountPaise).toBe(0);
  });

  it('rejects overpayment during recording and approval, and rejects do not update the pledge', async () => {
    const { instance, pledge } = await setup();
    await expect(instance.recordDonationPayment({
      tenantId: 'tenant-a', pledgeId: pledge.id, actorUserId: 'operator',
      amountPaise: 100001, method: 'CASH', idempotencyKey: 'too-much',
    })).rejects.toThrow('PAYMENT_EXCEEDS_BALANCE');
    const payment = await instance.recordDonationPayment({
      tenantId: 'tenant-a', pledgeId: pledge.id, actorUserId: 'operator',
      amountPaise: 50000, method: 'CASH', idempotencyKey: 'reject-me',
    });
    const rejected = await instance.rejectDonationPayment('tenant-a', payment.id, 'approver', 'Evidence did not match');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Evidence did not match');
    const current = (await instance.listDonationPledgesForTenant('tenant-a')).find(p => p.id === pledge.id);
    expect(current).toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
  });

  it('is idempotent and tenant-scoped when recording payment', async () => {
    const { instance, pledge } = await setup();
    const input = {
      tenantId: 'tenant-a', pledgeId: pledge.id, actorUserId: 'operator',
      amountPaise: 12000, method: 'BANK_TRANSFER' as const,
      reference: 'NEFT-100', idempotencyKey: 'same-payment',
    };
    const first = await instance.recordDonationPayment(input);
    const retry = await instance.recordDonationPayment(input);
    expect(retry.id).toBe(first.id);
    expect(retry.status).toBe('PENDING_APPROVAL');
    await expect(instance.recordDonationPayment({ ...input, amountPaise: 13000 }))
      .rejects.toThrow('PAYMENT_IDEMPOTENCY_CONFLICT');
    await expect(instance.approveDonationPayment('tenant-b', first.id, 'approver'))
      .rejects.toThrow('PAYMENT_NOT_FOUND');
  });
});
