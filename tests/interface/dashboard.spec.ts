import { expect, test } from "@playwright/test";

test.use({
  storageState: "playwright/.auth/user.json",
});

test("CP-15 - permite interactuar con los graficos del dashboard", async ({
  page,
}) => {
  await page.goto(
    "https://podat-project.vercel.app/admin/estadisticas/dashboard"
  );

  await expect(page).toHaveURL(/\/admin\/estadisticas\/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Dashboard principal" })
  ).toBeVisible();

  const inscriptosEnSerie = page
    .getByRole("article")
    .filter({ hasText: "Inscriptos en serie" });
  await inscriptosEnSerie.getByRole("combobox").selectOption("189");
  await expect(inscriptosEnSerie.locator("canvas")).toBeVisible();
  await inscriptosEnSerie.locator("canvas").click({
    position: {
      x: 262,
      y: 61,
    },
  });

  const distribucionYRendimiento = page
    .getByRole("article")
    .filter({ hasText: "Distribución y rendimiento" });
  await distribucionYRendimiento.getByRole("combobox").selectOption("189");
  await expect(
    distribucionYRendimiento.getByText("No hay datos cargados para el año")
  ).toBeVisible();

  const estadoDelAlumnado = page
    .getByRole("article")
    .filter({ hasText: "Estado del alumnado" });
  await estadoDelAlumnado.getByRole("combobox").selectOption("189");

  const participacionDeGenero = page
    .getByRole("article")
    .filter({ hasText: "Participacion de genero" });
  await participacionDeGenero.getByRole("combobox").selectOption("189");
  await expect(participacionDeGenero.getByRole("img")).toBeVisible();
  await participacionDeGenero.getByRole("img").click({
    position: {
      x: 240,
      y: 149,
    },
  });
});
