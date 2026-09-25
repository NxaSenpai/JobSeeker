import { expect, test, type BrowserContext } from "@playwright/test";

const storageKey = "jobseeker.auth.session";
const reportId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const reporterId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";

type Role = "USER" | "COMPANY" | "ADMIN";
function session(role: Role) {
  const user = {
    id: reporterId,
    firstName: "Dara",
    lastName: "Sok",
    email: `${role.toLowerCase()}@example.invalid`,
    role,
    emailVerified: true,
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    user,
    accessToken: `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.browser-fixture`,
  };
}

function makeReport(overrides: Record<string, unknown> = {}) {
  return {
    id: reportId,
    reporterUserId: reporterId,
    reporter: { id: reporterId, email: "user@example.invalid", role: "USER" },
    subjectType: "JOB",
    subjectId: "live-product-role",
    subject: {
      type: "JOB",
      id: "live-product-role",
      title: "Senior Product Designer",
      company: "Northstar Studio",
      location: "Phnom Penh",
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
    },
    category: "SCAM",
    description: "The employer asks candidates to pay a fee before applying.",
    status: "OPEN",
    reviewedBy: null,
    reviewedAt: null,
    resolutionNote: null,
    createdAt: "2026-09-24T04:00:00.000Z",
    updatedAt: "2026-09-24T04:00:00.000Z",
    ...overrides,
  };
}

function publicCompany() {
  return {
    id: companyId,
    slug: "figma",
    name: "Figma",
    industry: "Design software",
    companySize: "501–1,000 people",
    foundedYear: 2012,
    location: "London, United Kingdom",
    website: "https://figma.com",
    description: "Collaborative design tools for product teams.",
    logoUrl: null,
    isVerified: true,
    openJobs: 1,
  };
}

function publicJob() {
  return {
    id: "product-designer",
    title: "Senior Product Designer",
    company: "Figma",
    companyProfile: null,
    location: "London, United Kingdom",
    category: "Design",
    industry: "Design software",
    jobType: "FULL_TIME",
    workplaceType: "HYBRID",
    summary: "Shape thoughtful product experiences.",
    description: "Lead product design from discovery through delivery.",
    responsibilities: ["Lead design work."],
    requirements: ["Bring a portfolio."],
    skills: ["Product design", "Figma"],
    salaryMin: 85000,
    salaryMax: 110000,
    currency: "USD",
    salaryPeriod: "YEAR",
    postedAt: "2026-09-22T04:00:00.000Z",
    isDemo: true,
    deadline: null,
  };
}

async function seed(context: BrowserContext, role: Role) {
  const data = session(role);
  await context.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: storageKey, value: data },
  );
  return data;
}

async function mockReportApi(context: BrowserContext, role: Role) {
  const data = session(role);
  const state = {
    report: makeReport(),
    submissions: [] as Record<string, unknown>[],
    lastDecision: "",
    lastDecisionNote: "",
    rejectSampleTarget: false,
  };
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const reply = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (method === "OPTIONS") return reply({});
    if (path === "/auth/me") return reply({ user: data.user });
    if (path === "/account/profile")
      return reply({ user: data.user, profile: null });
    if (path === "/notifications/unread-count") return reply({ count: 0 });
    if (path === "/jobs/product-designer") return reply(publicJob());
    if (path === "/jobs/product-designer/similar") return reply({ jobs: [] });
    if (path === "/companies/figma/jobs")
      return reply({ company: publicCompany(), jobs: [], total: 1, page: 1, limit: 20 });
    if (path === "/reports" && method === "POST") {
      if (state.rejectSampleTarget)
        return reply({ message: "The reported item was not found." }, 404);
      const input = request.postDataJSON() as Record<string, unknown>;
      state.submissions.push(input);
      state.report = { ...state.report, ...input, status: "OPEN" };
      return reply({ report: state.report });
    }
    if (path === "/reports/me" && method === "GET") {
      return reply({ reports: [state.report], total: 1, page: 1, limit: 20 });
    }
    if (path === "/admin/reports" && method === "GET") {
      const active =
        state.report.status === "OPEN" || state.report.status === "IN_REVIEW";
      const reports = active ? [state.report] : [];
      return reply({ reports, total: reports.length, page: 1, limit: 20 });
    }
    if (path === `/admin/reports/${reportId}` && method === "GET")
      return reply({ report: state.report });
    if (
      path === `/admin/reports/${reportId}/start-review` &&
      method === "PATCH"
    ) {
      state.report = {
        ...state.report,
        status: "IN_REVIEW",
        reviewedBy: { id: reporterId, email: data.user.email },
        reviewedAt: new Date().toISOString(),
      };
      return reply({ report: state.report });
    }
    if (path === `/admin/reports/${reportId}/resolve` && method === "PATCH") {
      const body = request.postDataJSON() as { note: string };
      state.lastDecision = "RESOLVED";
      state.lastDecisionNote = body.note;
      state.report = {
        ...state.report,
        status: "RESOLVED",
        resolutionNote: body.note,
        reviewedBy: { id: reporterId, email: data.user.email },
        reviewedAt: new Date().toISOString(),
      };
      return reply({ report: state.report });
    }
    if (path === `/admin/reports/${reportId}/dismiss` && method === "PATCH") {
      const body = request.postDataJSON() as { note: string };
      state.lastDecision = "DISMISSED";
      state.lastDecisionNote = body.note;
      state.report = {
        ...state.report,
        status: "DISMISSED",
        resolutionNote: body.note,
        reviewedBy: { id: reporterId, email: data.user.email },
        reviewedAt: new Date().toISOString(),
      };
      return reply({ report: state.report });
    }
    return reply({ message: `Unexpected endpoint: ${method} ${path}` }, 404);
  });
  return state;
}

