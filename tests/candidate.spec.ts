import { expect, test, type BrowserContext } from '@playwright/test'
import type { ApplicationRecord, CandidateProfile, ResumeRecord } from '../src/services/candidate'

async function candidateFixture(context: BrowserContext, options: { jobId?: string; isDemo?: boolean; title?: string; company?: string } = {}) {
  const jobId = options.jobId ?? 'product-designer'
  const isDemo = options.isDemo ?? true
  const title = options.title ?? 'Senior Product Designer'
  const company = options.company ?? 'Figma'
  const user = { id: '11111111-1111-4111-8111-111111111111', firstName: 'Dara', lastName: 'Sok', email: 'dara@example.invalid', role: 'USER', emailVerified: true, headline: 'Frontend developer', location: 'Phnom Penh, Cambodia', bio: 'I build thoughtful, accessible products with Vue and TypeScript.' }
  const encode = (data: unknown) => Buffer.from(JSON.stringify(data)).toString('base64url')
  const session = { user, accessToken: `${encode({ alg: 'HS256' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture` }
  await context.addInitScript(session => { if (!sessionStorage.getItem('jobseeker.auth.session')) sessionStorage.setItem('jobseeker.auth.session', JSON.stringify(session)) }, session)
  const profile: CandidateProfile = { phone: '+855 12 345 678', websiteUrl: 'https://example.com', linkedinUrl: '', githubUrl: '', isOpenToWork: true, profileImageUrl: null, skills: ['Vue', 'TypeScript'], education: [], experience: [], languages: [] }
  const resumes: ResumeRecord[] = []
  const applications: ApplicationRecord[] = []
  let draft: Record<string, unknown> | null = null
  let unread = true
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64')
  await context.route('**/api/v1/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname.replace('/api/v1', ''); const method = req.method()
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (method === 'OPTIONS') return reply({})
    if (path === '/auth/me') return reply({ user })
    if (path === '/account/profile') {
      if (method === 'PATCH') { Object.assign(profile, req.postDataJSON()); Object.assign(user, req.postDataJSON()) }
      return reply({ user, profile })
    }
    if (path === '/account/profile/avatar') {
      if (method === 'POST') { profile.profileImageUrl = '/api/v1/account/profile/avatar'; return reply({ user, profile }, 201) }
      if (method === 'DELETE') { profile.profileImageUrl = null; return reply({ removed: true }) }
      return route.fulfill({ contentType: 'image/png', body: image })
    }
    if (path === '/account/saved-jobs') return reply({ jobs: [] })
    if (path === '/account/application-drafts') return reply({ drafts: draft ? [draft] : [] })
    if (path.startsWith('/account/application-drafts/')) { draft = { ...req.postDataJSON(), jobId, updatedAt: new Date().toISOString() }; return reply({ draft }) }
    if (path === '/account/resumes') {
      if (method === 'POST') { const resume = { id: '22222222-2222-4222-8222-222222222222', fileName: 'Dara CV.pdf', fileSize: 142000, mimeType: 'application/pdf', isDefault: true, createdAt: new Date().toISOString() }; resumes.push(resume); return reply({ resume }, 201) }
      return reply({ resumes })
    }
    if (path.endsWith('/download')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.7\n%%EOF', headers: { 'Content-Disposition': 'attachment; filename="Dara CV.pdf"' } })
    if (path === `/jobs/${jobId}`) return reply({
      id: jobId,
      title,
      company,
      companyProfile: null,
      location: 'London, United Kingdom',
      category: 'Product Design',
      industry: 'Technology',
      jobType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      summary: 'Design thoughtful digital products with a collaborative team.',
      description: 'Lead product design from research through delivery.',
      responsibilities: ['Partner with product and engineering.'],
      requirements: ['Experience shipping digital products.'],
      skills: ['Figma', 'Prototyping'],
      salaryMin: null,
      salaryMax: null,
      currency: 'USD',
      salaryPeriod: 'YEAR',
      postedAt: new Date().toISOString(),
      isDemo,
      deadline: null,
    })
    if (path === `/jobs/${jobId}/applications`) {
      if (applications.length) return reply({ message: 'You have already applied for this job.' }, 409)
      const payload = req.postDataJSON()
      const application: ApplicationRecord = { ...payload, id: '33333333-3333-4333-8333-333333333333', jobId, status: 'APPLIED', job: { id: jobId, title, company, location: 'London, United Kingdom', isDemo }, resume: resumes[0]!, candidate: { ...user }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [{ status: 'APPLIED', at: new Date().toISOString() }] }
      applications.push(application); draft = null; return reply({ application }, 201)
    }
    if (path === '/applications/me') { const filtered = applications.filter(item => !url.searchParams.get('status') || item.status === url.searchParams.get('status')); return reply({ applications: filtered, total: filtered.length }) }
    if (path.startsWith('/applications/me/')) {
      const application = applications[0]
      if (!application) return reply({ message: 'Application not found.' }, 404)
      if (method === 'PATCH') { application.status = 'WITHDRAWN'; application.history.push({ status: 'WITHDRAWN', at: new Date().toISOString() }) }
      return reply({ application })
    }
    if (path === '/notifications' && method === 'GET') return reply({ notifications: applications.length ? [{ id: '44444444-4444-4444-8444-444444444444', title: 'Application submitted', message: `${title} at ${company}${isDemo ? ' — sample listing.' : '.'}`, link: `/applications/${applications[0]!.id}`, createdAt: new Date().toISOString(), readAt: unread ? null : new Date().toISOString() }] : [], total: applications.length })
    if (path === '/notifications/unread-count' && method === 'GET') return reply({ count: applications.length && unread ? 1 : 0 })
    if (path.startsWith('/notifications') && method === 'PATCH') { unread = false; return reply({ updated: true }) }
    return reply({ message: `Unexpected endpoint ${method} ${path}` }, 404)
  })
  return { profile, applications, resumes, image, jobId }
}

