import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TenantContext, TenantResolver } from './tenant.types';

@Injectable()
export class ConfigTenantResolver implements TenantResolver {
  constructor(private readonly config: ConfigService) {}

  async resolve(hostname: string): Promise<TenantContext | null> {
    const normalized = normalizeHostname(hostname);
    const configuredHost = normalizeHostname(
      this.config.get<string>('TENANT_HOSTNAME'),
    );
    const tenantId = this.config.get<string>('TENANT_ID');
    const tenantName = this.config.get<string>('TENANT_NAME');

    if (
      !configuredHost ||
      !tenantId ||
      !tenantName ||
      normalized !== configuredHost
    ) {
      return null;
    }

    return {
      id: tenantId,
      name: tenantName,
      hostname: configuredHost,
    };
  }
}

function normalizeHostname(hostname: string | undefined): string | null {
  if (!hostname) return null;

  const normalized = hostname.trim().toLowerCase().replace(/^www\./, '');
  return normalized || null;
}
