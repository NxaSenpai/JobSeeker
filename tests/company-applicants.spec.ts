import { expect, test, type BrowserContext } from '@playwright/test'

const authStorageKey = 'jobseeker.auth.session'
const applicationId = '33333333-3333-4333-8333-333333333333'
type ApplicantStatus = 'APPLIED' | 'UNDER_REVIEW' | 'SHORTLISTED'

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

async function mockCompanyApplicants(context: BrowserContext) {
  const session = companySession()
  const state = {
    status: 'APPLIED' as ApplicantStatus,
    updates: [] as ApplicantStatus[],
    authorizedMutations: [] as string[],
    resumeAuthorized: false,
  }
  const candidate = {
    firstName: 'Sophea',
    lastName: 'Chan',
    headline: 'Senior backend developer',
    location: 'Phnom Penh',
    skills: ['NestJS', 'PostgreSQL'],
  }
  const job = {
    id: 'role-backend-engineer',
    title: 'Backend Engineer',
    company: 'Northstar Labs',
    location: 'Phnom Penh',
  }
  const appliedAt = '2026-09-23T08:30:00.000Z'
  const listItem = () => ({
    id: applicationId,
    job,
    candidate,
    status: state.status,
    appliedAt,
    updatedAt: appliedAt,
  })
  const details = () => ({
    ...listItem(),
    candidate: {
      ...candidate,
      bio: 'I build secure, reliable services for teams and their customers.',
      websiteUrl: 'https://sophea.example.invalid',
      linkedinUrl: null,
      githubUrl: 'https://github.com/sophea-example',
      experience: [{
        company: 'Mekong Systems',
        position: 'Backend Engineer',
        employmentType: 'Full-time',
        startDate: '2022-02-01',
        current: true,
        description: 'Built APIs used by local delivery teams.',
      }],
      education: [{ school: 'Royal University of Phnom Penh', degree: 'BSc', fieldOfStudy: 'Computer Science', startDate: '2017-09-01', endDate: '2021-06-01' }],
      languages: [{ name: 'Khmer', proficiency: 'Native' }, { name: 'English', proficiency: 'Professional' }],
    },
    contact: { email: 'sophea@example.invalid', phone: '+855 12 345 678' },
    description: 'I am interested in building the next generation of hiring tools.',
    coverLetter: 'I have five years of experience designing and maintaining APIs.',
    portfolioUrl: 'https://portfolio.example.invalid',
    resume: {
      id: '44444444-4444-4444-8444-444444444444',
      fileName: 'Sophea-Chan-CV.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      downloadUrl: `/api/v1/company/applications/${applicationId}/resume`,
    },
    history: [{ status: state.status, at: appliedAt }],
  })

  await context.addInitScript(({ key, value }) => {
    sessionStorage.setItem(key, JSON.stringify(value))
  }, { key: authStorageKey, value: session })

  await context.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
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

    if (method === 'OPTIONS') return reply({})
    if (path === '/auth/me' && method === 'GET') return reply({ user: session.user })

    if (path === '/company/applications' && method === 'GET') {
      if (!request.headers().authorization) return reply({ message: 'Sign in required.' }, 401)
      const params = new URL(request.url()).searchParams
      const statusFilter = params.get('status')
      const search = (params.get('search') ?? '').toLowerCase()
      const matched = [listItem()].filter(item =>
        (!statusFilter || item.status === statusFilter) &&
        (!search || `${item.candidate.firstName} ${item.candidate.lastName} ${item.job.title} ${item.job.company}`.toLowerCase().includes(search)),
      )
      const page = Number(params.get('page') ?? 1)
      const limit = Number(params.get('limit') ?? 20)
      return reply({ applications: matched.slice((page - 1) * limit, page * limit), total: matched.length, page, limit })
    }

    if (path === `/company/applications/${applicationId}` && method === 'GET') {
      if (!request.headers().authorization) return reply({ message: 'Sign in required.' }, 401)
      return reply({ application: details() })
    }

    if (path === `/company/applications/${applicationId}/status` && method === 'PATCH') {
      if (!request.headers().authorization) return reply({ message: 'Sign in required.' }, 401)
      const nextStatus = request.postDataJSON().status as ApplicantStatus
      state.status = nextStatus
      state.updates.push(nextStatus)
      state.authorizedMutations.push(request.headers().authorization)
      return reply({ application: details() })
    }

    if (path === `/company/applications/${applicationId}/resume` && method === 'GET') {
      state.resumeAuthorized = Boolean(request.headers().authorization)
      if (!state.resumeAuthorized) return reply({ message: 'Sign in required.' }, 401)
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { ...headers, 'Content-Disposition': 'attachment; filename="Sophea-Chan-CV.pdf"' },
        body: Buffer.from('%PDF-1.4\nfixture resume\n%%EOF'),
      })
    }

    return reply({ message: `Unexpected endpoint: ${method} ${path}` }, 404)
  })

  return state
}

test('company applicant queue reads real applications, persists stage changes, and securely downloads the résumé', async ({ page, context }) => {
  const state = await mockCompanyApplicants(context)
  await page.goto('/company/applicants')

  const candidateRow = page.getByRole('button', { name: 'Review Sophea Chan' })
  await expect(candidateRow).toBeVisible()
  await expect(candidateRow).toContainText('Backend Engineer')
  await candidateRow.click()

  const dialog = page.getByRole('dialog', { name: 'Candidate application details' })
  await expect(dialog.getByText('I build secure, reliable services for teams and their customers.')).toBeVisible()
  await dialog.getByLabel('Application stage').selectOption('SHORTLISTED')
  await expect(dialog.locator('.status-feedback')).toHaveText('Application stage saved.')
  expect(state.status).toBe('SHORTLISTED')
  expect(state.updates).toEqual(['SHORTLISTED'])
  expect(state.authorizedMutations).toEqual([expect.stringMatching(/^Bearer /)])

  await dialog.getByRole('link', { name: "Open Sophea Chan's full profile" }).click()
  await expect(page.getByRole('heading', { name: 'Sophea Chan', exact: true })).toBeVisible()
  await expect(page.getByText('Mekong Systems', { exact: false })).toBeVisible()
  await page.getByLabel('Application stage').selectOption('UNDER_REVIEW')
  await expect(page.locator('.status-feedback')).toHaveText('Application stage saved.')
  expect(state.status).toBe('UNDER_REVIEW')
  expect(state.updates).toEqual(['SHORTLISTED', 'UNDER_REVIEW'])

  const resumeDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download résumé' }).click()
  expect((await resumeDownload).suggestedFilename()).toBe('Sophea-Chan-CV.pdf')
  expect(state.resumeAuthorized).toBe(true)
})

test('company dashboard applicant activity and counts come from the backend list', async ({ page, context }) => {
  await mockCompanyApplicants(context)
  await page.goto('/company/dashboard')

  const latestApplications = page.locator('.applicants-panel-table')
  await expect(latestApplications.getByText('Sophea Chan', { exact: true })).toBeVisible()
  await expect(latestApplications.getByText('Backend Engineer', { exact: true })).toBeVisible()
  await expect(page.locator('.summary-strip .summary-item').filter({ hasText: 'Applicants' }).locator('strong')).toHaveText('1')
})
