export type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user?: AuthUser;
};

export type AuthState = {
  user: AuthUser;
  profile: {
    id: string;
    correo?: string | null;
    rol: "admin" | "docente" | null;
    last_login_at?: string | null;
  } | null;
};
