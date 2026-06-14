// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredSession,
  getStoredSession,
  isSessionExpiring,
  storeSession,
} from "@/lib/auth/session";

describe("backend auth session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persiste y recupera la sesion del backend", () => {
    storeSession({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      expires_at: 4_000_000_000,
      token_type: "bearer",
    });

    expect(getStoredSession()).toMatchObject({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
  });

  it("elimina la sesion almacenada", () => {
    storeSession({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      token_type: "bearer",
    });

    clearStoredSession();

    expect(getStoredSession()).toBeNull();
  });

  it("detecta tokens cercanos al vencimiento", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(
      isSessionExpiring({
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 10,
        expires_at: now + 10,
        token_type: "bearer",
      })
    ).toBe(true);
  });
});
