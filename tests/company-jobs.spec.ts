import { expect, test, type BrowserContext } from '@playwright/test'

const authStorageKey = 'jobseeker.auth.session'

type ApiJob = {
  id: string
  title: string
  team: string
  location: string
  jobType: string
  workplaceType: string
  description: string
  status: 'PUBLISHED' | 'DRAFT' | 'CLOSED' | 'ARCHIVED'
  applicantCount: number
  createdAt: string
  postedAt: string
}

function companySession() {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    firstName: 'Dara',
    lastName: 'Sok',
    email: 'company@example.invalid',
    role: 'COMPANY',
    emailVerified: true,
    companyName: 'Northstar Labs',
  }
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'HS256' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.browser-fixture`
  return { user, accessToken }
}

function makeJob(overrides: Partial<ApiJob> = {}): ApiJob {
  const createdAt = '2026-09-20T10:00:00.000Z'
  return {
    id: 'backend-engineer',
    title: 'Backend Engineer',
    team: 'Engineering',
    location: 'Phnom Penh',
    jobType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    description: 'Build secure APIs used by local teams.',
    status: 'PUBLISHED',
    applicantCount: 4,
    createdAt,
    postedAt: createdAt,
    ...overrides,
  }
}

async function mockCompanyJobs(context: BrowserContext, verified = true) {
  const session = companySession()
  const state = {
    jobs: [
      makeJob(),
      makeJob({
        id: 'support-specialist',
        title: 'Support Specialist',
        team: 'Customer Experience',
        workplaceType: 'ONSITE',
        status: 'DRAFT',
        applicantCount: 0,
      }),
    ],
    verified,
    createdBodies: [] as Array<Record<string, unknown>>,
    authorizedRequests: [] as string[],
    listPages: [] as number[],
  }

  await context.addInitScript(({ key, value }) => {
    sessionStorage.setItem(key, JSON.stringify(value))
  }, { key: authStorageKey, value: session })

  await context.route('**/api/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    }
    const reply = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      headers,
      body: JSON.stringify(body),
    })
    const authorization = request.headers().authorization

    if (method === 'OPTIONS') return reply({})
    if (path === '/auth/me' && method === 'GET') return reply({ user: session.user })

    if (path === '/company/jobs' && method === 'GET') {
      if (!authorization) return reply({ message: 'Sign in required.' }, 401)
      state.authorizedRequests.push(authorization)
      const page = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? 20)
      state.listPages.push(page)
      const jobs = state.jobs.slice((page - 1) * limit, page * limit)
      return reply({ jobs, total: state.jobs.length, page, limit })
    }

    if (path === '/company/jobs' && method === 'POST') {
      if (!authorization) return reply({ message: 'Sign in required.' }, 401)
      state.authorizedRequests.push(authorization)
      const body = request.postDataJSON() as Record<string, unknown>
      state.createdBodies.push(body)
      const createdAt = '2026-09-26T09:00:00.000Z'
      const job = makeJob({
        id: 'senior-qa-engineer',
        title: String(body.title),
        team: String(body.team ?? ''),
        location: String(body.location),
        description: String(body.description),
        jobType: String(body.jobType),
        workplaceType: String(body.workplaceType),
        status: 'DRAFT',
        applicantCount: 0,
        createdAt,
        postedAt: createdAt,
      })
      state.jobs.unshift(job)
      return reply({ job }, 201)
    }

    const statusRoute = path.match(/^\/company\/jobs\/([^/]+)\/(publish|unpublish|close)$/)
    if (statusRoute && method === 'PATCH') {
      if (!authorization) return reply({ message: 'Sign in required.' }, 401)
      state.authorizedRequests.push(authorization)
      const [, id, action] = statusRoute
      const job = state.jobs.find(item => item.id === decodeURIComponent(id))
      if (!job) return reply({ message: 'Job was not found.' }, 404)
      if (action === 'publish' && !state.verified) {
        return reply({ message: 'Your company profile must be approved before you can publish jobs.' }, 409)
      }
      if (action === 'publish' && !job.description.trim()) {
        return reply({ message: 'Add a job title, location, and description before publishing.' }, 400)
      }
      job.status = action === 'publish' ? 'PUBLISHED' : action === 'close' ? 'CLOSED' : 'DRAFT'
      return reply({ job })
    }

    if (path === '/company/applications' && method === 'GET') {
      if (!authorization) return reply({ message: 'Sign in required.' }, 401)
      state.authorizedRequests.push(authorization)
      const page = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? 20)
      return reply({ applications: [], total: 0, page, limit })
    }

    return reply({ message: `Unexpected endpoint: ${method} ${path}` }, 404)
  })

  return state
}

test('company jobs and dashboard read authenticated server postings and applicant counts', async ({ page, context }) => {
  const state = await mockCompanyJobs(context)
  await page.goto('/company/jobs')

  const table = page.locator('.jobs-table')
  await expect(table.getByText('Backend Engineer', { exact: true })).toBeVisible()
  await expect(table.locator('tbody tr').first().locator('td').nth(2)).toHaveText('4')
  await expect(table.locator('tbody tr').first().locator('td').nth(3)).toHaveText('—')
  await expect(page.getByRole('button', { name: 'All roles 2' })).toBeVisible()
  expect(state.authorizedRequests.every(value => value.startsWith('Bearer '))).toBe(true)

  await page.getByRole('button', { name: 'Close role: Backend Engineer' }).click()
  await expect(page.locator('.jobs-table').getByText('Closed', { exact: true })).toBeVisible()
  expect(state.jobs.find(job => job.id === 'backend-engineer')?.status).toBe('CLOSED')

  await page.goto('/company/dashboard')
  await expect(page).toHaveURL('/company/dashboard')
  await expect(page.locator('.summary-strip .summary-item').filter({ hasText: 'Live roles' }).locator('strong')).toHaveText('0')
  await expect(page.locator('.role-watch-panel')).toContainText('No open roles.')
})

test('company job list combines all API pages before showing status totals', async ({ page, context }) => {
  const state = await mockCompanyJobs(context)
  state.jobs = Array.from({ length: 101 }, (_, index) => makeJob({
    id: `qa-role-${index}`,
    title: `QA role ${index}`,
    status: 'DRAFT',
    applicantCount: index,
  }))

  await page.goto('/company/jobs')

  await expect(page.getByRole('button', { name: 'All roles 101' })).toBeVisible()
  await expect(page.locator('.jobs-table tbody tr')).toHaveCount(101)
  expect(state.listPages).toEqual(expect.arrayContaining([1, 2]))
})

test('company can save a complete draft and publish it through the backend', async ({ page, context }) => {
  const state = await mockCompanyJobs(context)
  await page.goto('/company/jobs')
  await page.getByRole('button', { name: 'Post a job' }).click()

  const dialog = page.getByRole('dialog', { name: 'Create a job draft' })
  await dialog.getByLabel('Job title').fill('Senior QA Engineer')
  await dialog.getByLabel('Team').fill('Quality Engineering')
  await dialog.getByLabel('Location').fill('Phnom Penh')
  await dialog.getByLabel('Employment type').selectOption('CONTRACT')
  await dialog.getByLabel('Workplace').selectOption('HYBRID')
  await dialog.getByLabel('Job description').fill('Own automation strategy and improve release confidence.')
  await dialog.getByRole('button', { name: 'Save draft' }).click()

  const draftRow = page.locator('.jobs-table tbody tr').filter({ hasText: 'Senior QA Engineer' })
  await expect(draftRow).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Draft saved to your company workspace.')
  expect(state.createdBodies).toEqual([expect.objectContaining({
    title: 'Senior QA Engineer',
    team: 'Quality Engineering',
    jobType: 'CONTRACT',
    workplaceType: 'HYBRID',
    description: 'Own automation strategy and improve release confidence.',
  })])

  await page.getByRole('button', { name: 'Publish: Senior QA Engineer' }).click()
  await page.getByRole('button', { name: 'Published 2' }).click()
  const publishedRow = page.locator('.jobs-table tbody tr').filter({ hasText: 'Senior QA Engineer' })
  await expect(publishedRow.getByText('Published', { exact: true })).toBeVisible()
  expect(state.jobs.find(job => job.id === 'senior-qa-engineer')?.status).toBe('PUBLISHED')
  expect(state.authorizedRequests.every(value => value.startsWith('Bearer '))).toBe(true)

  await page.goto('/company/dashboard')
  await expect(page.locator('.summary-strip .summary-item').filter({ hasText: 'Live roles' }).locator('strong')).toHaveText('2')
  await expect(page.locator('.role-watch-panel')).toContainText('Senior QA Engineer')
})

test('backend publish rules are shown to the company without changing the draft', async ({ page, context }) => {
  const state = await mockCompanyJobs(context, false)
  await page.goto('/company/jobs')
  await page.getByRole('button', { name: 'Publish: Support Specialist' }).click()

  await expect(page.getByRole('alert')).toContainText('must be approved before you can publish')
  expect(state.jobs.find(job => job.id === 'support-specialist')?.status).toBe('DRAFT')
})
