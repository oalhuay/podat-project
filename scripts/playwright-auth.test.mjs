import assert from "node:assert/strict";
import test from "node:test";

import { parseSupabaseCredential } from "./playwright-auth.mjs";

const session = {
  access_token: "ey.test.token",
  refresh_token: "refresh-example",
};
const encodedSession = `base64-${Buffer.from(JSON.stringify(session)).toString(
  "base64url"
)}`;
const splitPosition = Math.floor(encodedSession.length / 2);

test("extrae tokens de una sesion Supabase dividida en cookies", () => {
  const credential = [
    `sb-project-auth-token.0 (${encodedSession.slice(0, splitPosition)})`,
    `sb-project-auth-token.1 (${encodedSession.slice(splitPosition)})`,
  ].join("\n");

  assert.deepEqual(parseSupabaseCredential(credential), {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  });
});

test("acepta un access token JWT aislado", () => {
  assert.deepEqual(parseSupabaseCredential("ey.test.token"), {
    accessToken: "ey.test.token",
    refreshToken: "",
  });
});

test("acepta las filas tabuladas copiadas desde Chrome DevTools", () => {
  const credential = [
    `sb-project-auth-token.0\t${encodedSession.slice(0, splitPosition)}\texample.com`,
    `sb-project-auth-token.1\t${encodedSession.slice(splitPosition)}\texample.com`,
  ].join("\n");

  assert.deepEqual(parseSupabaseCredential(credential), {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  });
});
