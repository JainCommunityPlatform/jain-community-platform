export interface TenantContext {
  id: string;
  name: string;
  hostname: string;
}

export interface TenantResolver {
  resolve(hostname: string, tenantId?: string): Promise<TenantContext | null>;
}
