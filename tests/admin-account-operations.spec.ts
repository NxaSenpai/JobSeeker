import { expect, test, type BrowserContext } from '@playwright/test'

const storageKey = 'jobseeker.auth.session'
const adminId = '11111111-1111-4111-8111-111111111111'
const memberId = '22222222-2222-4222-8222-222222222222'

function adminSession() {
  const user = {
    id: adminId,
    firstName: 'Dara',
    lastName: 'Sok',
    email: 'admin@example.test',
    role: 'ADMIN',
    emailVerified: true,
  }
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return {
    user,
    accessToken: `${encode({ alg: 'HS256' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.browser-fixture`,
  }
}

function userRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: memberId,
    email: 'member@example.test',
    role: 'USER',
    firstName: 'Sophea',
    lastName: 'Chea',
    companyName: null,
    contactName: null,
    emailVerified: true,
    suspendedAt: null,
    suspensionReason: null,
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
    ...overrides,
  }
}

function jobRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-remote-1',
    title: 'Product designer',
    company: 'Tonle Digital',
    location: 'Phnom Penh, Cambodia',
    category: 'Design',
    industry: 'Technology',
    jobType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    summary: 'Design practical tools for local businesses.',
    description: 'Work with product and engineering to improve hiring workflows.',
    responsibilities: ['Create prototypes'],
    requirements: ['Portfolio'],
    benefits: [],
    skills: ['Figma'],
    moderationStatus: 'PENDING',
    moderationNote: null,
    status: 'PUBLISHED',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    companyProfile: { id: 'company-1', name: 'Tonle Digital', isVerified: true },
    ...overrides,
  }
}

async function seedAdmin(context: BrowserContext) {
  const session = adminSession()
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: storageKey, value: session })
}

async function mockApi(context: BrowserContext, handler: (path: string, method: string, request: import('@playwright/test').Request) => Promise<unknown> | unknown) {
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    }
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 200, headers, contentType: 'application/json', body: '{}' })
      return
    }
    const payload = await handler(path, method, request)
    await route.fulfill({
      status: payload && typeof payload === 'object' && 'status' in payload ? Number((payload as { status: number }).status) : 200,
      headers,
      contentType: 'application/json',
      body: JSON.stringify(payload && typeof payload === 'object' && 'body' in payload ? (payload as { body: unknown }).body : payload),
    })
  })
}

