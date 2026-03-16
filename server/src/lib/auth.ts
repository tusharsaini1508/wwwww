import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../env.js";

export type AuthClaims = {
  sub: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "PLANNER" | "OPERATOR" | "VIEWER";
  companyId: string;
};

export const hashPassword = async (plainTextPassword: string) =>
  bcrypt.hash(plainTextPassword, env.BCRYPT_SALT_ROUNDS);

export const verifyPassword = async (plainTextPassword: string, hash: string) =>
  bcrypt.compare(plainTextPassword, hash);

export const signAccessToken = (claims: AuthClaims) =>
  jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  } as SignOptions);

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as AuthClaims;
