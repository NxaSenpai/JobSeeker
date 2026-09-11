import { createRouter, createWebHistory } from "vue-router";

import AuthPage from '@/views/auth/AuthPage.vue'
import LandingPage from '@/views/public/LandingPage.vue'
import PublicLayout from '@/components/public/PublicLayout.vue'
import JobsPage from '@/views/public/JobsPage.vue'
import JobDetailPage from '@/views/public/JobDetailPage.vue'
import CompaniesPage from '@/views/public/CompaniesPage.vue'
import CompanyDetailPage from '@/views/public/CompanyDetailPage.vue'
import AboutPage from '@/views/public/AboutPage.vue'
import ContactPage from '@/views/public/ContactPage.vue'
import RegisterChoicePage from '@/views/auth/RegisterChoicePage.vue'
import UserRegistrationPage from '@/views/auth/UserRegistrationPage.vue'
import CompanyRegistrationPage from '@/views/auth/CompanyRegistrationPage.vue'
import VerifyEmailPage from '@/views/auth/VerifyEmailPage.vue'
import ForgotPasswordPage from '@/views/auth/ForgotPasswordPage.vue'
import ResetPasswordPage from '@/views/auth/ResetPasswordPage.vue'
import CompanyDashboardPage from '@/views/company/CompanyDashboardPage.vue'
import AdminDashboardPage from '@/views/admin/AdminDashboardPage.vue'
import { dashboardPathForRole, type UserRole } from '@/services/auth'
import { verifySession } from '@/services/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [

    {
      path: '/',
      component: PublicLayout,
      children: [
        { path: '', name: 'LandingPage', component: LandingPage },
        { path: 'jobs', name: 'JobsPage', component: JobsPage },
        { path: 'jobs/:id', name: 'JobDetailPage', component: JobDetailPage },
        { path: 'companies', name: 'CompaniesPage', component: CompaniesPage },
        { path: 'companies/:id', name: 'CompanyDetailPage', component: CompanyDetailPage },
        { path: 'about', name: 'AboutPage', component: AboutPage },
        { path: 'contact', name: 'ContactPage', component: ContactPage },
        { path: 'profile', name: 'UserProfilePage', component: () => import('@/views/user/UserProfilePage.vue'), meta: { requiresAuth: true, role: 'USER' } },
        { path: 'saved-jobs', name: 'SavedJobsPage', component: () => import('@/views/user/SavedJobsPage.vue'), meta: { requiresAuth: true, role: 'USER' } },
        { path: 'applications', name: 'ApplicationsPage', component: () => import('@/views/user/ApplicationsPage.vue'), meta: { requiresAuth: true, role: 'USER' } },
        { path: 'jobs/:id/apply', name: 'ApplicationPage', component: () => import('@/views/user/ApplicationPage.vue'), meta: { requiresAuth: true, role: 'USER' } },
      ],
    },
    {
      path: '/login',
      name: 'AuthPage',
      component: AuthPage,
    },
    { path: '/auth', redirect: '/login' },
    { path: '/register', name: 'RegisterChoicePage', component: RegisterChoicePage },
    { path: '/register/user', name: 'UserRegistrationPage', component: UserRegistrationPage },
    { path: '/register/company', name: 'CompanyRegistrationPage', component: CompanyRegistrationPage },
    { path: '/verify-email', name: 'VerifyEmailPage', component: VerifyEmailPage },
    { path: '/forgot-password', name: 'ForgotPasswordPage', component: ForgotPasswordPage },
    { path: '/reset-password', name: 'ResetPasswordPage', component: ResetPasswordPage },
    { path: '/dashboard', redirect: '/' },
    {
      path: '/company/dashboard',
      name: 'CompanyDashboardPage',
      component: CompanyDashboardPage,
      meta: { requiresAuth: true, role: 'COMPANY' },
    },
    {
      path: '/admin',
      name: 'AdminDashboardPage',
      component: AdminDashboardPage,
      meta: { requiresAuth: true, role: 'ADMIN' },
    },

  ],
});

router.beforeEach(async (to) => {
  let session
  try { session = await verifySession(Boolean(to.meta.requiresAuth)) } catch {
    // Public browsing stays available when the account service is temporarily offline.
    if (to.meta.requiresAuth) return { name: 'AuthPage', query: { connection: '1', redirect: to.fullPath } }
    return true
  }

  if ((to.name === 'AuthPage' || to.path.startsWith('/register')) && session && !to.query.connection) {
    return loginDestination(session.user.role, to.query.redirect)
  }

  if (to.meta.requiresAuth && !session) {
    return {
      name: 'AuthPage',
      query: { redirect: to.fullPath },
    }
  }

  const requiredRole = to.meta.role as UserRole | undefined
  if (requiredRole && session?.user.role !== requiredRole) {
    return session ? dashboardPathForRole(session.user.role) : { name: 'AuthPage' }
  }

  return true
})

export function loginDestination(role: UserRole, redirect: unknown): string {
  if (role !== 'USER') return dashboardPathForRole(role)
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\')) {
    const target = router.resolve(redirect)
    if (target.matched.length && !target.path.startsWith('/login') && !target.path.startsWith('/auth')
      && !target.path.startsWith('/register') && !target.path.startsWith('/verify-email')
      && (!target.meta.role || target.meta.role === 'USER')) return target.fullPath
  }
  return '/'
}

export default router
