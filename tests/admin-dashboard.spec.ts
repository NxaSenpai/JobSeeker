import { expect, test, type BrowserContext, type WebSocketRoute } from "@playwright/test";

const storageKey = "jobseeker.auth.session";

function adminSession() {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Dara",
    lastName: "Sok",
    email: "admin@example.invalid",
    role: "ADMIN",
    emailVerified: true,
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    user,
    accessToken: `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.browser-fixture`,
  };
}

async function seedAdmin(context: BrowserContext) {
  const data = adminSession();
  let pendingJobTotal = 4;
  await context.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: storageKey, value: data },
  );
  await context.route("**/api/v1/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname.replace("/api/v1", "");
    const reply = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (route.request().method() === "OPTIONS") return reply({});
    if (path === "/auth/me") return reply({ user: data.user });
    if (path === "/admin/users") {
      return reply({ users: [], total: 148, page: 1, limit: 1 });
    }
    if (path === "/admin/companies") {
      const total = requestUrl.searchParams.get("status") === "PENDING" ? 3 : 24;
      return reply({ companies: [], total, page: 1, limit: 1 });
    }
    if (path === "/admin/jobs") {
      const total = requestUrl.searchParams.get("moderationStatus") === "PENDING" ? pendingJobTotal : 57;
      return reply({ jobs: [], total, page: 1, limit: 1 });
    }
    if (path === "/admin/reports") {
      const status = requestUrl.searchParams.get("status");
      const total = status === "OPEN" ? 5 : status === "IN_REVIEW" ? 2 : 7;
      return reply({ reports: [], total, page: 1, limit: 20 });
    }
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: `Unexpected endpoint: ${path}` }),
    });
  });
  return {
    setPendingJobTotal(total: number) {
      pendingJobTotal = total;
    },
  };
}

test("admin overview matches workspace layout and uses backend totals", async ({
  page,
  context,
}) => {
  await seedAdmin(context);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Platform activity" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("148")).toBeVisible();
  await expect(page.getByText("24")).toBeVisible();
  await expect(page.getByText("57")).toBeVisible();
  await expect(page.getByText("7", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Live data", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Live queue", { exact: true })).toBeVisible();
  const notifications = page.getByRole("button", { name: "Notifications, 14 items need attention" });
  await expect(notifications).toBeVisible();
  await expect(notifications.locator(".notification-count")).toHaveText("14");
  const adminNavigation = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(adminNavigation.getByRole("link", { name: /Reports/ }).locator(".nav-count")).toHaveText("7");
  await expect(adminNavigation.getByRole("link", { name: /Jobs/ }).locator(".nav-count")).toHaveText("4");
  await expect(adminNavigation.getByRole("link", { name: /Verification/ }).locator(".nav-count")).toHaveText("3");
  await notifications.click();
  const notificationPanel = page.getByRole("region", { name: "Admin notifications" });
  await expect(notificationPanel).toBeVisible();
  await expect(notificationPanel.locator(".notification-item")).toHaveCount(4);
  await expect(notificationPanel.locator(".notification-item-count")).toHaveText(["5", "2", "3", "4"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await notifications.click();
  await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Verification" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Jobs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Admin feature status" })).toBeVisible();
  await expect(page.getByText("Connected to API").first()).toBeVisible();
  await page.getByRole("link", { name: /Open reports/ }).click();
  await expect(page).toHaveURL("/admin/reports?status=OPEN");
  await expect(
    page.locator(".filter-field").filter({ hasText: "Status" }).locator("select"),
  ).toHaveValue("OPEN");
});