test('application form loads an API-backed job that is not in the sample catalogue', async ({ page, context }) => {
  const state = await candidateFixture(context, { jobId: 'backend-only-role', isDemo: false, title: 'Backend Platform Engineer', company: 'Northstar Labs' })
  await page.goto(`/jobs/${state.jobId}/apply`)
  await expect(page.getByRole('heading', { name: 'Backend Platform Engineer' })).toBeVisible()
  await expect(page.getByText('Northstar Labs', { exact: true })).toBeVisible()
  await expect(page.getByText('Sample listing.', { exact: false })).toHaveCount(0)
  await page.getByLabel('Application description').fill('I build reliable backend systems and have shipped secure services for growing product teams.')
  await page.getByLabel('Upload a PDF résumé').setInputFiles({ name: 'Dara CV.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') })
  await expect(page.getByRole('status')).toContainText('Résumé uploaded and selected')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Submit application', exact: true }).click()
  await expect(page).toHaveURL(/\/applications\/33333333/)
  expect(state.applications[0]?.jobId).toBe('backend-only-role')
})

test('candidate submits an uploaded CV, reopens it, filters and withdraws the application', async ({ page, context }, testInfo) => {
  const state = await candidateFixture(context)
  await page.goto(`/jobs/${state.jobId}/apply`)
  await expect(page.getByText('Sample listing.', { exact: false })).toBeVisible()
  await page.getByLabel('Application description').fill('I build accessible interfaces and have led product design projects across web and mobile.')
  await page.getByLabel('Cover letter').fill('I would bring thoughtful research and close collaboration with engineers to your team.')
  await page.getByLabel('Upload a PDF résumé').setInputFiles({ name: 'Dara CV.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') })
  await expect(page.getByRole('status')).toContainText('Résumé uploaded and selected')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Draft saved')
  await page.reload()
  await expect(page.getByLabel('Application description')).toHaveValue(/accessible interfaces/)
  await expect(page.getByLabel('Select a résumé')).toHaveValue(state.resumes[0]!.id)
  await page.getByRole('checkbox').check()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('form').evaluate(form => {
    const bounds = form.getBoundingClientRect()
    return [...form.querySelectorAll('input, textarea, select')].filter(input => input.getBoundingClientRect().right > bounds.right - 8).map(input => ({ field: input.parentElement?.textContent?.slice(0, 60), right: input.getBoundingClientRect().right, panelRight: bounds.right, parentWidth: input.parentElement?.getBoundingClientRect().width }))
  })).toEqual([])
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('application-form.png'), fullPage: true })
  await page.getByRole('button', { name: 'Submit application', exact: true }).click()
  await expect(page).toHaveURL(/\/applications\/33333333/)
  await expect(page.getByRole('status')).toContainText('Application submitted')
  expect(state.applications).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Status history' })).toBeVisible()
  await expect(page.getByText('Dara CV.pdf', { exact: true })).toBeVisible()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CV' }).click()
  expect((await downloadEvent).suggestedFilename()).toBe('Dara CV.pdf')
  await page.screenshot({ path: testInfo.outputPath('application-details.png'), fullPage: true })
  await page.getByRole('button', { name: 'Withdraw application', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, withdraw', exact: true }).click()
  await expect(page.getByText('Withdrawn', { exact: true })).toHaveCount(2)
  await page.getByRole('link', { name: 'Back to applications', exact: false }).click()
  await page.getByLabel('Filter by status').selectOption('WITHDRAWN')
  await expect(page.getByRole('link', { name: 'View application', exact: true })).toBeVisible()
  await page.goto(`/jobs/${state.jobId}/apply`)
  await expect(page.getByRole('heading', { name: 'You have already applied for this role' })).toBeVisible()
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'Application submitted', exact: true })).toBeVisible()
  await expect(page.locator('header .notification-badge')).toHaveText('1')
  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(page.getByRole('button', { name: 'Mark as read', exact: true })).toHaveCount(0)
  await expect(page.locator('header .notification-badge')).toHaveCount(0)
})