test("a signed-in user can report a job and follow the report from their account", async ({
  page,
  context,
}) => {
  const state = await mockReportApi(context, "USER");
  await seed(context, "USER");
  await page.goto("/jobs/product-designer");

  await page.getByRole("button", { name: "Report this job" }).click();
  await expect(
    page.getByRole("dialog", { name: /Report Senior Product Designer/ }),
  ).toBeVisible();
  await page.getByLabel("Reason for report").selectOption("SCAM");
  await page
    .getByLabel("What should our team know?")
    .fill("The employer asks candidates to pay a fee before applying.");
  await page.getByRole("button", { name: "Submit report" }).click();

  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Report submitted",
  );
  expect(state.submissions).toEqual([
    {
      subjectType: "JOB",
      subjectId: "product-designer",
      category: "SCAM",
      description: "The employer asks candidates to pay a fee before applying.",
    },
  ]);
  await page.getByRole("link", { name: "View my reports" }).click();
  await expect(page).toHaveURL("/reports");
  await expect(
    page.getByRole("heading", { name: "Your reports" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The employer asks candidates to pay a fee before applying.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("company profile report action submits the company target type", async ({
  page,
  context,
}) => {
  const state = await mockReportApi(context, "USER");
  await seed(context, "USER");
  await page.goto("/companies/figma");

  await page.getByRole("button", { name: "Report this company" }).click();
  await page
    .getByLabel("What should our team know?")
    .fill("The company profile includes misleading contact information.");
  await page.getByRole("button", { name: "Submit report" }).click();

  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Report submitted",
  );
  expect(state.submissions[0]).toMatchObject({
    subjectType: "COMPANY",
    subjectId: companyId,
  });
});

test("sample or stale targets show a clear explanation instead of a false success", async ({
  page,
  context,
}) => {
  const state = await mockReportApi(context, "USER");
  state.rejectSampleTarget = true;
  await seed(context, "USER");
  await page.goto("/jobs/product-designer");

  await page.getByRole("button", { name: "Report this job" }).click();
  await page
    .getByLabel("What should our team know?")
    .fill("This sample listing includes an incorrect payment request.");
  await page.getByRole("button", { name: "Submit report" }).click();

  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "sample item or is no longer available",
  );
  expect(state.submissions).toHaveLength(0);
});

test("an admin can inspect, start review, and resolve a report with a decision note", async ({
  page,
  context,
}) => {
  const state = await mockReportApi(context, "ADMIN");
  await seed(context, "ADMIN");
  await page.goto("/admin/reports");

  const reportRow = page.getByRole("button", {
    name: "Review report about Senior Product Designer",
  });
  await expect(reportRow).toBeVisible();
  await reportRow.click();
  await expect(page.locator("#report-detail-heading")).toHaveText(
    "Senior Product Designer",
  );
  await expect(
    page
      .locator("section[aria-labelledby='report-detail-heading']")
      .getByText("The employer asks candidates to pay a fee before applying.", {
        exact: true,
      }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(
    page
      .locator("section[aria-labelledby='report-detail-heading']")
      .getByText("In review", { exact: true }),
  ).toBeVisible();

  await page
    .getByLabel(/Decision note/)
    .fill("Verified the payment request and hid the listing.");
  await page.getByRole("button", { name: "Resolve report" }).click();
  await expect(
    page.getByText("Report resolved and recorded in the audit log.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(state.lastDecision).toBe("RESOLVED");
  expect(state.lastDecisionNote).toBe(
    "Verified the payment request and hid the listing.",
  );
  await expect(page.getByText("No reports match this view")).toBeVisible();
});
