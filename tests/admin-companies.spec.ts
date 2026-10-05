import { expect, test, type BrowserContext } from "@playwright/test";

const storageKey = "jobseeker.auth.session";
const verifiedOwnerCompanyId = "22222222-2222-4222-8222-222222222222";
const unverifiedOwnerCompanyId = "33333333-3333-4333-8333-333333333333";
const returnedCompanyId = "44444444-4444-4444-8444-444444444444";

function adminSession() {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Dara",
    lastName: "Sok",
    email: "admin@example.invalid",
    role: "ADMIN",
    emailVerified: true,
  };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    user,
    accessToken: `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.browser-fixture`,
  };
}

function makeCompany(id: string, name: string, moderationNote: string | null = null) {
  const createdAt = "2026-09-18T09:00:00.000Z";
  return {
    id,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    industry: "Education technology",
    companySize: "11–50 people",
    foundedYear: 2018,
    location: "Phnom Penh, Cambodia",
    website: "https://example.invalid",
    description: `${name} builds tools for local learning teams.`,
    contactEmail: "hello@example.invalid",
    timezone: "Asia/Phnom_Penh",
    socialLinks: { linkedin: "https://linkedin.example.invalid/company" },
    logoUrl: null,
    bannerUrl: null,
    isVerified: false,
    moderationNote,
    suspendedAt: null,
    suspensionReason: null,
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedAdminCompanyQueue(context: BrowserContext) {
  const admin = adminSession();
  const state = {
    items: [
      {
        company: makeCompany(verifiedOwnerCompanyId, "Northstar Learning"),
        ownerContact: {
          email: "owner@northstar.example.invalid",
          contactName: "Sothea Chan",
          emailVerified: true,
          suspendedAt: null,
        },
      },
      {
        company: makeCompany(unverifiedOwnerCompanyId, "Riverbank Studio"),
        ownerContact: {
          email: "owner@riverbank.example.invalid",
          contactName: "Vanna Sok",
          emailVerified: false,
          suspendedAt: null,
        },
      },
      {
        company: makeCompany(returnedCompanyId, "Mekong Learning Co", "Please provide a working business website."),
        ownerContact: {
          email: "owner@mekong.example.invalid",
          contactName: "Rithy Lim",
          emailVerified: true,
          suspendedAt: null,
        },
      },
    ],
    mutations: [] as Array<{ path: string; body: unknown; authorization: string | undefined }>,
    searches: [] as string[],
  };

  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: storageKey, value: admin });

  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };
    const reply = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      headers,
      body: JSON.stringify(body),
    });

    if (method === "OPTIONS") return reply({});
    if (path === "/auth/me" && method === "GET") return reply({ user: admin.user });

    if (path === "/admin/companies" && method === "GET") {
      if (!request.headers().authorization) return reply({ message: "Admin sign-in required." }, 401);
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      state.searches.push(search);
      const page = Number(url.searchParams.get("page") ?? 1);
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const matches = state.items.filter(({ company, ownerContact }) =>
        !company.isVerified && !company.suspendedAt &&
        (!search || `${company.name} ${company.industry ?? ""} ${company.location ?? ""} ${ownerContact?.email ?? ""}`.toLowerCase().includes(search)),
      );
      return reply({
        companies: matches.slice((page - 1) * limit, page * limit),
        total: matches.length,
        page,
        limit,
      });
    }

    const decisionRoute = path.match(/^\/admin\/companies\/([\da-f-]+)\/(approve|reject)$/i);
    if (decisionRoute && method === "PATCH") {
      const [, id, decision] = decisionRoute;
      const item = state.items.find((candidate) => candidate.company.id === id);
      if (!item) return reply({ message: "Company was not found." }, 404);
      const body = method === "PATCH" && request.postData() ? request.postDataJSON() : null;
      state.mutations.push({ path, body, authorization: request.headers().authorization });
      if (decision === "approve") {
        if (!item.ownerContact?.emailVerified || item.ownerContact.suspendedAt) {
          return reply({ message: "The company owner must have a verified, active account before approval." }, 409);
        }
        item.company.isVerified = true;
        item.company.moderationNote = null;
      } else {
        const reason = (body as { reason?: string } | null)?.reason?.trim() ?? "";
        if (reason.length < 3) return reply({ message: "The review note must contain at least 3 characters." }, 400);
        item.company.moderationNote = reason;
        item.company.updatedAt = "2026-09-26T08:30:00.000Z";
      }
      return reply({ company: item.company });
    }

    return reply({ message: `Unexpected endpoint: ${method} ${path}` }, 404);
  });

  return state;
}

test("admin can review and verify a company with an eligible owner", async ({ page, context }) => {
  const state = await seedAdminCompanyQueue(context);
  await page.goto("/admin/companies");

  await expect(page.getByRole("heading", { name: "Review company applications" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Northstar Learning" })).toBeVisible();
  await expect(page.getByText("Sothea Chan", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Review Northstar Learning" }).click();
  await expect(page.getByText("Sothea Chan", { exact: true })).toBeVisible();
  await expect(page.getByText("Verified and active", { exact: true })).toBeVisible();
  await expect(page.getByText("Northstar Learning builds tools for local learning teams.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify and approve" })).toBeEnabled();

  await page.getByRole("button", { name: "Verify and approve" }).click();
  await expect(page.locator(".queue-notice")).toContainText("Northstar Learning is approved.");
  await expect(page.getByRole("button", { name: "Review Riverbank Studio" })).toBeVisible();
  expect(state.items.find(({ company }) => company.id === verifiedOwnerCompanyId)?.company.isVerified).toBe(true);
  expect(state.mutations[0]).toEqual(expect.objectContaining({
    path: `/admin/companies/${verifiedOwnerCompanyId}/approve`,
    authorization: expect.stringMatching(/^Bearer /),
  }));
  await expect(page.getByRole("button", { name: "Review Northstar Learning" })).toHaveCount(0);
})

test("admin cannot approve an unverified owner and must give a reason to reject", async ({ page, context }) => {
  const state = await seedAdminCompanyQueue(context);
  await page.goto("/admin/companies");
  await page.getByRole("button", { name: "Review Riverbank Studio" }).click();

  await expect(page.getByText("The owner must verify their email address before this company can be approved.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify and approve" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reject with reason" })).toBeDisabled();

  await page.getByLabel("Reason for rejection").fill("Please submit a working business website.");
  await page.getByRole("button", { name: "Reject with reason" }).click();

  await expect(page.getByText("Please submit a working business website.", { exact: true })).toBeVisible();
  await expect(page.locator(".inline-success")).toContainText("The company remains unverified");
  const mutation = state.mutations.at(-1);
  expect(mutation?.path).toBe(`/admin/companies/${unverifiedOwnerCompanyId}/reject`);
  expect(mutation?.body).toEqual({ reason: "Please submit a working business website." });
  expect(mutation?.authorization).toMatch(/^Bearer /);
  await page.getByRole("button", { name: "Back to company list" }).click();
  await expect(page.getByRole("heading", { name: "Unverified companies" })).toBeVisible();
})

test("admin company queue search filters server results", async ({ page, context }) => {
  const state = await seedAdminCompanyQueue(context);
  await page.goto("/admin/companies");
  await page.getByRole("searchbox", { name: "Search company applications" }).fill("Mekong");
  await page.getByRole("searchbox", { name: "Search company applications" }).press("Enter");

  await expect(page.getByRole("button", { name: "Review Mekong Learning Co" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Northstar Learning" })).toHaveCount(0);
  expect(state.searches).toContain("mekong");
})