test('profile photo, contacts, education, experience and languages can be changed and reloaded', async ({ page, context }, testInfo) => {
  const state = await candidateFixture(context)
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  await page.getByLabel('First name', { exact: true }).fill('Dara Updated')
  await page.getByLabel('Phone number', { exact: true }).fill('+855 99 123 456')
  await page.getByLabel('GitHub URL').fill('https://github.com/dara')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Profile updated')
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await expect(page.getByRole('menu', { name: 'Your account' })).toContainText('Dara Updated Sok')
  await page.keyboard.press('Escape')
  await page.getByLabel('Change photo', { exact: false }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: state.image })
  await expect(page.getByAltText("Dara Updated Sok's profile photo")).toBeVisible()
  await expect(page.locator('header img.avatar-image')).toBeVisible()
  await page.getByRole('button', { name: 'Edit background' }).click()
  await page.getByRole('button', { name: 'Add experience', exact: false }).click()
  const experience = page.locator('#experience')
  await experience.getByLabel('Company', { exact: true }).fill('Mekong Studio')
  await experience.getByLabel('Position', { exact: true }).fill('Frontend developer')
  await experience.getByLabel('Start date').fill('2024-01-01')
  await experience.getByLabel('I currently work here').check()
  await page.getByRole('button', { name: 'Add education', exact: false }).click()
  const education = page.locator('#education')
  await education.getByLabel('School or university').fill('Royal University of Phnom Penh')
  await education.getByLabel('Degree', { exact: true }).fill('BSc')
  await education.getByLabel('Field of study').fill('Computer Science')
  await education.getByLabel('Start date').fill('2020-01-01')
  await education.getByLabel('End date').fill('2024-01-01')
  await page.getByRole('button', { name: 'Add language', exact: false }).click()
  await page.getByLabel('Language', { exact: true }).fill('Khmer')
  await page.getByLabel('Proficiency').selectOption('Native')
  await page.getByRole('button', { name: 'Save background', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Professional background updated' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Royal University of Phnom Penh', { exact: true })).toBeVisible()
  await expect(page.getByText('Mekong Studio · Full-time', { exact: true })).toBeVisible()
  await expect(page.getByText('Native', { exact: true })).toBeVisible()
  await expect(page.getByText('+855 99 123 456', { exact: true })).toBeVisible()
  await expect(page.getByAltText("Dara Updated Sok's profile photo")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('candidate-profile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByAltText("Dara Sok's profile photo")).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit background' }).click()
  await page.getByRole('button', { name: 'Remove education 1', exact: true }).click()
  await page.getByRole('button', { name: 'Save background', exact: true }).click()
  await expect(page.getByText('Royal University of Phnom Penh', { exact: true })).toHaveCount(0)
})

test('application file validation and unsaved-change protection keep the form usable', async ({ page, context }) => {
  const state = await candidateFixture(context)
  await page.goto(`/jobs/${state.jobId}/apply`)
  await page.getByLabel('Upload a PDF résumé').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a CV') })
  await expect(page.getByRole('alert')).toContainText('Choose a PDF résumé up to 10 MB')
  await page.getByLabel('Application description').fill('This is a description that should be kept if I cancel leaving.')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: 'View applications and drafts' }).click()
  await expect(page).toHaveURL('/jobs/product-designer/apply')
  await expect(page.getByLabel('Application description')).toHaveValue(/should be kept/)
})
