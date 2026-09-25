import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const storageKey = 'jobseeker.auth.session'
type Role = 'USER' | 'COMPANY' | 'ADMIN'
function session(role: Role = 'USER', seconds = 3600) {
  const user = { id: '11111111-1111-4111-8111-111111111111', firstName: 'Dara', lastName: 'Sok', email: role.toLowerCase() + '@example.invalid', role, emailVerified: true, headline: '', location: '', bio: '' }
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return { user, accessToken: encode({ alg: 'HS256' }) + '.' + encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + seconds }) + '.browser-fixture' }
}
const accountDemoJobs = [
  { id: 'product-designer', title: 'Senior Product Designer', company: 'Figma', location: 'London, United Kingdom', category: 'Design', workplaceType: 'HYBRID', jobType: 'FULL_TIME', skills: ['Product design', 'Figma', 'Design systems'], salaryMin: 85000, salaryMax: 110000 },
  { id: 'growth-marketer', title: 'Growth Marketing Manager', company: 'Spotify', location: 'Remote — Europe', category: 'Marketing', workplaceType: 'REMOTE', jobType: 'FULL_TIME', skills: ['Growth strategy', 'Lifecycle', 'Analytics'], salaryMin: 70000, salaryMax: 92000 },
  { id: 'full-stack-engineer', title: 'Full-Stack Engineer', company: 'Slack', location: 'Dublin, Ireland', category: 'Technology', workplaceType: 'HYBRID', jobType: 'FULL_TIME', skills: ['TypeScript', 'Node.js', 'React'], salaryMin: 78000, salaryMax: 105000 },
  { id: 'content-strategist', title: 'Content Strategist', company: 'WordPress', location: 'Remote — Global', category: 'Marketing', workplaceType: 'REMOTE', jobType: 'CONTRACT', skills: ['Content strategy', 'SEO', 'Editorial'], salaryMin: 55000, salaryMax: 70000 },
  { id: 'data-analyst', title: 'Product Data Analyst', company: 'App Store', location: 'Singapore', category: 'Analyst', workplaceType: 'ONSITE', jobType: 'FULL_TIME', skills: ['SQL', 'Experimentation', 'Tableau'], salaryMin: 60000, salaryMax: 82000 },
  { id: 'community-manager', title: 'Community Manager', company: 'Telegram', location: 'Phnom Penh, Cambodia', category: 'Marketing', workplaceType: 'HYBRID', jobType: 'FULL_TIME', skills: ['Community', 'Social media', 'Events'], salaryMin: 28000, salaryMax: 40000 },
  { id: 'brand-designer', title: 'Brand Designer', company: 'Pinterest', location: 'San Francisco, United States', category: 'Design', workplaceType: 'HYBRID', jobType: 'FULL_TIME', skills: ['Brand systems', 'Art direction', 'Motion'], salaryMin: 90000, salaryMax: 120000 },
].map(job => ({
  ...job,
  companyProfile: null,
  industry: job.category,
  summary: `Join ${job.company} as a ${job.title}.`,
  description: `Build thoughtful work with the ${job.company} team.`,
  responsibilities: ['Collaborate with the team.'],
  requirements: ['Bring relevant experience.'],
  currency: 'USD',
  salaryPeriod: 'YEAR',
  postedAt: '2026-09-22T04:00:00.000Z',
  isDemo: true,
  deadline: null,
}))
const accountDemoCompany = {
  id: 'figma', slug: 'figma', name: 'Figma', industry: 'Design software', companySize: '501–1,000 people',
  foundedYear: 2012, location: 'London, United Kingdom', website: 'https://figma.com',
  description: 'Figma makes collaborative design accessible to everyone.', logoUrl: null, isVerified: true, openJobs: 1,
}
async function mockAccount(context: BrowserContext, role: Role = 'USER') {
  const data = session(role)
  const state = { data, profile: { skills: [] as string[] }, saved: new Set<string>(), drafts: new Map<string, { jobId: string; coverLetter: string; resumeUrl: string; updatedAt: string }>(), jobOverrides: new Map<string, (typeof accountDemoJobs)[number]>(), meStatus: 200, activityStatus: 200 }
  await context.route('**/api/v1/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/api/v1', '')
    const method = req.method()
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
    if (method === 'OPTIONS') return reply({})
    if (path === '/auth/login') {
      if (req.postDataJSON().password === 'incorrect') return reply({ message: 'Invalid email or password.' }, 401)
      return reply(data)
    }
    if (path === '/auth/me') return reply(state.meStatus === 200 ? { user: data.user } : { message: 'Account service unavailable.' }, state.meStatus)
    if (path === '/jobs' && method === 'GET') {
      const params = new URL(req.url()).searchParams
      const search = params.get('search')?.toLowerCase() ?? ''
      const workplace = params.get('workplaceType')
      const jobType = params.get('jobType')
      const category = params.get('category')
      const matches = accountDemoJobs.filter(job =>
        (!search || `${job.title} ${job.company} ${job.location} ${job.category} ${job.skills.join(' ')}`.toLowerCase().includes(search)) &&
        (!workplace || job.workplaceType === workplace) &&
        (!jobType || job.jobType === jobType) &&
        (!category || job.category.toLowerCase() === category.toLowerCase()),
      )
      const page = Number(params.get('page') ?? 1); const limit = Number(params.get('limit') ?? 12)
      return reply({ jobs: matches.slice((page - 1) * limit, page * limit), total: matches.length, page, limit })
    }
    if (path === '/jobs/featured' && method === 'GET') return reply({ jobs: accountDemoJobs.slice(0, 4) })
    if (path === '/jobs/categories' && method === 'GET') {
      const counts = new Map<string, number>()
      for (const job of accountDemoJobs) counts.set(job.category, (counts.get(job.category) ?? 0) + 1)
      return reply({ categories: [...counts].map(([name, count]) => ({ name, count })) })
    }
    if (path === '/jobs/product-designer/similar' && method === 'GET') return reply({ jobs: accountDemoJobs.filter(job => job.id !== 'product-designer' && job.category === 'Design') })
    if (path.startsWith('/jobs/') && method === 'GET') {
      const id = path.split('/').at(-1)!
      const record = state.jobOverrides.get(id) ?? accountDemoJobs.find(job => job.id === id)
      return record ? reply(record) : reply({ message: 'This job is no longer available.' }, 404)
    }
    if (path === '/companies/figma/jobs' && method === 'GET') return reply({ company: accountDemoCompany, jobs: accountDemoJobs.filter(job => job.company === 'Figma'), total: 1, page: 1, limit: 20 })
    if (path === '/applications/me') return reply({ applications: [], total: 0 })
    if (path === '/notifications') return reply({ notifications: [], total: 0 })
    if (path === '/notifications/unread-count') return reply({ count: 0 })
    if (path.startsWith('/account/')) {
      if (!req.headers().authorization) return reply({ message: 'Sign in required.' }, 401)
      if (state.activityStatus !== 200) return reply({ message: 'Please try again shortly.' }, state.activityStatus)
      if (path === '/account/profile' && method === 'GET') return reply({ user: data.user, profile: { ...data.user, skills: state.profile.skills } })
      if (path === '/account/profile' && method === 'PATCH') {
        const patch = req.postDataJSON() as Record<string, unknown>
        if (Array.isArray(patch.skills)) state.profile.skills = patch.skills as string[]
        Object.assign(data.user, patch)
        return reply({ user: data.user, profile: { ...data.user, skills: state.profile.skills } })
      }
      if (path === '/account/resumes' && method === 'GET') return reply({ resumes: [] })
      if (path === '/account/saved-jobs') return reply({ jobs: [...state.saved].map(jobId => ({ jobId })) })
      if (path.startsWith('/account/saved-jobs/')) {
        const id = path.split('/').at(-1)!
        if (method === 'PUT') state.saved.add(id)
        else state.saved.delete(id)
        return reply({ saved: method === 'PUT' })
      }
      if (path === '/account/application-drafts') return reply({ drafts: [...state.drafts.values()] })
      if (path.startsWith('/account/application-drafts/')) {
        const id = path.split('/').at(-1)!
        if (method === 'DELETE') { state.drafts.delete(id); return reply({ removed: true }) }
        const draft = { jobId: id, ...req.postDataJSON(), updatedAt: new Date().toISOString() }
        state.drafts.set(id, draft); return reply({ draft })
      }
    }
    return reply({ message: 'Unexpected endpoint: ' + method + ' ' + path }, 404)
  })
  return state
}
async function login(page: Page, remember = false) {
  await page.getByLabel('Email address', { exact: true }).fill('user@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('Test-password-only1!')
  if (remember) await page.getByLabel('Remember me').check()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}
async function openMenu(page: Page) {
  await page.getByRole('button', { name: 'Open account menu' }).click()
  return page.getByRole('menu', { name: 'Your account' })
}
async function seed(context: BrowserContext, data = session()) {
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: storageKey, value: data })
}

