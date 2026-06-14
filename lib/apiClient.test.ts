import { beforeEach, describe, expect, it, vi } from "vitest";
import { backendFetch } from "@/lib/backend";
import { apiClient } from "@/lib/apiClient";

vi.mock("@/lib/backend", () => ({
  backendFetch: vi.fn(),
}));

const mockedBackendFetch = vi.mocked(backendFetch);

describe("apiClient", () => {
  beforeEach(() => {
    mockedBackendFetch.mockReset();
    mockedBackendFetch.mockResolvedValue({ data: [{ id: 7 }] });
  });

  it("serializa consultas encadenadas hacia el backend", async () => {
    const result = await apiClient
      .from("materias")
      .select("id,nombre")
      .eq("id", 7)
      .order("nombre", { ascending: false })
      .limit(1);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: 7 }]);
    expect(mockedBackendFetch).toHaveBeenCalledWith(
      "/api/data/query",
      expect.objectContaining({ method: "POST" })
    );
    const request = mockedBackendFetch.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
        table: "materias",
        action: "select",
        columns: "id,nombre",
        filters: [{ operator: "eq", column: "id", value: 7 }],
        mode: "many",
        order: {
          column: "nombre",
          ascending: false,
        },
        limit: 1,
    });
  });

  it("envia upserts con su clave de conflicto", async () => {
    await apiClient
      .from("notas")
      .upsert([{ evaluacion_id: 1, alumno_id: 2 }], {
        onConflict: "evaluacion_id,alumno_id",
      });

    const request = mockedBackendFetch.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      table: "notas",
      action: "upsert",
      on_conflict: "evaluacion_id,alumno_id",
    });
  });
});
