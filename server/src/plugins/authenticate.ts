import { type FastifyReply, type FastifyRequest } from "fastify";
import { verifyAccessToken, type AuthClaims } from "../lib/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthClaims;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    request.auth = verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ message: "Token invalid or expired" });
  }
};
