<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminWorkspaceLayout from '@/components/admin/AdminWorkspaceLayout.vue'
import UiIcon from '@/components/company/UiIcon.vue'
import { getAdminProfile, type AdminProfile } from '@/services/adminAccount'

const profile = ref<AdminProfile | null>(null)
const loading = ref(true)
const error = ref('')

const displayName = computed(() => {
  const name = [profile.value?.firstName, profile.value?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim()
  return name || 'Administrator'
})

const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)

function formatDate(value: string | undefined) {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date)
}

onMounted(async () => {
  try {
    const result = await getAdminProfile()
    profile.value = result.profile
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Admin profile could not be loaded.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AdminWorkspaceLayout title="Admin profile" :show-search="false">
    <section class="profile-page" aria-labelledby="profile-heading">
      <div class="page-intro">
        <p class="eyebrow">Account</p>
        <h2 id="profile-heading">Your admin profile</h2>
        <p>Basic account details for the administrator currently signed in.</p>
      </div>

      <div v-if="loading" class="profile-skeleton" aria-label="Loading admin profile">
        <span></span><span></span><span></span>
      </div>
      <div v-else-if="error" class="profile-error" role="alert">
        <UiIcon name="help" :size="19" />
        <span>{{ error }}</span>
      </div>
      <article v-else-if="profile" class="identity-panel">
        <div class="identity-header">
          <span class="identity-avatar" aria-hidden="true">{{ initials }}</span>
          <div class="identity-title">
            <h3>{{ displayName }}</h3>
            <p>{{ profile.email }}</p>
          </div>
          <span class="role-label">Administrator</span>
        </div>

        <dl class="identity-details">
          <div>
            <dt>Email address</dt>
            <dd>{{ profile.email }}</dd>
          </div>
          <div>
            <dt>Account access</dt>
            <dd class="status-value">
              <i :class="profile.emailVerified ? 'status-dot verified' : 'status-dot'" />
              {{ profile.emailVerified ? 'Verified' : 'Not verified' }}
            </dd>
          </div>
          <div>
            <dt>Admin since</dt>
            <dd>{{ formatDate(profile.createdAt) }}</dd>
          </div>
          <div>
            <dt>Last account update</dt>
            <dd>{{ formatDate(profile.updatedAt) }}</dd>
          </div>
        </dl>

        <p class="profile-note">
          Admin accounts use a minimal profile. Password changes are handled through the secure sign-in recovery flow.
        </p>
      </article>
    </section>
  </AdminWorkspaceLayout>
</template>

<style scoped>
.profile-page { max-width: 900px; margin: 6px auto 0; }
.page-intro { margin-bottom: 27px; }
.eyebrow { margin: 0 0 8px; color: #6555bf; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.page-intro h2 { margin: 0; color: #19233c; font-size: clamp(27px, 3vw, 36px); font-weight: 600; letter-spacing: -.04em; line-height: 1.1; }
.page-intro > p:last-child { margin: 9px 0 0; color: #657088; font-size: 14px; line-height: 1.5; }
.identity-panel { overflow: hidden; border: 1px solid #e2e4e8; border-radius: 9px; background: #fff; }
.identity-header { min-height: 112px; padding: 24px 27px; display: flex; align-items: center; gap: 17px; border-bottom: 1px solid #e9eaee; }
.identity-avatar { width: 54px; height: 54px; flex: 0 0 auto; border: 1px solid #ded9fa; border-radius: 14px; display: grid; place-items: center; background: #f2efff; color: #5948b9; font-size: 16px; font-weight: 700; }
.identity-title { min-width: 0; }
.identity-title h3 { overflow: hidden; margin: 0; color: #19233c; font-size: 19px; font-weight: 600; letter-spacing: -.02em; text-overflow: ellipsis; white-space: nowrap; }
.identity-title p { overflow: hidden; margin: 4px 0 0; color: #657088; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.role-label { margin-left: auto; padding: 6px 9px; border-left: 2px solid #7565d1; background: #f4f2fc; color: #5547a9; font-size: 11px; font-weight: 600; white-space: nowrap; }
.identity-details { margin: 0; padding: 2px 27px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; }
.identity-details > div { min-width: 0; padding: 17px 0; border-bottom: 1px solid #eff0f2; }
.identity-details dt { margin-bottom: 5px; color: #737d8d; font-size: 11px; font-weight: 500; }
.identity-details dd { overflow-wrap: anywhere; margin: 0; color: #26334b; font-size: 14px; font-weight: 500; }
.status-value { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #b67845; }
.status-dot.verified { background: #398262; }
.profile-note { max-width: 65ch; margin: 0; padding: 18px 27px 21px; color: #6e7788; font-size: 12px; line-height: 1.6; }
.profile-error { min-height: 62px; padding: 16px 18px; border: 1px solid #e7c5c8; border-radius: 8px; display: flex; align-items: center; gap: 10px; background: #fff8f8; color: #913c47; font-size: 14px; }
.profile-skeleton { min-height: 240px; padding: 26px; border: 1px solid #e2e4e8; border-radius: 9px; display: grid; align-content: start; gap: 18px; background: #fff; }
.profile-skeleton span { width: 100%; height: 31px; border-radius: 4px; background: linear-gradient(90deg, #f0f1f4, #f8f8fa, #f0f1f4); background-size: 200% 100%; animation: shimmer 1.3s ease-in-out infinite; }
.profile-skeleton span:first-child { width: 45%; height: 52px; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (max-width: 600px) {
  .profile-page { margin-top: 0; }
  .identity-header { padding: 19px; gap: 12px; flex-wrap: wrap; }
  .role-label { margin-left: 66px; }
  .identity-details { padding: 0 19px; grid-template-columns: 1fr; column-gap: 0; }
  .identity-details > div { padding: 13px 0; }
  .profile-note { padding: 16px 19px 19px; }
}
@media (prefers-reduced-motion: reduce) { .profile-skeleton span { animation: none; } }
</style>
