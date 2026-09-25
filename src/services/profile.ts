import { computed, shallowRef } from 'vue'
import type { CandidateProfile } from './candidate'

// The navbar stays mounted while account pages change. Keeping the latest
// profile response here lets profile edits update that shared chrome instantly.
const profileState = shallowRef<CandidateProfile | null>(null)

export const currentCandidateProfile = computed(() => profileState.value)

export function setCandidateProfile(profile: CandidateProfile | null) {
  profileState.value = profile ? { ...profile } : null
}
