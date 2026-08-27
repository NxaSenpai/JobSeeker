import { animate, stagger } from 'animejs'
import { nextTick, onBeforeUnmount, onMounted, type Ref, watch } from 'vue'
import { useRoute } from 'vue-router'

type AnimatedTarget = HTMLElement
type PageAnimation = ReturnType<typeof animate>

export function usePageMotion(root: Ref<HTMLElement | null>) {
  const route = useRoute()
  let animations: PageAnimation[] = []
  let clickHandler: ((event: PointerEvent) => void) | undefined
  let reducedMotion = false

  const clearInlineStyles = (targets: AnimatedTarget[]) => {
    targets.forEach((target) => {
      target.style.removeProperty('opacity')
      target.style.removeProperty('transform')
      target.style.removeProperty('scale')
    })
  }

  const play = async () => {
    await nextTick()
    const element = root.value
    if (!element) return

    animations.forEach((animation) => animation.cancel())
    animations = []

    const targets = Array.from(
      new Set(
        Array.from(
          element.querySelectorAll<AnimatedTarget>(
            '[data-reveal], main > *, main article, main aside, main form, main nav, header, footer',
          ),
        ),
      ),
    )
    const pageTargets = targets.length ? targets : [element]

    if (reducedMotion) {
      clearInlineStyles(pageTargets)
      return
    }

    pageTargets.forEach((target) => {
      target.style.opacity = '0'
      target.style.transform = 'translateY(18px)'
    })

    const entrance = animate(pageTargets, {
      opacity: [0, 1],
      y: [18, 0],
      delay: stagger(55, { start: 70 }),
      duration: 680,
      ease: 'out(4)',
    })
    animations.push(entrance)
  }

  const addClickFeedback = () => {
    const element = root.value
    if (!element || reducedMotion) return

    clickHandler = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button, a')
      if (!target || !element.contains(target)) return

      animate(target, {
        scale: [1, 0.96, 1],
        duration: 260,
        ease: 'out(3)',
      })
    }

    element.addEventListener('pointerdown', clickHandler)
  }

  onMounted(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    void play()
    addClickFeedback()
  })

  watch(() => route.fullPath, () => {
    void play()
  })

  onBeforeUnmount(() => {
    animations.forEach((animation) => animation.cancel())
    if (clickHandler && root.value) root.value.removeEventListener('pointerdown', clickHandler)
  })
}
