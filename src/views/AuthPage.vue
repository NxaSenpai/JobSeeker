<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const fullName = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const authCardRef = ref<HTMLElement | null>(null)

const signup = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  // Placeholder for signup handler
  successMessage.value = 'Account created successfully!'
  loading.value = false
}

const login = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  // Placeholder for login handler
  successMessage.value = 'Signed in successfully!'
  loading.value = false

  // Redirect to home after login
  await router.push('/')
}

const applyModeState = (nextIsLogin: boolean) => {
  isLogin.value = nextIsLogin
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  fullName.value = ''
  rememberMe.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

const setMode = async (nextIsLogin: boolean) => {
  if (isLogin.value === nextIsLogin) return

  const card = authCardRef.value
  if (!card) {
    applyModeState(nextIsLogin)
    return
  }

  const startHeight = card.offsetHeight
  card.style.height = `${startHeight}px`
  card.style.overflow = 'hidden'
  card.style.transition = 'none'

  applyModeState(nextIsLogin)
  await nextTick()

  card.style.height = 'auto'
  const endHeight = card.offsetHeight
  card.style.height = `${startHeight}px`
  void card.offsetHeight

  requestAnimationFrame(() => {
    card.style.transition = 'height 420ms cubic-bezier(0.22, 1, 0.36, 1)'
    card.style.height = `${endHeight}px`
  })

  const clearInlineStyles = () => {
    card.style.height = ''
    card.style.overflow = ''
    card.style.transition = ''
  }

  const handleTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== card || event.propertyName !== 'height') return
    card.removeEventListener('transitionend', handleTransitionEnd)
    clearInlineStyles()
  }

  card.addEventListener('transitionend', handleTransitionEnd)
}

const switchMode = () => {
  void setMode(!isLogin.value)
}

const handleSubmit = async (e: Event) => {
  e.preventDefault()
  if (isLogin.value) {
    await login()
  } else {
    await signup()
  }
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}




