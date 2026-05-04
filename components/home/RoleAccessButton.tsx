"use client";

type RoleAccessButtonProps = {
  accentClassName: string;
  badgeClassName: string;
  icon: string;
  title: string;
  roleLabel: string;
  helperText: string;
  onClick: () => void;
};

function GoogleIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.053 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.176 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.146 35.091 26.702 36 24 36c-5.218 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.507 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.565h.003l6.19 5.238C36.973 39.203 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

export default function RoleAccessButton({
  accentClassName,
  badgeClassName,
  icon,
  title,
  roleLabel,
  helperText,
  onClick,
}: RoleAccessButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`auth-role-card group relative w-full overflow-hidden rounded-[1.75rem] border-2 bg-white px-5 py-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5D9AD4]/18 ${accentClassName}`}
    >
      <div className="auth-role-overlay pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />

      <div className="relative flex items-start gap-4 transition-all duration-300 group-hover:scale-95 group-hover:opacity-0 group-focus-visible:scale-95 group-focus-visible:opacity-0">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${badgeClassName}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            Entrar o registrarme
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">Continua con Google como {roleLabel}.</div>
          <div className="mt-3 text-xs font-medium text-slate-400">{helperText}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="auth-google-badge flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/80">
          <GoogleIcon className="h-9 w-9" />
        </div>
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-[0.22em] text-slate-700">
            Acceso con Google
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Se abrira el inicio de sesion seguro para este perfil.
          </div>
        </div>
      </div>
    </button>
  );
}
