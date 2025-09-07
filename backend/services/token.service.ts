import jwt from "jsonwebtoken";
import { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;

interface VerificationPayload {
  userId: string;
  purpose: "VERIFY_EMAIL";
}

interface PasswordResetPayload {
  userId: string;
  purpose: "RESET_PASSWORD";
}

type TokenPayload = VerificationPayload | PasswordResetPayload;

export const createVerificationToken = (user: User): string => {
  const payload: VerificationPayload = {
    userId: user.id,
    purpose: "VERIFY_EMAIL",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
};

export const createPasswordResetToken = (user: User): string => {
  const payload: PasswordResetPayload = {
    userId: user.id,
    purpose: "RESET_PASSWORD",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

export const verifyToken = (
  token: string,
  expectedPurpose: "VERIFY_EMAIL" | "RESET_PASSWORD"
): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded.purpose !== expectedPurpose) {
      throw new Error("Invalid token purpose");
    }
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token.");
  }
};
