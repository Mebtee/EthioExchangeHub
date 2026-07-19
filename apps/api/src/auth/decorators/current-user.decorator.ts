import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../../common/interfaces/request-with-user.interface';

export const CurrentUser = createParamDecorator<keyof JwtPayload | undefined, ExecutionContext>(
  (data, ctx) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
