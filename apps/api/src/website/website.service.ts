import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { FirestoreService } from '../database/firestore.service';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { UpdateWebsiteConfigDto } from './dto/update-website-config.dto';
import { defaultWebsiteConfig, WebsiteSiteConfig } from './website.types';

@Injectable()
export class WebsiteService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly tenantContext: TenantContextStore,
    private readonly audit: AuditService,
  ) {}

  async getCurrent(): Promise<WebsiteSiteConfig> {
    const tenant = this.requireTenant();
    const stored = await this.firestore.getWebsiteConfig(tenant.id);
    return stored ?? defaultWebsiteConfig(tenant.id, tenant.name);
  }

  async updateCurrent(dto: UpdateWebsiteConfigDto): Promise<WebsiteSiteConfig> {
    const tenant = this.requireTenant();
    const current = await this.getCurrent();
    const next = mergeConfig(current, dto);

    validateWebsiteConfig(next);

    await this.firestore.setWebsiteConfig(tenant.id, next);

    await this.audit.record({
      action: 'WEBSITE_CONFIG_UPDATED',
      entity: 'WebsiteSiteConfig',
      entityId: tenant.id,
      metadata: {
        version: next.version,
        versionNote: dto._versionNote ?? null,
      },
    });

    return next;
  }

  async resetCurrent(): Promise<WebsiteSiteConfig> {
    const tenant = this.requireTenant();
    const next = defaultWebsiteConfig(tenant.id, tenant.name);
    await this.firestore.setWebsiteConfig(tenant.id, next);
    await this.audit.record({
      action: 'WEBSITE_CONFIG_RESET',
      entity: 'WebsiteSiteConfig',
      entityId: tenant.id,
    });
    return next;
  }

  private requireTenant() {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new NotFoundException('Tenant context not found');
    return tenant;
  }
}

function mergeConfig(current: WebsiteSiteConfig, dto: UpdateWebsiteConfigDto): WebsiteSiteConfig {
  const next = {
    ...current,
    theme: { ...current.theme, ...(dto.theme ?? {}) },
    header: { ...current.header, ...(dto.header ?? {}) },
    hero: { ...current.hero, ...(dto.hero ?? {}) },
    quickInfo: dto.quickInfo ?? current.quickInfo,
    about: { ...current.about, ...(dto.about ?? {}) },
    templeDirectory: { ...current.templeDirectory, ...(dto.templeDirectory ?? {}) },
    events: { ...current.events, ...(dto.events ?? {}) },
    gallery: { ...current.gallery, ...(dto.gallery ?? {}) },
    seva: { ...current.seva, ...(dto.seva ?? {}) },
    contact: { ...current.contact, ...(dto.contact ?? {}) },
    footer: { ...current.footer, ...(dto.footer ?? {}) },
    version: current.version + 1,
  };

  return next as WebsiteSiteConfig;
}

function validateWebsiteConfig(config: WebsiteSiteConfig): void {
  if (!config.hero?.title?.trim()) {
    throw new BadRequestException('Website hero title is required');
  }

  if (config.quickInfo.length > 8) {
    throw new BadRequestException('A website can have at most 8 quick information cards');
  }

  if (config.gallery.items.length > 30) {
    throw new BadRequestException('A website can have at most 30 gallery images');
  }

  if (config.events.items.length > 20) {
    throw new BadRequestException('A website can have at most 20 event cards');
  }

  if (config.seva.items.length > 12) {
    throw new BadRequestException('A website can have at most 12 seva actions');
  }

  if (config.templeDirectory.limit < 1 || config.templeDirectory.limit > 12) {
    throw new BadRequestException('Temple directory limit must be between 1 and 12');
  }
}
