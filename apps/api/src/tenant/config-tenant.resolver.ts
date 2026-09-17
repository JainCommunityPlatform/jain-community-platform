import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TenantContext, TenantResolver } from './tenant.types';

@Injectable()
export class ConfigTenantResolver implements TenantResolver {
  constructor(private readonly config: ConfigService) {}

  async resolve(hostname: string): Promise<TenantContext | null> {
    const normalized = hostname.trim().toLowerCase();
    const configuredHost = this.config.get<string>('TENANT_HOSTNAME');
    const tenantId = this.config.get<string>('TENANT_ID');
    const tenantName = this.config.get<string>('TENANT_NAME');

    if (
      !configuredHost ||
      !tenantId ||
      !tenantName ||
      normalized !== configuredHost.trim().toLowerCase()
    ) {
      return null;
    }

    return {
      id: tenantId,
      name: tenantName,
      hostname: configuredHost.trim().toLowerCase(),
    };
  }
}