</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-white">

    <!-- Auth Section -->
    <section class="relative flex min-h-screen items-center bg-[#f3f1ff]">
      <!-- Decorative background elements (matching HeroSection style) -->
      <div
        class="pointer-events-none absolute left-[108px] top-24 w-[420px] h-[300px] opacity-50 bg-gradient-to-br from-[#7b66ff]/20 to-transparent rounded-full blur-2xl"
      />
      <div
        class="pointer-events-none absolute left-[108px] top-20 size-[74px] opacity-50 bg-[#7b66ff]/10 rounded-full blur-xl"
      />
      <div
        class="pointer-events-none absolute left-[108px] bottom-20 size-[87px] opacity-50 bg-[#7b66ff]/10 rounded-full blur-xl"
      />

      <div class="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 lg:px-[108px]">
        <div class="flex flex-col items-center justify-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-20">
          <div class="flex max-w-[640px] flex-1 flex-col justify-center gap-10">
            <Transition name="auth-copy" mode="out-in">
              <div :key="isLogin ? 'login-copy' : 'signup-copy'" class="flex flex-col gap-6">
              <h1 class="text-[56px] font-bold leading-[72px] text-[#0b2b82]">
                {{ isLogin ? 'Welcome Back' : 'Create Your Account' }}
                <span class="text-[#7b66ff]">{{ isLogin ? 'Sign In' : 'Sign Up' }}</span>
              </h1>
              <p class="w-full max-w-[569px] text-base leading-[32px] text-[#3d589b]">
                {{ isLogin
                  ? 'Sign in to access your dashboard, saved jobs, and personalized recommendations.'
                  : 'Join thousands of job seekers finding their dream careers at innovative startups.' }}
              </p>
              </div>
            </Transition>

            <!-- Feature highlights -->
            <div class="flex flex-col gap-4 pt-4">
              <div class="flex items-center gap-3">
                <div class="size-10 flex-shrink-0 flex items-center justify-center bg-[#7b66ff] rounded-xl">
                  <svg class="size-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-base text-[#3d589b]">Access 7,000+ job opportunities</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="size-10 flex-shrink-0 flex items-center justify-center bg-[#7b66ff] rounded-xl">
                  <svg class="size-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-base text-[#3d589b]">Save and track applications</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="size-10 flex-shrink-0 flex items-center justify-center bg-[#7b66ff] rounded-xl">
                  <svg class="size-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-base text-[#3d589b]">Get personalized job matches</span>
              </div>
            </div>
          </div>

          <!-- Right: Auth Form Card -->
          <div class="relative w-full max-w-[480px] shrink-0">
            <!-- Card with decorative top accent -->
            <div
              ref="authCardRef"
              class="relative bg-white rounded-2xl border border-[#d8d1ff] p-10 shadow-[0_26px_73px_0_rgba(11,43,130,0.08)]"
            >
              <!-- Top accent line -->
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] h-1 bg-[#7b66ff] rounded-b-full" />

              <!-- Tab Switcher -->
              <div class="relative mb-8 flex rounded-xl bg-[#f7f5ff] p-1" role="tablist">
                <div
                  class="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-[#7b66ff] transition-transform duration-300 ease-out"
                  :class="isLogin ? 'translate-x-0' : 'translate-x-full'"
                />
                <button
                  @click="setMode(true)"
                  :class="[
                    'relative z-10 flex-1 rounded-xl py-3 text-base font-medium transition-colors duration-300 cursor-pointer',
                    isLogin ? 'text-white' : 'text-[#3d589b]'
                  ]"
                  role="tab"
                  :aria-selected="isLogin"
                >
                  Sign In
                </button>
                <button
                  @click="setMode(false)"
                  :class="[
                    'relative z-10 flex-1 rounded-xl py-3 text-base font-medium transition-colors duration-300 cursor-pointer',
                    !isLogin ? 'text-white' : 'text-[#3d589b]'
                  ]"
                  role="tab"
                  :aria-selected="!isLogin"
                >
                  Sign Up
                </button>
              </div>

              <!-- Form -->
              <form @submit="handleSubmit" class="flex flex-col gap-6" novalidate>

                <!-- Error Message -->
                <div v-if="errorMessage" class="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700" role="alert">
                  {{ errorMessage }}
                </div>

                <!-- Success Message -->
                <div v-if="successMessage" class="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700" role="status">
                  {{ successMessage }}
                </div>
                <!-- Full Name (Sign Up only) -->
                <div v-if="!isLogin" class="flex flex-col gap-2">
                  <label for="fullName" class="text-sm font-medium text-[#0b2b82]">Full Name</label>
                  <div class="relative">
                    <input
                      id="fullName"
                      type="text"
                      v-model="fullName"
                      placeholder="John Doe"
                      required
                      autocomplete="name"
                      class="h-14 w-full bg-white px-5 pr-12 text-base text-[#0b2b82] border border-[#d8d1ff] rounded-xl outline-none placeholder:text-[#a1adcb] transition-colors focus:border-[#7b66ff] focus:ring-2 focus:ring-[#7b66ff]/20"
                    />
                    <svg class="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-[#a1adcb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <!-- Email -->
                <div class="flex flex-col gap-2">
                  <label for="email" class="text-sm font-medium text-[#0b2b82]">Email Address</label>
                  <div class="relative">
                    <input
                      id="email"
                      type="email"
                      v-model="email"
                      placeholder="you@example.com"
                      required
                      autocomplete="email"
                      class="h-14 w-full bg-white px-5 pr-12 text-base text-[#0b2b82] border border-[#d8d1ff] rounded-xl outline-none placeholder:text-[#a1adcb] transition-colors focus:border-[#7b66ff] focus:ring-2 focus:ring-[#7b66ff]/20"
                    />
                    <svg class="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-[#a1adcb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <!-- Password -->
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <label for="password" class="text-sm font-medium text-[#0b2b82]">Password</label>
                    <a href="#" class="text-sm text-[#7b66ff] hover:text-[#6f5cf9] transition-colors">Forgot?</a>
                  </div>
                  <div class="relative">
                    <input
                      id="password"
                      :type="showPassword ? 'text' : 'password'"
                      v-model="password"
                      placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                      required
                      autocomplete="current-password"
                      class="h-14 w-full bg-white px-5 pr-12 text-base text-[#0b2b82] border border-[#d8d1ff] rounded-xl outline-none placeholder:text-[#a1adcb] transition-colors focus:border-[#7b66ff] focus:ring-2 focus:ring-[#7b66ff]/20"
                    />
                    <button
                      type="button"
                      @click="togglePassword"
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-[#a1adcb] hover:text-[#7b66ff] transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      <svg v-if="!showPassword" class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <svg v-else class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Confirm Password (Sign Up only) -->
                <div v-if="!isLogin" class="flex flex-col gap-2">
                  <label for="confirmPassword" class="text-sm font-medium text-[#0b2b82]">Confirm Password</label>
                  <div class="relative">
                    <input
                      id="confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      v-model="confirmPassword"
                      placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                      required
                      autocomplete="new-password"
                      class="h-14 w-full bg-white px-5 pr-12 text-base text-[#0b2b82] border border-[#d8d1ff] rounded-xl outline-none placeholder:text-[#a1adcb] transition-colors focus:border-[#7b66ff] focus:ring-2 focus:ring-[#7b66ff]/20"
                    />
                    <button
                      type="button"
                      @click="toggleConfirmPassword"
                      class="absolute right-4 top-1/2 -translate-y-1/2 text-[#a1adcb] hover:text-[#7b66ff] transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      <svg v-if="!showConfirmPassword" class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <svg v-else class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div v-if="isLogin" class="flex items-center justify-between">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="rememberMe"
                      class="cursor-pointer size-4 accent-[#7b66ff] border-[#d8d1ff] rounded focus:ring-2 focus:ring-[#7b66ff]/20"
                    />
                    <span class="text-sm text-[#3d589b]">Remember me</span>
                  </label>
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  :disabled="loading"
                  class="bg-[#7b66ff] px-6 py-4 text-base font-medium text-white rounded-xl shadow-[0_10px_30px_0_rgba(123,102,255,0.4)] transition-all hover:bg-[#6f5cf9] hover:shadow-[0_14px_40px_0_rgba(123,102,255,0.5)] focus:outline-none focus:ring-2 focus:ring-[#7b66ff]/50 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ loading ? (isLogin ? 'Signing in...' : 'Creating...') : (isLogin ? 'Sign In' : 'Create Account') }}
                </button>
              </form>

              <!-- Divider -->
              <div class="relative my-8">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-[#d8d1ff]" />
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-[#9eabcd]">Or continue with</span>
                </div>
              </div>

              <!-- Social Login Buttons -->
              <div class="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  class="flex items-center justify-center gap-3 h-12 bg-white border border-[#d8d1ff] rounded-xl text-base font-medium text-[#3d589b] transition-all hover:border-[#7b66ff] hover:bg-[#f7f5ff] focus:outline-none focus:ring-2 focus:ring-[#7b66ff]/20 cursor-pointer"
                >
                  <svg class="size-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  class="flex items-center justify-center gap-3 h-12 bg-white border border-[#d8d1ff] rounded-xl text-base font-medium text-[#3d589b] transition-all hover:border-[#7b66ff] hover:bg-[#f7f5ff] focus:outline-none focus:ring-2 focus:ring-[#7b66ff]/20 cursor-pointer"
                >
                  <svg class="size-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>

              <!-- Switch Mode Prompt -->
              <p class="mt-8 text-center text-base text-[#3d589b]">
                {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
                <button
                  @click="switchMode"
                  class="ml-2 font-medium text-[#7b66ff] hover:text-[#6f5cf9] transition-colors cursor-pointer hover:underline"
                >
                  {{ isLogin ? 'Sign Up' : 'Sign In' }}
                </button>
              </p>
            </div>

            <!-- Decorative bottom elements -->
            <div class="absolute -bottom-10 -right-10 w-[200px] h-[200px] bg-[#7b66ff]/10 rounded-full blur-3xl pointer-events-none" />
            <div class="absolute -bottom-20 -left-20 w-[150px] h-[150px] bg-[#7b66ff]/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth-copy-enter-active,
.auth-copy-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.auth-copy-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.auth-copy-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>