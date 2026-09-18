import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { ZodError } from "zod";

@Catch()
export class AllFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exception instanceof ZodError) {
      const msg = exception.issues[0]?.message ?? "填写不对";
      return res.status(400).json({ message: msg });
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message = typeof body === "string" ? body : (body as { message?: string | string[] }).message;
      return res.status(exception.getStatus()).json({
        message: Array.isArray(message) ? message[0] : message,
      });
    }
    const err = exception as { status?: number; message?: string };
    const status = err.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    return res.status(status).json({ message: err.message ?? "出错了" });
  }
}
