import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';

import { AuditService } from '../audit/audit.service';
import { FirestoreService } from '../database/firestore.service';
import { defaultWebsiteConfig } from '../website/website.types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantAdminDto } from './dto/tenant-admin.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class PlatformService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async listTenants() {
    return this.firestore.listPublicTenants();
  }

  async createTenant(dto: CreateTenantDto, actorUserId: string) {
    const existingSlug = await this.firestore.getTenantBySlug(dto.slug);
    if (existingSlug) throw new ConflictException('Tenant slug is already in use');

    const customHostname = normalizeHostname(dto.customHostname);
    const hostname = customHostname ?? this.buildPlatformHostname(dto.slug);

    const existingDomain = await this.firestore.getTenantByHostname(hostname);
    if (existingDomain) throw new ConflictException('Tenant hostname is already in use');

    const tenantId = randomUUID();
    const verificationToken = customHostname ? randomUUID() : undefined;
    const tenant = await this.firestore.createTenant({
      id: tenantId,
      slug: dto.slug,
      name: dto.name.trim(),
      hostname,
      customHostname,
      address: dto.address?.trim(),
      city: dto.city?.trim(),
      state: dto.state?.trim(),
      postalCode: dto.postalCode?.trim(),
      domainVerified: !customHostname,
      domainVerificationToken: verificationToken,
    });

    await this.firestore.setWebsiteConfig(
      tenantId,
      defaultWebsiteConfig(tenantId, tenant.name),
    );

    let adminStatus: 'assigned' | 'invited' | 'none' = 'none';
    if (dto.adminUserId) {
      await this.firestore.assignTenantAdmin(dto.adminUserId, tenantId);
      adminStatus = 'assigned';
    } else if (dto.adminEmail) {
      const user = await this.firestore.findUserByEmail(dto.adminEmail);
      if (user) {
        await this.firestore.assignTenantAdmin(user.id, tenantId);
        adminStatus = 'assigned';
      } else {
        await this.firestore.createTenantAdminInvite({
          tenantId,
          email: dto.adminEmail,
        });
        adminStatus = 'invited';
      }
    }

    await this.audit.record({
      action: 'TENANT_CREATED',
      entity: 'Tenant',
      entityId: tenantId,
      metadata: {
        slug: dto.slug,
        hostname,
        adminStatus,
        actorUserId,
      },
    });

    return {
      ...tenant,
      hostname,
      adminStatus,
      websiteReady: true,
      domainVerification: customHostname
        ? {
            hostname,
            txtRecordName: '_jcp-verify.' + hostname,
            txtRecordValue: verificationToken,
            verified: false,
          }
        : null,
    };
  }

  async getTenant(tenantId: string) {
    const tenant = await this.firestore.getTenantById(tenantId);
    if (!tenant) throw new ConflictException('Tenant not found');
    return {
      ...tenant,
      admins: await this.firestore.listTenantAdmins(tenantId),
    };
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto, actorUserId: string) {
    const tenant = await this.firestore.updateTenant(tenantId, dto);
    await this.audit.record({
      action: 'TENANT_UPDATED',
      entity: 'Tenant',
      entityId: tenantId,
      metadata: {
        actorUserId,
        fields: Object.keys(dto),
      },
    });
    return tenant;
  }

  async addTenantAdmin(tenantId: string, dto: TenantAdminDto, actorUserId: string) {
    const tenant = await this.firestore.getTenantById(tenantId);
    if (!tenant) throw new ConflictException('Tenant not found');

    if (dto.userId?.trim()) {
      const user = await this.firestore.getUser(dto.userId.trim());
      if (!user) throw new ConflictException('User profile not found');
      await this.firestore.assignTenantAdmin(user.id, tenantId);
      await this.audit.record({
        action: 'TENANT_ADMIN_ASSIGNED',
        entity: 'TenantMembership',
        entityId: user.id + '__' + tenantId,
        metadata: { actorUserId, tenantId, userId: user.id },
      });
      return { status: 'assigned', userId: user.id, email: user.email ?? null };
    }

    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new ConflictException('Provide either a userId or email');

    const user = await this.firestore.findUserByEmail(email);
    if (user) {
      await this.firestore.assignTenantAdmin(user.id, tenantId);
      await this.audit.record({
        action: 'TENANT_ADMIN_ASSIGNED',
        entity: 'TenantMembership',
        entityId: user.id + '__' + tenantId,
        metadata: { actorUserId, tenantId, userId: user.id, email },
      });
      return { status: 'assigned', userId: user.id, email };
    }

    await this.firestore.createTenantAdminInvite({ tenantId, email });
    await this.audit.record({
      action: 'TENANT_ADMIN_INVITED',
      entity: 'TenantAdminInvite',
      entityId: tenantId,
      metadata: { actorUserId, tenantId, email },
    });
    return { status: 'invited', userId: null, email };
  }

  async verifyCustomDomain(tenantId: string) {
    const domain = await this.firestore.getTenantPrimaryDomainDetails(tenantId);
    if (!domain) throw new ConflictException('Primary tenant domain not found');
    if (domain.type !== 'CUSTOM') {
      throw new ConflictException('The primary domain is not a custom domain');
    }
    if (domain.verified) return { verified: true, hostname: domain.hostname };

    const recordName = '_jcp-verify.' + domain.hostname;
    let values: string[][] = [];
    try {
      values = await resolveTxt(recordName);
    } catch {
      return {
        verified: false,
        hostname: domain.hostname,
        message: 'DNS TXT verification record was not found yet',
      };
    }

    const expected = domain.verificationToken;
    const verified = !!expected && values.some(
      (record) => record.join('').trim() === expected,
    );
    if (!verified) {
      return {
        verified: false,
        hostname: domain.hostname,
        message: 'DNS TXT record exists but does not match the expected verification token',
      };
    }

    await this.firestore.markTenantPrimaryDomainVerified(tenantId);
    await this.audit.record({
      action: 'TENANT_DOMAIN_VERIFIED',
      entity: 'TenantDomain',
      entityId: tenantId,
      metadata: { hostname: domain.hostname },
    });
    return { verified: true, hostname: domain.hostname };
  }

  private buildPlatformHostname(slug: string): string {
    const baseDomain = this.config.get<string>('platform.tenantBaseDomain')?.trim();
    if (!baseDomain) {
      throw new ConflictException(
        'Tenant subdomain provisioning is not configured. Set JCP_TENANT_BASE_DOMAIN or provide a custom domain.',
      );
    }
    return slug + '.' + baseDomain.replace(/^\.+|\.+$/g, '').toLowerCase();
  }
}

function normalizeHostname(hostname?: string): string | undefined {
  if (!hostname) return undefined;
  const normalized = hostname.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  return normalized.replace(/^www\./, '') || undefined;
}
