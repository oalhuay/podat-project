// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImportResults from "./ImportResults";
import { ImportResult } from "@/lib/import/alumnos/types";

const sampleResult: ImportResult = {
  summary: {
    total: 3,
    nuevos: 1,
    duplicados: 1,
    actualizados: 1,
    invalidos: 0,
  },
  rows: [
    {
      legajo: "1001",
      nombre: "Lionel",
      apellido: "Messi",
      status: "nuevo",
      mensaje: "Alumno creado.",
    },
    {
      legajo: "1002",
      nombre: "Angel",
      apellido: "Di Maria",
      status: "duplicado",
      mensaje: "Alumno ya existente sin cambios.",
    },
    {
      legajo: "1003",
      nombre: "Julian",
      apellido: "Alvarez",
      status: "actualizado",
      mensaje: "Alumno existente actualizado.",
    },
  ],
};

describe("ImportResults", () => {
  it("filtra filas por estado al cambiar el filtro", () => {
    const onChangeStatusFilter = vi.fn();
    const { rerender } = render(
      <ImportResults
        result={sampleResult}
        statusFilter="todos"
        onChangeStatusFilter={onChangeStatusFilter}
      />
    );

    expect(screen.getByText("Messi")).toBeTruthy();
    expect(screen.getByText("Di Maria")).toBeTruthy();
    expect(screen.getByText("Alvarez")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Duplicados" }));
    expect(onChangeStatusFilter).toHaveBeenCalledWith("duplicado");

    rerender(
      <ImportResults
        result={sampleResult}
        statusFilter="duplicado"
        onChangeStatusFilter={onChangeStatusFilter}
      />
    );

    expect(screen.getByText("Di Maria")).toBeTruthy();
    expect(screen.queryByText("Messi")).toBeNull();
    expect(screen.queryByText("Alvarez")).toBeNull();
  });
});

