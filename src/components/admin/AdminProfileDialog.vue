<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import UiIcon from "@/components/company/UiIcon.vue";

const props = defineProps<{
  open: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
}>();

const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) emit("close");
}

function trapTab(event: KeyboardEvent) {
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const first = focusable.item(0);
  const last = focusable.item(focusable.length - 1);
  if (!first || !last) {
    event.preventDefault();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      window.addEventListener("keydown", onWindowKeydown);
      await nextTick();
      closeButton.value?.focus();
    } else {
      window.removeEventListener("keydown", onWindowKeydown);
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  },
);

onBeforeUnmount(() => window.removeEventListener("keydown", onWindowKeydown));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="profile-backdrop" @mousedown.self="emit('close')">
      <section
        ref="dialog"
        class="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        :aria-describedby="subtitle ? 'profile-dialog-subtitle' : undefined"
        @keydown="trapTab"
      >
        <header class="profile-dialog-header">
          <div>
            <p class="profile-dialog-eyebrow">{{ eyebrow }}</p>
            <h2 id="profile-dialog-title">{{ title }}</h2>
            <p v-if="subtitle" id="profile-dialog-subtitle" class="profile-dialog-subtitle">{{ subtitle }}</p>
          </div>
          <button ref="closeButton" class="profile-dialog-close" type="button" aria-label="Close profile" @click="emit('close')">
            <UiIcon name="close" :size="18" />
          </button>
        </header>
        <div class="profile-dialog-content"><slot /></div>
      </section>
    </div>
  </Teleport>
</template>

<style>
.profile-backdrop { position: fixed; z-index: 1000; inset: 0; padding: 24px; display: grid; place-items: center; overflow-y: auto; background: rgb(17 24 39 / 48%); backdrop-filter: blur(3px); }
.profile-dialog { width: min(100%, 680px); max-height: min(88vh, 820px); overflow: auto; scrollbar-width: none; -ms-overflow-style: none; border: 1px solid #e2e4e8; border-radius: 12px; background: #fff; box-shadow: 0 24px 80px rgb(17 24 39 / 24%); color: #19233c; }
.profile-dialog::-webkit-scrollbar { width: 0; height: 0; display: none; }
.profile-dialog-header { position: sticky; z-index: 2; top: 0; padding: 21px 24px 17px; border-bottom: 1px solid #e8eaf0; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; background: #fff; }
.profile-dialog-eyebrow { margin: 0 0 6px; color: #6250be; font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.profile-dialog-header h2 { margin: 0; overflow-wrap: anywhere; color: #19233c; font-size: clamp(21px, 4vw, 27px); font-weight: 650; line-height: 1.2; letter-spacing: -.035em; }
.profile-dialog-subtitle { margin: 6px 0 0; color: #657088; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.profile-dialog-close { width: 34px; height: 34px; flex: 0 0 auto; border: 1px solid #e2e4e8; border-radius: 7px; display: grid; place-items: center; background: #fff; color: #59657a; cursor: pointer; }
.profile-dialog-close:hover { border-color: #d5d0ee; background: #f5f3fc; color: #5643b9; }
.profile-dialog-close:focus-visible { outline: 3px solid rgb(106 86 207 / 28%); outline-offset: 2px; }
.profile-dialog-content { padding: 21px 24px 24px; }
@media (max-width: 560px) {
  .profile-backdrop { padding: 12px; align-items: end; }
  .profile-dialog { max-height: 92vh; border-radius: 12px 12px 8px 8px; }
  .profile-dialog-header { padding: 17px 17px 14px; }
  .profile-dialog-content { padding: 17px; }
}
</style>
