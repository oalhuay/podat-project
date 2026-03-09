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
      className={`relative border-4 border-dashed rounded-[2.5rem] p-16 transition-all flex flex-col items-center justify-center ${
        archivo
          ? "border-green-200 bg-green-50"
          : "border-slate-100 bg-slate-50 hover:bg-slate-100"
      }`}
    >
      <input
        type="file"
        accept=".xlsx, .xls"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={onFileChange}
      />

      <div className="text-center">
        <span className="text-6xl mb-6 block">{archivo ? "OK" : "FILE"}</span>
        <p className="text-xl font-bold text-slate-700">
          {archivo ? archivo.name : "Arrastra el Excel aqui"}
        </p>
        <p className="text-slate-400 text-sm mt-2">
          Campos requeridos: Legajo, Apellido, Nombre, Email, Genero.
        </p>
      </div>
    </div>
  );
}

