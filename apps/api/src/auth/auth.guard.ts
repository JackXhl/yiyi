import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_ADMIN, IS_PUBLIC } from "./public.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    const adminOnly = this.reflector.getAllAndOverride<boolean>(IS_ADMIN, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest();
    const header = String(req.headers.authorization ?? "");
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new UnauthorizedException("请先登录");
    try {
      const payload = this.jwt.verify(token);
      const want = adminOnly ? "admin" : "web";
      if (payload.aud !== want) throw new UnauthorizedException("请先登录");
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("请先登录");
    }
  }
}
