import { compare, hash } from "bcrypt";

const SALT_ROUNDS = 10;

export const hashPassword = (password: string): Promise<string> => hash(password, SALT_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  compare(password, passwordHash);
