import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";

/**
 * An error we deliberately threw, with an HTTP status attached.
 * Anything else that reaches the error handler is treated as a bug (500).
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

/**
 * Express 4 does not catch errors thrown inside async handlers, so every async
 * route is wrapped in this to forward rejections to the error handler.
 */
export function route(
  handler: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

/** Validate a request body against a Zod schema, or fail with a 400. */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ZodError(result.error.issues);
  }
  return result.data;
}

/** Turns every thrown error into a consistent JSON shape. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      // Field-by-field messages so the frontend can show them next to inputs.
      details: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Something went wrong" });
}
