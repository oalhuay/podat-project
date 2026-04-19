export const isAuthSessionMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };

  const name = typeof candidate.name === "string" ? candidate.name : "";
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const normalizedMessage = message.toLowerCase();

  return (
    name === "AuthSessionMissingError" ||
    code === "AuthSessionMissingError" ||
    normalizedMessage.includes("auth session missing")
  );
};
