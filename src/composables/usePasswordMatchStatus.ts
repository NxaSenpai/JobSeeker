import { onScopeDispose, ref, watch, type Ref } from 'vue'

export type PasswordMatchStatus = 'match' | 'mismatch' | null

export function usePasswordMatchStatus(
  password: Ref<string>,
  confirmation: Ref<string>,
  delay = 1200,
) {
  const status = ref<PasswordMatchStatus>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch([password, confirmation], ([passwordValue, confirmationValue]) => {
    if (timer) clearTimeout(timer)
    status.value = null
    if (!passwordValue || !confirmationValue) return

    timer = setTimeout(() => {
      status.value = passwordValue === confirmationValue ? 'match' : 'mismatch'
    }, delay)
  })

  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
  })

  return status
}
