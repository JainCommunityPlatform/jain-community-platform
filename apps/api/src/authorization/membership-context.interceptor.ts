import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, defer, from, switchMap } from 'rxjs';

import { TenantContextStore } from '../tenant/tenant-context.store';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { UserIdentityService } from '../identity/user-identity.service';
import { MembershipContextStore } from './membership-context.store';
import { MembershipService } from './membership.service';

@Injectable()
export class MembershipContextInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextStore,
    private readonly identity: UserIdentityService,
    private readonly membership: MembershipService,
    private readonly membershipContext: MembershipContextStore,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    const tenant = this.tenantContext.get();

    if (!tenant) {
      return defer(() =>
        this.membershipContext.run(null, () => next.handle()),
      );
    }

    return from(this.identity.resolve(user)).pipe(
      switchMap((currentUser) =>
        from(this.membership.resolve(currentUser.id, tenant.id)).pipe(
          switchMap((membership) =>
            defer(() =>
              this.membershipContext.run(
                {
                  userId: currentUser.id,
                  tenantId: tenant.id,
                  membership,
                },
                () => next.handle(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
