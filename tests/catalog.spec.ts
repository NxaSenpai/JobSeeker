import { expect, test, type BrowserContext } from '@playwright/test'

const companyId = '33333333-3333-4333-8333-333333333333'

function publicCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: companyId,
    slug: 'northstar-studio',
    name: 'Northstar Studio',
    industry: 'Product design',
    companySize: '11–50 people',
    foundedYear: 2018,
    location: 'Phnom Penh, Cambodia',
    website: 'https://northstar.example',
    description: 'A small team building thoughtful digital products.',
    logoUrl: null,
    isVerified: true,
    openJobs: 1,
    ...overrides,
  }
}

function publicJob(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: 'Product Designer',
    company: 'Northstar Studio',
    companyProfile: publicCompany(),
    location: 'Phnom Penh, Cambodia',
    category: 'Design',
    industry: 'Product design',
    jobType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    summary: 'Make everyday digital work simpler.',
    description: 'Work with a small, supportive product team.',
    responsibilities: ['Shape product experiences.'],
    requirements: ['Bring a portfolio.'],
    skills: ['Product design', 'Research'],
    salaryMin: 25000,
    salaryMax: 35000,
    currency: 'USD',
    salaryPeriod: 'YEAR',
    postedAt: '2026-09-22T04:00:00.000Z',
    isDemo: false,
    deadline: null,
    ...overrides,
  }
}

async function mockCatalogApi(context: BrowserContext, jobCount = 2) {
  const jobRequests: URL[] = []
  const featuredRequests: URL[] = []
  const categoryRequests: URL[] = []
  const companyRequests: URL[] = []
  const allJobs = Array.from({ length: jobCount }, (_, index) =>
    publicJob(`role-${index + 1}`, {
      title: index === 0 ? 'Product Designer' : `Research Engineer ${index + 1}`,
      workplaceType: index % 2 ? 'REMOTE' : 'HYBRID',
      jobType: index % 2 ? 'CONTRACT' : 'FULL_TIME',
    }),
  )
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const reply = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (request.method() === 'OPTIONS') return reply({})

    if (path === '/jobs' && request.method() === 'GET') {
      jobRequests.push(url)
      if (url.searchParams.get('fail') === '1') return reply({ message: 'Service unavailable.' }, 503)
      const search = url.searchParams.get('search')?.toLowerCase() ?? ''
      const workplace = url.searchParams.get('workplaceType')
      const type = url.searchParams.get('jobType')
      const filtered = allJobs.filter((job) =>
        (!search || `${job.title} ${job.company} ${job.location} ${job.category}`.toLowerCase().includes(search)) &&
        (!workplace || job.workplaceType === workplace) &&
        (!type || job.jobType === type),
      )
      const page = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? 12)
      return reply({ jobs: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit })
    }
    if (path === '/jobs/featured' && request.method() === 'GET') {
      featuredRequests.push(url)
      return reply({ jobs: [allJobs[0]] })
    }
    if (path === '/jobs/categories' && request.method() === 'GET') {
      categoryRequests.push(url)
      return reply({ categories: [{ name: 'Design', count: 9 }, { name: 'Software Development', count: 4 }] })
    }
    if (path === '/jobs/role-1') return reply(allJobs[0])
    if (path === '/jobs/role-1/similar') return reply({ jobs: allJobs.slice(1, 3) })
    if (path === '/companies' && request.method() === 'GET') {
      companyRequests.push(url)
      const search = url.searchParams.get('search')?.toLowerCase() ?? ''
      const industry = url.searchParams.get('industry')
      const matches = [publicCompany()].filter((company) =>
        (!search || `${company.name} ${company.industry} ${company.location}`.toLowerCase().includes(search)) &&
        (!industry || company.industry === industry),
      )
      return reply({ companies: matches, total: matches.length, page: 1, limit: 12 })
    }
    if (path === '/companies/northstar-studio/jobs')
      return reply({ company: publicCompany(), jobs: [allJobs[0]], total: 1, page: 1, limit: 20 })
    return reply({ message: 'Not found.' }, 404)
  })
  return { jobRequests, featuredRequests, categoryRequests, companyRequests }
}

test('homepage featured, latest, and category sections use backend records and counts', async ({ page, context }) => {
  const state = await mockCatalogApi(context)
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Product Designer', exact: true })).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Research Engineer 2', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse Software Development jobs' })).toContainText('4 roles available')
  await expect.poll(() => state.featuredRequests.length).toBe(1)
  await expect.poll(() => state.categoryRequests.length).toBe(1)
  expect(state.jobRequests.some(url => url.searchParams.get('sort') === 'newest')).toBe(true)
})

test('job browsing uses backend search and filters, not the demo catalog', async ({ page, context }) => {
  const state = await mockCatalogApi(context)
  await page.goto('/jobs')
  await expect(page.getByRole('link', { name: 'Product Designer' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Research Engineer 2' })).toBeVisible()

  await page.getByLabel('Search jobs').fill('Research Engineer')
  await page.getByLabel('Workplace').selectOption('Remote')
  await page.getByLabel('Job type').selectOption('Contract')
  await page.getByRole('button', { name: 'Search roles' }).click()

  await expect(page.getByRole('link', { name: 'Research Engineer 2' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Product Designer' })).toHaveCount(0)
  const request = state.jobRequests.at(-1)!
  expect(request.searchParams.get('search')).toBe('Research Engineer')
  expect(request.searchParams.get('workplaceType')).toBe('REMOTE')
  expect(request.searchParams.get('jobType')).toBe('CONTRACT')
})

test('job browsing paginates backend results', async ({ page, context }) => {
  await mockCatalogApi(context, 13)
  await page.goto('/jobs')
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Research Engineer 13' })).toBeVisible()
})

test('company directory and profile use verified backend records', async ({ page, context }) => {
  const state = await mockCatalogApi(context)
  await page.goto('/companies')
  await expect(page.getByRole('link', { name: 'Northstar Studio' })).toBeVisible()
  await expect(page.getByText('1 companies')).toHaveText('1 companies')

  await page.getByLabel('Filter by industry').selectOption('Product design')
  await expect.poll(() => state.companyRequests.at(-1)?.searchParams.get('industry')).toBe('Product design')
  await page.getByRole('link', { name: 'Northstar Studio' }).click()
  await expect(page.getByRole('heading', { name: 'Northstar Studio', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Product Designer/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Visit website/ })).toHaveAttribute('href', 'https://northstar.example')
})

test('unavailable job details do not fall back to stale demo content', async ({ page, context }) => {
  await mockCatalogApi(context)
  await page.goto('/jobs/removed-role')
  await expect(page.getByRole('heading', { name: 'Job not found' })).toBeVisible()
  await expect(page.getByText('This listing may have expired or been removed.')).toBeVisible()
})
