import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test("real admin sign-in reaches live admin APIs", async ({ page }) => {
  test.skip(
    !adminEmail || !adminPassword,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run against the live stack.",
  );

  const apiResponses: { path: string; status: number }[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/v1/")) {
      apiResponses.push({ path: url.pathname.replace("/api/v1", ""), status: response.status() });
    }
  });

  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(adminEmail!);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Platform activity" })).toBeVisible();
  await expect(page.locator(".pipeline-insight")).toContainText("Connected");
  await expect(page.locator(".summary-strip")).toContainText("Live data");

  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: /Reports/ })
    .click();
  await expect(page).toHaveURL(/\/admin\/reports$/);
  await expect(page.getByRole("heading", { name: "Report review" })).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
  await expect
    .poll(() => apiResponses.some(({ path, status }) => path === "/admin/reports" && status === 200))
    .toBe(true);

  for (const endpoint of [
    "/auth/login",
    "/auth/me",
    "/admin/users",
    "/admin/companies",
    "/admin/jobs",
  ]) {
    expect(apiResponses.some((response) => response.path === endpoint && response.status === 200)).toBe(true);
  }
  expect(
    apiResponses
      .filter(({ path }) => path === "/admin/reports")
      .every(({ status }) => status === 200),
  ).toBe(true);
});
