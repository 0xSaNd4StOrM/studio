// In-memory store for in-flight GitHub device-flow sessions.
// Sessions are short-lived (15 min max) and tied to a single connect attempt.
// Survives normal process lifetime; not persisted — that's fine: if the
// process restarts mid-connect the user just clicks Connect again.

export type DeviceSession = {
  agencyId: string;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresAt: number;
};

const sessions = new Map<string, DeviceSession>();

export function putDeviceSession(id: string, session: DeviceSession): void {
  sessions.set(id, session);
}

export function getDeviceSession(id: string): DeviceSession | null {
  const s = sessions.get(id);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return s;
}

export function deleteDeviceSession(id: string): void {
  sessions.delete(id);
}
