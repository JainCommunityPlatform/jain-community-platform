import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TenantContextStore } from './tenant-context.store';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, _context: ExecutionContext): never => {
    throw new Error(
      'CurrentTenant must be implemented through a TenantContextStore-aware provider.',
    );
  },
);