test('user login lands on the personalized home and header follows public navigation', async ({ page, context }) => {
  await mockAccount(context)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/login')
  await login(page)
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your next chapter')
  for (const path of ['/', '/jobs', '/companies', '/companies/figma', '/jobs/product-designer', '/about', '/contact']) {
    await page.goto(path)
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible()
    await expect(page.locator('header').getByRole('link', { name: 'Sign In', exact: true })).toHaveCount(0)
    await expect(page.locator('header').getByRole('link', { name: 'Create account' })).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('account dropdown supports keyboard, outside click, and mobile layout', async ({ page, context }, testInfo) => {
  const { data } = await mockAccount(context)
  await seed(context, data)
  await page.goto('/')
  const menu = await openMenu(page)
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'View profile' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Saved jobs' })).toBeFocused()
  await page.keyboard.press('End')
  await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeFocused()
  await openMenu(page)
  // Click the page margin, outside the dropdown even on a narrow viewport.
  await page.mouse.click(8, 200)
  await expect(menu).toBeHidden()
  await openMenu(page)
  const bounds = await menu.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('account-menu.png') })
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    await expect(menu).toBeHidden()
    await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: 'Find Jobs' }).click()
    await expect(page).toHaveURL('/jobs')
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible()
  }
})

test('saved jobs persist across navigation and reload and can be removed', async ({ page, context }) => {
  const state = await mockAccount(context)
  await page.goto('/login'); await login(page)
  await expect(page).toHaveURL('/')
  await page.goto('/jobs')
  const card = page.locator('article').filter({ has: page.getByRole('link', { name: 'Senior Product Designer', exact: true }) })
  await card.getByRole('button', { name: 'Save job', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Remove saved job' })).toHaveAttribute('aria-pressed', 'true')
  await (await openMenu(page)).getByRole('menuitem', { name: 'Saved jobs' }).click()
  await expect(page).toHaveURL('/saved-jobs')
  await page.reload()
  await expect(page.getByRole('link', { name: 'Senior Product Designer', exact: true })).toBeVisible()
  expect(state.saved.has('product-designer')).toBe(true)
  await page.getByRole('button', { name: 'Remove saved job' }).click()
  await expect(page.getByRole('heading', { name: 'Your shortlist starts here' })).toBeVisible()
  expect(state.saved.size).toBe(0)
})

test('saved-job and draft listings resolve real backend job details by ID', async ({ page, context }) => {
  const state = await mockAccount(context)
  const backendJob = { ...accountDemoJobs[0], id: 'backend-only-role', title: 'Platform Engineer', company: 'Northstar Labs', category: 'Software Development' }
  state.jobOverrides.set(backendJob.id, backendJob)
  state.saved.add(backendJob.id)
  state.drafts.set(backendJob.id, { jobId: backendJob.id, coverLetter: 'A private draft.', resumeUrl: '', updatedAt: new Date().toISOString() })

  await page.goto('/login'); await login(page)
  await page.goto('/saved-jobs')
  await expect(page.getByRole('link', { name: 'Platform Engineer', exact: true })).toBeVisible()
  await expect(page.getByText('Northstar Labs', { exact: true })).toBeVisible()

  await page.goto('/applications')
  await expect(page.getByRole('heading', { name: 'Platform Engineer', exact: true })).toBeVisible()
  await expect(page.getByText('Northstar Labs', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue draft', exact: true })).toHaveAttribute('href', '/jobs/backend-only-role/apply')
})

test('profile edits update the header immediately and survive refresh', async ({ page, context }) => {
  await mockAccount(context)
  await page.goto('/login'); await login(page)
  await (await openMenu(page)).getByRole('menuitem', { name: 'View profile' }).click()
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  await page.getByLabel('First name', { exact: true }).fill('Sophea')
  await page.getByLabel('Professional headline').fill('Product designer')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Profile updated.')
  await expect(page.locator('header .avatar')).toHaveText('SS')
  await page.reload()
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Sophea')
  await expect(page.getByLabel('Professional headline')).toHaveValue('Product designer')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByLabel('Add a skill, technology, or language').fill('TypeScript')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('TypeScript', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('TypeScript', { exact: true })).toBeVisible()
})

test('guest application returns after login, saves a private draft and deletes it', async ({ page, context }) => {
  const state = await mockAccount(context)
  await page.goto('/jobs/product-designer')
  await page.getByRole('link', { name: 'Sign in to apply' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await login(page)
  await expect(page).toHaveURL('/jobs/product-designer/apply')
  await page.getByLabel('Cover letter').fill('I enjoy designing thoughtful products.')
  await page.getByLabel('Application description').fill('I build thoughtful product experiences with accessible interfaces.')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Nothing has been sent to the employer.')
  await page.reload()
  await expect(page.getByLabel('Cover letter')).toHaveValue('I enjoy designing thoughtful products.')
  await page.getByRole('link', { name: 'View applications and drafts' }).click()
  await expect(page.getByText('Draft · Not submitted', { exact: true })).toBeVisible()
  expect(state.drafts.size).toBe(1)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A little preparation goes a long way' })).toBeVisible()
  expect(state.drafts.size).toBe(0)
})

test('guest bookmark returns to the same job without silently saving it', async ({ page, context }) => {
  const state = await mockAccount(context)
  await page.goto('/jobs/product-designer')
  await page.getByRole('button', { name: 'Save job', exact: true }).first().click()
  await login(page)
  await expect(page).toHaveURL('/jobs/product-designer')
  expect(state.saved.size).toBe(0)
  await page.locator('aside').getByRole('button', { name: 'Save job', exact: true }).click()
  await expect(page.locator('aside').getByRole('button', { name: 'Remove saved job' })).toBeVisible()
})

for (const [role, destination] of [['COMPANY', '/company/dashboard'], ['ADMIN', '/admin']] as const) {
  test(role + ' retains its dashboard and cannot access job-seeker actions', async ({ page, context }) => {
    await mockAccount(context, role)
    await page.goto('/login'); await login(page)
    await expect(page).toHaveURL(destination)
    await page.goto('/profile')
    await expect(page).toHaveURL(destination)
    await page.goto('/jobs/product-designer')
    await expect(page.getByRole('link', { name: 'Prepare application', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save job', exact: true })).toHaveCount(0)
    const menu = await openMenu(page)
    await expect(menu.getByRole('menuitem', { name: /dashboard/i })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'View profile' })).toHaveCount(0)
  })
}

test('expired sessions and server-revoked sessions return to login', async ({ page, context }) => {
  const state = await mockAccount(context)
  await seed(context, session('USER', -100))
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  // Replace the one-time expired fixture with a valid login, then revoke it on the server.
  await login(page)
  await expect(page).toHaveURL('/profile')
  state.meStatus = 401
  await page.getByRole('navigation', { name: 'Profile navigation' }).getByRole('link', { name: 'Saved jobs' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull()
})

test('bad password displays an error; unsafe redirect stays on the app', async ({ page, context }) => {
  await mockAccount(context)
  await page.goto('/login?redirect=https://example.com')
  await page.getByLabel('Email address', { exact: true }).fill('user@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
  await login(page)
  await expect(page).toHaveURL('/')
})

test('remembered sign-out clears both tabs and protects private routes', async ({ page, context }) => {
  const state = await mockAccount(context)
  state.saved.add('product-designer')
  await page.goto('/login'); await login(page, true)
  await expect(page).toHaveURL('/')
  expect(await page.evaluate(key => !!localStorage.getItem(key), storageKey)).toBe(true)
  const second = await context.newPage()
  await second.goto('/saved-jobs')
  await expect(second.getByRole('link', { name: 'Senior Product Designer', exact: true })).toBeVisible()
  await (await openMenu(page)).getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(second).toHaveURL(/\/login\?redirect=/)
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

test('account outages show a retry state without redirect loops or false empty lists', async ({ page, context }) => {
  const state = await mockAccount(context)
  state.activityStatus = 503
  await page.goto('/login'); await login(page)
  await (await openMenu(page)).getByRole('menuitem', { name: 'Saved jobs' }).click()
  await expect(page.getByRole('alert')).toContainText('Please try again shortly.')
  state.activityStatus = 200
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Your shortlist starts here' })).toBeVisible()
  state.meStatus = 503
  await page.getByRole('navigation', { name: 'Your account pages' }).getByRole('link', { name: 'Profile', exact: true }).click()
  await expect(page).toHaveURL(/connection=1/)
  await expect(page.getByRole('status')).toContainText('could not reach the account service')
})

test('removed dashboard redirects home and unknown jobs do not open another listing', async ({ page, context }) => {
  await mockAccount(context)
  await page.goto('/dashboard'); await expect(page).toHaveURL('/')
  await page.goto('/jobs/missing-job')
  await expect(page.getByRole('heading', { name: 'Job not found', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in to apply' })).toHaveCount(0)
})

test('job categories customize the results page and filter controls apply clearly', async ({ page, context }) => {
  await mockAccount(context)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Browse Design jobs' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse Electrician jobs' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Browse Design jobs' }).click()
  await expect(page).toHaveURL('/jobs?q=Design')
  await expect(page.getByRole('heading', { name: 'Design roles worth a closer look.', exact: true })).toBeVisible()
  await expect(page.getByText('Showing Design roles', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear category', exact: true }).click()
  await expect(page).toHaveURL('/jobs')

  const search = page.getByRole('searchbox', { name: 'Search jobs' })
  await search.fill('Figma')
  await expect(page.getByText('Filters changed. Search roles to update the results.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Search roles', exact: true }).click()
  await expect(page).toHaveURL('/jobs?q=Figma')
  await expect(page.getByRole('link', { name: 'Senior Product Designer', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page).toHaveURL('/jobs')
  await page.getByRole('button', { name: 'Technology', exact: true }).click()
  await expect(page).toHaveURL('/jobs?q=Technology')
  await expect(page.getByRole('link', { name: 'Full-Stack Engineer', exact: true })).toBeVisible()
})

test('signing out from a private page returns to sign-in and clears session storage', async ({ page, context }) => {
  await mockAccount(context)
  await page.goto('/login'); await login(page)
  await (await openMenu(page)).getByRole('menuitem', { name: 'View profile' }).click()
  await expect(page).toHaveURL('/profile')
  await (await openMenu(page)).getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull()
})

test('header fits a 320px screen before and after login', async ({ page, context }) => {
  await mockAccount(context)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  await expect(page.locator('header').getByRole('link', { name: 'Sign In', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('header').getByRole('link', { name: 'Sign In', exact: true }).click()
  await login(page)
  await expect(page).toHaveURL('/')
  const bounds = await (await openMenu(page)).boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
})

test('company profiles are candidate-facing and separate from the hiring dashboard', async ({ page, context }) => {
  await mockAccount(context, 'COMPANY')
  await seed(context, session('COMPANY'))
  await page.goto('/companies/figma')
  await expect(page.getByRole('heading', { name: 'Figma', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'About Figma', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Open roles', exact: true })).toBeVisible()
  await page.goto('/company/dashboard')
  await expect(page.getByRole('heading', { name: 'Hiring activity', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Company profile', exact: true })).toHaveCount(0)
  await page.goto('/companies/figma')
  await expect(page.getByRole('heading', { name: 'Company facts', exact: true })).toBeVisible()
})
