import crypto from "crypto";

export const generateToken = (): { token: string; hashedToken: string } => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashedToken };
};
