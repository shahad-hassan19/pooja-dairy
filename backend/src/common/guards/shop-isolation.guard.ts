import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

interface AuthUser {
  userId: string;
  shopId: string;
  role: 'ADMIN' | 'STAFF' | 'USER';
}

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Injectable()
export class ShopIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>(); // 👈 typed

    const { user } = request;

    const shopIdFromParams =
      (request.params.shopId as string | undefined) ||
      (request.body as Record<string, unknown>).shopId ||
      (request.query.shopId as string | undefined);

    if (!shopIdFromParams) return true;

    if (user.role === 'ADMIN') return true;

    if (shopIdFromParams !== user.shopId) {
      throw new ForbiddenException('Access to another shop is forbidden');
    }

    return true;
  }
}
