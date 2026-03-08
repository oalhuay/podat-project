"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type ExcelRow = {
  Legajo?: string | number;
  Nombre?: string;
  Apellido?: string;
  legajo?: string | number;
  nombre?: string;
  apellido?: string;
  [key: string]: unknown;
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const HEADER_ALIASES = {
  legajo: ["Legajo", "NroLegajo", "NumeroLegajo", "Nro", "NroLeg"],
  nombre: ["Nombre", "Nombres"],
  apellido: ["Apellido", "Apellidos"],
};

export default function ImportarAlumnos() {
  const [materia, setMateria] = useState("");
  const [anio, setAnio] = useState("2026");
  const [comision, setComision] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datosPrevia, setDatosPrevia] = useState<ExcelRow[]>([]);

  const puedeSubir = materia && anio && comision && archivo;

  const pickText = (value: unknown) => {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    return "";
  };

  const pickByHeader = (fila: ExcelRow, aliases: string[]) => {
    const aliasSet = new Set(aliases.map(normalizeHeader));

    for (const [key, value] of Object.entries(fila)) {
      if (aliasSet.has(normalizeHeader(key))) {
        return pickText(value);
      }
    }

    return "";
  };

  const detectHeaderRow = (rows: unknown[][]) => {
    const normalizedAliases = {
      legajo: new Set(HEADER_ALIASES.legajo.map(normalizeHeader)),
      nombre: new Set(HEADER_ALIASES.nombre.map(normalizeHeader)),
      apellido: new Set(HEADER_ALIASES.apellido.map(normalizeHeader)),
    };

    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex++) {
      const row = rows[rowIndex] ?? [];
      const colIndex = {
        legajo: -1,
        nombre: -1,
        apellido: -1,
      };

      for (let i = 0; i < row.length; i++) {
        const cell = pickText(row[i]);
        if (!cell) continue;
        const normalized = normalizeHeader(cell);

        if (colIndex.legajo === -1 && normalizedAliases.legajo.has(normalized)) {
          colIndex.legajo = i;
        }
        if (colIndex.nombre === -1 && normalizedAliases.nombre.has(normalized)) {
          colIndex.nombre = i;
        }
        if (
          colIndex.apellido === -1 &&
          normalizedAliases.apellido.has(normalized)
        ) {
          colIndex.apellido = i;
        }
      }

      if (colIndex.legajo !== -1 && colIndex.nombre !== -1 && colIndex.apellido !== -1) {
        return { rowIndex, colIndex };
      }
    }

    return null;
  };

  const handleLecturaArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr || typeof bstr !== "string") return;

      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: false,
        defval: "",
      });

      const headerInfo = detectHeaderRow(matrix);

      if (!headerInfo) {
        console.log("No se encontro fila de encabezados valida.", matrix.slice(0, 5));
        setDatosPrevia([]);
        return;
      }

      const { rowIndex, colIndex } = headerInfo;
      const data = matrix
        .slice(rowIndex + 1)
        .map((row) => ({
          Legajo: pickText(row[colIndex.legajo]),
          Nombre: pickText(row[colIndex.nombre]),
          Apellido: pickText(row[colIndex.apellido]),
        }))
        .filter((fila) => fila.Legajo || fila.Nombre || fila.Apellido);

      console.log("Datos leidos:", data);
      setDatosPrevia(data);
    };
    reader.readAsBinaryString(file);
  };

  const confirmarCarga = async () => {
    if (datosPrevia.length === 0) {
      alert("Primero carga un archivo valido");
      return;
    }

    console.log("Iniciando carga masiva a Supabase...");

    try {
      const alumnosAInsertar = datosPrevia
        .map((fila) => ({
          legajo: pickText(fila.Legajo ?? pickByHeader(fila, HEADER_ALIASES.legajo)),
          nombre: pickText(fila.Nombre ?? pickByHeader(fila, HEADER_ALIASES.nombre)),
          apellido: pickText(
            fila.Apellido ?? pickByHeader(fila, HEADER_ALIASES.apellido)
          ),
        }))
        .filter((fila) => fila.legajo && fila.nombre && fila.apellido);

      if (alumnosAInsertar.length === 0) {
        alert(
          "No hay filas validas para insertar. Revisa encabezados: Legajo, Nombre, Apellido."
        );
        return;
      }

      console.log("Payload ejemplo (fila 1):", alumnosAInsertar[0]);

      const { data, error } = await supabase
        .from("alumnos")
        .insert(alumnosAInsertar)
        .select();

      if (error) throw error;

      alert(`Exito. Se cargaron ${data.length} alumnos correctamente.`);
      setArchivo(null);
      setDatosPrevia([]);
    } catch (err: unknown) {
      const fallbackMessage = "Error desconocido";
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : fallbackMessage;
      console.error("Error en la carga (detalle completo):", err);
      alert(`Error al subir los datos: ${errorMessage}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Carga de Alumnos
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Configura el curso y arrastra el Excel (.xlsx)
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Materia
          </label>
          <select
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all appearance-none cursor-pointer"
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
          >
            <option value="">Elegir Materia...</option>
            <option value="1">Programacion I</option>
            <option value="2">Sistemas Operativos</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Anio
          </label>
          <input
            type="number"
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Comision
          </label>
          <select
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all appearance-none cursor-pointer"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
          >
            <option value="">Elegir...</option>
            <option value="A">Comision A</option>
            <option value="B">Comision B</option>
            <option value="C">Comision C</option>
          </select>
        </div>
      </section>

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
          onChange={handleLecturaArchivo}
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

      {puedeSubir && (
        <button
          onClick={confirmarCarga}
          className="w-full mt-10 p-5 bg-[#5D9AD4] text-white font-black text-xl rounded-3xl shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          CONFIRMAR IMPORTACION
        </button>
      )}
    </div>
  );
}
