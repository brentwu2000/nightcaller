import { createApp, defineComponent, type App } from 'vue'
import { createPinia } from 'pinia'

/**
 * Runs a composable inside a real Vue component so that lifecycle hooks
 * (onMounted, onUnmounted, etc.) work correctly in unit tests.
 *
 * Returns the composable's return value and an unmount function.
 */
export function withSetup<T>(composable: () => T): {
  result: T
  unmount: () => void
  app: App
} {
  let result!: T

  const app = createApp(
    defineComponent({
      setup() {
        result = composable()
        // Suppress Vue's "template required" warning
        return () => null
      },
    }),
  )

  // Install Pinia so stores work inside composables
  app.use(createPinia())
  app.mount(document.createElement('div'))

  return {
    result,
    unmount: () => app.unmount(),
    app,
  }
}
