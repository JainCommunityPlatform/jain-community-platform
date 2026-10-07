import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditService } from '../audit/audit.service';
import { FirestoreService } from '../database/firestore.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { defaultWebsiteConfig } from '../website/website.types';

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

    const hostname = normalizeHostname(dto.customHostname) ??
      this.buildPlatformHostname(dto.slug);

    const existingDomain = await this.firestore.getTenantByHostname(hostname);
    if (existingDomain) throw new ConflictException('Tenant hostname is already in use');

    const tenantId = crypto.randomUUID();
    const tenant = await this.firestore.createTenant({
      id: tenantId,
      slug: dto.slug,
      name: dto.name.trim(),
      hostname,
      customHostname: normalizeHostname(dto.customHostname) ?? undefined,
      address: dto.address?.trim(),
      city: dto.city?.trim(),
      state: dto.state?.trim(),
      postalCode: dto.postalCode?.trim(),
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
    };
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
  const normalized = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return normalized.replace(/^www\./, '') || undefined;
}
