import crypto from "node:crypto";

type ResetActor = {
  id: number;
  username: string;
};

type ResetTarget = {
  id: number;
  role: string;
};

export function canResetUserPassword(actor: ResetActor, target: ResetTarget, actorIsMainAdmin: boolean) {
  if (actor.id === target.id) {
    return false;
  }

  return target.role !== "admin" || actorIsMainAdmin;
}

export function generateTemporaryPassword() {
  return `Temp-${crypto.randomBytes(9).toString("base64url")}`;
}