test("admin notification badge does not show a partial total when a queue is unavailable", async ({
  page,
  context,
}) => {
  await seedAdmin(context);
  await context.route("**/api/v1/admin/jobs**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("moderationStatus") === "PENDING") {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Temporarily unavailable" }),
      });
    }
    return route.fallback();
  });

  await page.goto("/admin");
  const notifications = page.getByRole("button", { name: "Notifications, queue total unavailable" });
  await expect(notifications).toBeVisible();
  await expect(notifications.locator(".notification-error-mark")).toHaveText("!");
  await notifications.click();
  await expect(page.getByRole("alert")).toContainText("couldn’t be loaded");
  await expect(page.getByText("All caught up.")).toHaveCount(0);
});

test("admin notification badge refreshes when the WebSocket announces a queue change", async ({
  page,
  context,
}) => {
  const fixture = await seedAdmin(context);
  let socket: WebSocketRoute | undefined;
  let namespaceConnected = false;
  await context.routeWebSocket("ws://localhost:3000/socket.io/**", (route) => {
    socket = route;
    route.onMessage((message) => {
      if (typeof message === "string" && message.startsWith("40/notifications,")) {
        namespaceConnected = true;
        route.send('40/notifications,{"sid":"admin-test-session"}');
      }
    });
    route.send(
      '0{"sid":"admin-test-engine","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}',
    );
  });

  await page.goto("/admin");
  const notifications = page.locator(".notification-button");
  await expect(notifications).toHaveAttribute(
    "aria-label",
    "Notifications, 14 items need attention",
  );
  await expect.poll(() => namespaceConnected).toBe(true);

  fixture.setPendingJobTotal(6);
  socket?.send(
    '42/notifications,["admin.queues.updated",{"updatedAt":"2026-10-05T05:00:00.000Z"}]',
  );

  await expect(notifications).toHaveAttribute(
    "aria-label",
    "Notifications, 16 items need attention",
  );
  await expect(
    page.getByRole("navigation", { name: "Admin navigation" })
      .getByRole("link", { name: /Jobs/ })
      .locator(".nav-count"),
  ).toHaveText("6");
});

test("admin notifications stay in the shared header across workspace pages", async ({
  page,
  context,
}) => {
  await seedAdmin(context);

  for (const path of [
    "/admin",
    "/admin/users",
    "/admin/jobs",
    "/admin/reports",
    "/admin/companies",
    "/admin/audit",
    "/admin/settings",
    "/admin/profile",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /Notifications/ })).toBeVisible();
    await expect(page.locator(".header-actions").getByRole("link", { name: /Dashboard|Overview/ })).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav.getByRole("link", { name: /Reports/ }).locator(".nav-count")).toHaveText("7");
    await expect(nav.getByRole("link", { name: /Jobs/ }).locator(".nav-count")).toHaveText("4");
    await expect(nav.getByRole("link", { name: /Verification/ }).locator(".nav-count")).toHaveText("3");
  }
});

test("admin navigation becomes a usable mobile drawer", async ({ page, context }) => {
  await seedAdmin(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");

  const openButton = page.getByRole("button", { name: "Open navigation" });
  await expect(openButton).toBeVisible();
  await openButton.click();

  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Reports/ }).locator(".nav-count")).toHaveText("7");
  await expect(nav.getByRole("link", { name: /Jobs/ }).locator(".nav-count")).toHaveText("4");
  await expect(nav.getByRole("link", { name: /Verification/ }).locator(".nav-count")).toHaveText("3");
  await nav.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL("/admin/reports");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("admin sidebar stays docked when switching tabs and reloading", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The dock control is a desktop sidebar control.");
  await seedAdmin(context);
  await page.goto("/admin");

  await page.getByRole("button", { name: "Dock sidebar" }).click();
  await expect(page.locator(".admin-shell")).toHaveClass(/sidebar-is-collapsed/);

  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Reports" })
    .click();
  await expect(page).toHaveURL("/admin/reports");
  await expect(page.getByRole("heading", { name: "Report review" })).toBeVisible();
  await expect(page.locator(".admin-shell")).toHaveClass(/sidebar-is-collapsed/);
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator(".admin-shell")).toHaveClass(/sidebar-is-collapsed/);
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-pressed", "true");
});
