"use client";

type FileDropzoneProps = {
  archivo: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function FileDropzone({
  archivo,
  onFileChange,
}: FileDropzoneProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed p-16 text-center transition-all ${
        archivo
          ? "border-emerald-200 bg-emerald-50/80 shadow-sm"
          : "border-slate-200 bg-slate-50 hover:border-[#5D9AD4]/40 hover:bg-slate-100"
      }`}
    >
      <input
        type="file"
        accept=".xlsx"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={onFileChange}
      />

      <div className="text-center">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-sm font-black uppercase tracking-[0.25em] ${
            archivo
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#5D9AD4]/10 text-[#5D9AD4]"
          }`}
        >
          {archivo ? "OK" : "XLSX"}
        </div>
        <p className="text-xl font-black text-slate-800">
          {archivo ? archivo.name : "Arrastra el archivo o haz clic para elegirlo"}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Formato esperado: `Legajo`, `Alumno` o `Apellido/Nombre`, `Género` y `Condición`.
        </p>
      </div>
    </div>
  );
}
