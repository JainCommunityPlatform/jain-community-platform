import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthenticatedRequest } from './authenticated-request';
import { JwtAuthenticationService } from './jwt-authentication.service';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly authentication: JwtAuthenticationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();

    if (!token) {
      throw new UnauthorizedException('Bearer authentication is required');
    }

    request.user = await this.authentication.verify(token);
    return true;
  }
}
