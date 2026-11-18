/**
 * Lightweight JWT payload decoder for reading standard claims (sub, userId, role)
 * stored inside the signed access token returned by the backend.
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64UrlUtf8(input: string): string | null {
  try {
    const clean = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = clean + '==='.slice((clean.length + 3) % 4);

    if (typeof globalThis.atob === 'function') {
      const bin = globalThis.atob(padded);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) {
        bytes[i] = bin.charCodeAt(i);
      }
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(bytes);
      }
      return bin;
    }

    const bytes: number[] = [];
    for (let i = 0; i < padded.length; i += 4) {
      const e1 = BASE64_CHARS.indexOf(padded[i]);
      const e2 = BASE64_CHARS.indexOf(padded[i + 1]);
      const e3 = padded[i + 2] === '=' ? -1 : BASE64_CHARS.indexOf(padded[i + 2]);
      const e4 = padded[i + 3] === '=' ? -1 : BASE64_CHARS.indexOf(padded[i + 3]);
      if (e1 < 0 || e2 < 0) break;

      bytes.push((e1 << 2) | (e2 >> 4));
      if (e3 >= 0) bytes.push(((e2 & 15) << 4) | (e3 >> 2));
      if (e4 >= 0) bytes.push(((e3 & 3) << 6) | e4);
    }

    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(new Uint8Array(bytes));
    }
    return String.fromCharCode(...bytes);
  } catch {
    return null;
  }
}

export interface JwtUserClaims {
  email?: string;
  userId?: number;
  role?: string;
}

export function decodeAccessTokenClaims(accessToken?: string | null): JwtUserClaims {
  if (!accessToken) return {};
  const parts = accessToken.split('.');
  if (parts.length !== 3) return {};
  const jsonText = decodeBase64UrlUtf8(parts[1]);
  if (!jsonText) return {};
  try {
    const payload = JSON.parse(jsonText) as Record<string, unknown>;
    return {
      email: typeof payload.sub === 'string' ? payload.sub : undefined,
      userId: typeof payload.userId === 'number' ? payload.userId : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  } catch {
    return {};
  }
}

export function deriveDisplayNameAndInitials(
  fullName?: string | null,
  email?: string | null,
): { displayName: string; initials: string } {
  const cleanName = fullName?.trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();
    return { displayName: cleanName, initials };
  }

  const cleanEmail = email?.trim();
  if (cleanEmail) {
    const handle = cleanEmail.split('@')[0] || cleanEmail;
    return {
      displayName: handle,
      initials: handle.slice(0, 2).toUpperCase(),
    };
  }

  return { displayName: 'Hành khách', initials: 'HK' };
}
