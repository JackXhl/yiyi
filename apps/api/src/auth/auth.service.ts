import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { credentialsSchema } from "@yiyi/shared";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: unknown) {
    const creds = credentialsSchema.parse(input);
    const exists = await this.prisma.user.findUnique({ where: { email: creds.email } });
    if (exists) throw new ConflictException("邮箱已被注册");
    const trial = await this.prisma.plan.findUnique({ where: { code: "trial" } });
    const user = await this.prisma.user.create({
      data: {
        email: creds.email,
        passwordHash: await bcrypt.hash(creds.password, 10),
        planId: trial?.id,
        subExpiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      },
    });
    return this.issue(user.id, user.email);
  }

  async login(input: unknown) {
    const creds = credentialsSchema.parse(input);
    const user = await this.prisma.user.findUnique({ where: { email: creds.email } });
    if (!user || !(await bcrypt.compare(creds.password, user.passwordHash))) {
      throw new UnauthorizedException("邮箱或密码不对");
    }
    if (user.disabled) throw new UnauthorizedException("账号已停用");
    return this.issue(user.id, user.email);
  }

  private issue(userId: string, email: string) {
    const token = this.jwt.sign({ sub: userId, email, aud: "web" });
    return { token, user: { id: userId, email } };
  }
}
