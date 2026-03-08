'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function ImportarAlumnos() {
  // Estados para el contexto
  const [materia, setMateria] = useState('')
  const [anio, setAnio] = useState('2026')
  const [comision, setComision] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [datosPrevia, setDatosPrevia] = useState<any[]>([])

  // Verificación simple: ¿Completó todo?
  const puedeSubir = materia && anio && comision && archivo

  const handleLecturaArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      console.log("Datos leídos:", data)
      setDatosPrevia(data)
    }
    reader.readAsBinaryString(file)
  }

  const confirmarCarga = async () => {
    if (datosPrevia.length === 0) return alert("El archivo está vacío")
    alert(`Subiendo ${datosPrevia.length} alumnos a la materia ${materia}...`)
    // Aquí irá la llamada a Supabase en el próximo paso
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Carga de Alumnos</h1>
        <p className="text-slate-500 mt-2 font-medium">Configurá el curso y arrastrá el Excel (.xlsx)</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Selector de Materia */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">Materia</label>
          <select 
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-[#5D9AD4] outline-none transition-all appearance-none cursor-pointer"
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
          >
            <option value="">Elegir Materia...</option>
            <option value="1">Programación I</option>
            <option value="2">Sistemas Operativos</option>
          </select>
        </div>

        {/* Año Lectivo */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">Año</label>
          <input 
            type="number" 
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-[#5D9AD4] outline-none transition-all"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </div>

        {/* Comisión */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">Comisión</label>
          <select 
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:border-[#5D9AD4] outline-none transition-all appearance-none cursor-pointer"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
          >
            <option value="">Elegir...</option>
            <option value="A">Comisión A</option>
            <option value="B">Comisión B</option>
            <option value="C">Comisión C</option>
          </select>
        </div>
      </section>

      {/* Zona de Drop (Input invisible para que sea funcional) */}
      <div className={`relative border-4 border-dashed rounded-[2.5rem] p-16 transition-all flex flex-col items-center justify-center 
        ${archivo ? 'border-green-200 bg-green-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
        
        <input 
          type="file" 
          accept=".xlsx, .xls"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleLecturaArchivo}
        />

        <div className="text-center">
          <span className="text-6xl mb-6 block">{archivo ? '✅' : '📁'}</span>
          <p className="text-xl font-bold text-slate-700">
            {archivo ? archivo.name : 'Arrastrá el Excel aquí'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Campos requeridos: Legajo, Apellido, Nombre, Email, Género.
          </p>
        </div>
      </div>

      {/* Botón de acción final */}
      {puedeSubir && (
        <button
          onClick={confirmarCarga}
          className="w-full mt-10 p-5 bg-[#5D9AD4] text-white font-black text-xl rounded-3xl shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all">
          CONFIRMAR IMPORTACIÓN 🚀
        </button>
      )}
    </div>
  )
}