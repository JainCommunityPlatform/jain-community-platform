import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { AuthContextStore } from './auth-context.store';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthenticationContextInterceptor implements NestInterceptor {
  constructor(private readonly authContext: AuthContextStore) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    return this.authContext.run(user, () => next.handle());
  }
}
