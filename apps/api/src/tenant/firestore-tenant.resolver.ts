import { Injectable } from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';
import { TenantContext, TenantResolver } from './tenant.types';

@Injectable()
export class FirestoreTenantResolver implements TenantResolver {
  constructor(private readonly firestore: FirestoreService) {}

  async resolve(hostname: string): Promise<TenantContext | null> {
    const normalized = normalizeHostname(hostname);
    if (!normalized) return null;

    const tenant = await this.firestore.getTenantByHostname(normalized);
    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      hostname: tenant.hostname,
    };
  }
}

function normalizeHostname(hostname: string | undefined): string | null {
  if (!hostname) return null;

  const normalized = hostname.trim().toLowerCase().replace(/^www\./, '');
  return normalized || null;
}
