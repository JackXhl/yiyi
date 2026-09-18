import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma.service.js";
import { IS_ADMIN, IS_PUBLIC } from "./public.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
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
      const payload = this.jwt.verify(token) as { sub?: string; aud?: string };
      const want = adminOnly ? "admin" : "web";
      if (payload.aud !== want || !payload.sub) throw new UnauthorizedException("请先登录");
      if (adminOnly) {
        const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
        if (!admin || admin.disabled) throw new UnauthorizedException("账号已停用");
      } else {
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.disabled) throw new UnauthorizedException("账号已停用");
      }
      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("请先登录");
    }
  }
}
