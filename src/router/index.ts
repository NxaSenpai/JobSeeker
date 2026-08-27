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

const router = createRouter({
  history: createWebHistory(),
  routes: [

    {
      path: '/',
      component: PublicLayout,
      children: [
        { path: '', name: 'LandingPage', component: LandingPage },
        { path: 'jobs', name: 'JobsPage', component: JobsPage },
        { path: 'jobs/:id', name: 'JobDetailPage', component: JobDetailPage, props: true },
        { path: 'companies', name: 'CompaniesPage', component: CompaniesPage },
        { path: 'companies/:id', name: 'CompanyDetailPage', component: CompanyDetailPage, props: true },
        { path: 'about', name: 'AboutPage', component: AboutPage },
        { path: 'contact', name: 'ContactPage', component: ContactPage },
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

  ],
});

export default router
