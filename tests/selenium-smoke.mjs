/* eslint-disable no-console */
import { Builder, By, until } from "selenium-webdriver";

let driver;

try {
  driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://example.com");

  const heading = await driver.wait(
    until.elementLocated(By.css("h1")),
    10_000,
  );
  const text = await heading.getText();

  if (text !== "Example Domain") {
    throw new Error(`Texto inesperado: "${text}"`);
  }

  console.log("Selenium funciona correctamente.");
  console.log(`Titulo: ${await driver.getTitle()}`);
  await driver.sleep(5_000);
} finally {
  await driver?.quit();
}