test('admin can view a minimal protected profile and independently set the sidebar layout', async ({ page, context }) => {
  await seedAdmin(context)
  const requests: string[] = []
  await mockApi(context, (path, method, request) => {
    requests.push(`${method} ${path}`)
    if (path === '/auth/me') return { user: adminSession().user }
    if (path === '/admin/profile') return { profile: {
      id: adminId,
      email: 'admin@example.test',
      role: 'ADMIN',
      emailVerified: true,
      firstName: 'Dara',
      lastName: 'Sok',
      createdAt: '2026-04-05T09:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
    } }
    return { message: `Unexpected endpoint: ${method} ${path}` }
  })

  await page.goto('/admin/profile')
  await expect(page.getByRole('heading', { name: 'Your admin profile' })).toBeVisible()
  await expect(page.getByText('admin@example.test').first()).toBeVisible()
  await expect(page.getByText('Administrator', { exact: true }).first()).toBeVisible()
  expect(requests).toContain('GET /admin/profile')
  await expect(page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'Verification' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Admin account navigation' }).getByRole('link', { name: 'Settings' })).toBeVisible()

  await page.goto('/admin/settings')
  await page.getByRole('radio', { name: /Docked/ }).check()
  await expect(page.locator('.admin-shell')).toHaveClass(/sidebar-is-collapsed/)
  expect(await page.evaluate(() => localStorage.getItem('jobseeker.sidebar.docked.admin'))).toBe('true')
  await expect(page.getByRole('heading', { name: 'Workspace settings' })).toBeVisible()
})

test('admin can inspect an account and suspend it with a required reason', async ({ page, context }) => {
  await seedAdmin(context)
  const state = { user: userRecord(), mutations: [] as Array<{ path: string; body: unknown }> }
  await mockApi(context, (path, method, request) => {
    if (path === '/auth/me') return { user: adminSession().user }
    if (path === '/admin/users' && method === 'GET') return { users: [state.user], total: 1, page: 1, limit: 20 }
    if (path === `/admin/users/${memberId}` && method === 'GET') return { user: state.user }
    if (path === `/admin/users/${memberId}/suspend` && method === 'PATCH') {
      const body = request.postDataJSON() as { reason: string }
      state.mutations.push({ path, body })
      state.user = userRecord({ suspendedAt: '2026-09-30T12:00:00.000Z', suspensionReason: body.reason })
      return { user: state.user }
    }
    return { message: `Unexpected endpoint: ${method} ${path}` }
  })

  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await page.getByRole('button', { name: 'View details' }).click()
  await expect(page.getByText('Verified', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Suspend account' }).click()
  await page.getByLabel('Reason for suspension').fill('Repeated fraudulent applications')
  await page.getByRole('button', { name: 'Confirm suspension' }).click()

  await expect(page.getByRole('status')).toContainText('Sophea Chea has been suspended.')
  await expect(page.locator('.account-list').getByText('Suspended', { exact: true })).toBeVisible()
  expect(state.mutations).toEqual([{ path: `/admin/users/${memberId}/suspend`, body: { reason: 'Repeated fraudulent applications' } }])
})

test('admin can review and reject a published job with an audited reason', async ({ page, context }) => {
  await seedAdmin(context)
  const state = { job: jobRecord(), mutations: [] as Array<{ path: string; body: unknown }> }
  await mockApi(context, (path, method, request) => {
    if (path === '/auth/me') return { user: adminSession().user }
    if (path === '/admin/jobs' && method === 'GET') {
      const matches = state.job.moderationStatus === new URL(request.url()).searchParams.get('moderationStatus')
      return { jobs: matches ? [state.job] : [], total: matches ? 1 : 0, page: 1, limit: 20 }
    }
    if (path === '/admin/jobs/job-remote-1/reject' && method === 'PATCH') {
      const body = request.postDataJSON() as { reason: string }
      state.mutations.push({ path, body })
      state.job = jobRecord({ moderationStatus: 'REJECTED', moderationNote: body.reason })
      return { job: state.job }
    }
    return { message: `Unexpected endpoint: ${method} ${path}` }
  })

  await page.goto('/admin/jobs')
  await expect(page.getByRole('heading', { name: 'Job posts' })).toBeVisible()
  await expect(page.getByText('Product designer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Review post' }).click()
  await expect(page.getByText('Design practical tools for local businesses.')).toBeVisible()
  await page.getByRole('button', { name: 'Reject with reason' }).click()
  await page.getByLabel('Reason for rejection').fill('Please clarify the role location and work arrangement.')
  await page.getByRole('button', { name: 'Confirm reject' }).click()

  await expect(page.getByRole('status')).toContainText('“Product designer” was rejected.')
  expect(state.mutations).toEqual([{
    path: '/admin/jobs/job-remote-1/reject',
    body: { reason: 'Please clarify the role location and work arrangement.' },
  }])
})

test('admin can restore a hidden job and send the action to the protected moderation endpoint', async ({ page, context }) => {
  await seedAdmin(context)
  const state = { job: jobRecord({ moderationStatus: 'HIDDEN', moderationNote: 'Updated listing reviewed.' }), mutations: [] as string[] }
  await mockApi(context, (path, method, request) => {
    if (path === '/auth/me') return { user: adminSession().user }
    if (path === '/admin/jobs' && method === 'GET') {
      const matches = state.job.moderationStatus === new URL(request.url()).searchParams.get('moderationStatus')
      return { jobs: matches ? [state.job] : [], total: matches ? 1 : 0, page: 1, limit: 20 }
    }
    if (path === '/admin/jobs/job-remote-1/restore' && method === 'PATCH') {
      state.mutations.push(`${method} ${path}`)
      state.job = jobRecord({ moderationStatus: 'APPROVED', moderationNote: null })
      return { job: state.job }
    }
    return { message: `Unexpected endpoint: ${method} ${path}` }
  })

  await page.goto('/admin/jobs')
  await page.getByLabel('Review').selectOption('HIDDEN')
  await expect(page.getByText('Product designer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Review post' }).click()
  await page.getByRole('button', { name: 'Restore listing' }).click()

  await expect(page.getByRole('status')).toContainText('“Product designer” was restored.')
  expect(state.mutations).toEqual(['PATCH /admin/jobs/job-remote-1/restore'])
})

test('admin can inspect searchable moderation audit events', async ({ page, context }) => {
  await seedAdmin(context)
  const searches: string[] = []
  await mockApi(context, (path, method, request) => {
    if (path === '/auth/me') return { user: adminSession().user }
    if (path === '/admin/audit-logs' && method === 'GET') {
      const url = new URL(request.url())
      searches.push(url.searchParams.get('search') ?? '')
      return { auditLogs: [{
        id: 'audit-1',
        actor: { id: adminId, email: 'admin@example.test' },
        action: 'JOB_HIDDEN',
        subjectType: 'JOB',
        subjectId: 'job-remote-1',
        metadata: { reason: 'Policy review required', previousStatus: 'PENDING' },
        createdAt: '2026-09-29T09:30:00.000Z',
      }], total: 1, page: Number(url.searchParams.get('page') ?? 1), limit: 20 }
    }
    return { message: `Unexpected endpoint: ${method} ${path}` }
  })

  await page.goto('/admin/audit')
  await expect(page.getByRole('heading', { name: 'Admin activity' })).toBeVisible()
  await expect(page.getByText('job hidden', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /View event details/ }).click()
  await expect(page.getByText(/Policy review required/)).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search audit events' }).fill('job-remote-1')
  await page.getByRole('searchbox', { name: 'Search audit events' }).press('Enter')
  await expect.poll(() => searches.includes('job-remote-1')).toBe(true)
})
