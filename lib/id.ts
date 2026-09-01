import { customAlphabet } from "nanoid";

// Every @id column in prisma/schema.prisma has no @default — ids are always
// generated here instead, so every id in the app (and in the auth tables,
// via lib/custom-adapter.ts) is exactly 10 characters, alphanumeric only.
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(ALPHABET, 10);

export function generateId(): string {
  return nanoid();
}
