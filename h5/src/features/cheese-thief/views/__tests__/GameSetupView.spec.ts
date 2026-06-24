import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// ---------------------------------------------------------------------------
// Mocks that must be set up before the component is imported
// ---------------------------------------------------------------------------

const mockSpeak = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useTts', () => ({
  useTts: () => ({
    speak: mockSpeak,
    stop: vi.fn(),
    isSpeaking: { value: false },
    isSupported: { value: true },
  }),
}))

// Stub child components that would load real audio/speech in tests
vi.mock('@/components/VolumeSlider.vue', () => ({
  default: {
    name: 'VolumeSlider',
    props: ['modelValue', 'label', 'min', 'max', 'step'],
    template: '<input type="range" :value="modelValue" @input="$emit(\'update:modelValue\', +$event.target.value)" />',
    emits: ['update:modelValue'],
  },
}))

import GameSetupView from '@/features/cheese-thief/views/GameSetupView.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' } },
      { path: '/cheese-thief/play', component: { template: '<div/>' } },
      { path: '/cheese-thief/setup', component: GameSetupView },
    ],
  })
}

async function mountSetupView() {
  const router = createTestRouter()
  await router.push('/cheese-thief/setup')
  await router.isReady()

  setActivePinia(createPinia())

  const wrapper = mount(GameSetupView, {
    global: {
      plugins: [router, createPinia()],
    },
  })

  return { wrapper, router }
}

describe('GameSetupView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('player count selection', () => {
    it('should render player count buttons for 4, 5, 6, 7, 8', async () => {
      const { wrapper } = await mountSetupView()
      const buttons = wrapper.findAll('.player-btn')
      const values = buttons.map((b) => b.text().trim())
      expect(values).toEqual(['4', '5', '6', '7', '8'])
    })

    it('should have 6 selected as the default player count', async () => {
      const { wrapper } = await mountSetupView()
      const activeBtn = wrapper.find('.player-btn.active')
      expect(activeBtn.text().trim()).toBe('6')
    })

    it('should update active player count when a button is clicked', async () => {
      const { wrapper } = await mountSetupView()
      const buttons = wrapper.findAll('.player-btn')

      // Click the button for 4 players
      await buttons[0].trigger('click')

      const activeBtn = wrapper.find('.player-btn.active')
      expect(activeBtn.text().trim()).toBe('4')
    })

    it('should support selecting any player count from 4 to 8', async () => {
      const { wrapper } = await mountSetupView()
      const buttons = wrapper.findAll('.player-btn')

      for (let i = 0; i < buttons.length; i++) {
        await buttons[i].trigger('click')
        const active = wrapper.find('.player-btn.active')
        expect(active.text().trim()).toBe(String(i + 4))
      }
    })
  })

  describe('role composition display', () => {
    it('should display 4 role chips (大盜, 共犯, 背鍋鼠, 瞌睡鼠)', async () => {
      const { wrapper } = await mountSetupView()
      const chips = wrapper.findAll('.role-card')
      expect(chips).toHaveLength(4)
    })

    it('should show correct role composition for 6 players by default', async () => {
      const { wrapper } = await mountSetupView()
      const chips = wrapper.findAll('.role-card')

      // 6 players: thief=1, accomplice=1, scapegoat=1, villager=3
      const counts = chips.map((c) => c.find('.role-count').text().trim())
      expect(counts).toEqual(['1', '1', '1', '3'])
    })

    it('should update role composition when player count changes to 4', async () => {
      const { wrapper } = await mountSetupView()

      const btn4 = wrapper.findAll('.player-btn')[0]
      await btn4.trigger('click')

      const chips = wrapper.findAll('.role-card')
      // 4 players: thief=1, accomplice=0, scapegoat=1, villager=2
      const counts = chips.map((c) => c.find('.role-count').text().trim())
      expect(counts).toEqual(['1', '0', '1', '2'])
    })

    it('should update role composition when player count changes to 8', async () => {
      const { wrapper } = await mountSetupView()

      const btn8 = wrapper.findAll('.player-btn')[4]
      await btn8.trigger('click')

      const chips = wrapper.findAll('.role-card')
      // 8 players: thief=1, accomplice=2, scapegoat=1, villager=4
      const counts = chips.map((c) => c.find('.role-count').text().trim())
      expect(counts).toEqual(['1', '2', '1', '4'])
    })
  })

  describe('time settings', () => {
    it('should have a "開始遊戲" button', async () => {
      const { wrapper } = await mountSetupView()
      const startBtn = wrapper.find('.btn-primary')
      expect(startBtn.text()).toContain('開始遊戲')
    })

    it('should have a "規則語音說明" button', async () => {
      const { wrapper } = await mountSetupView()
      expect(wrapper.text()).toContain('規則語音說明')
    })
  })

  describe('speakRules()', () => {
    it('should call speak when "規則語音說明" is clicked', async () => {
      const { wrapper } = await mountSetupView()
      const rulesBtn = wrapper.findAll('button').find((b) => b.text().includes('規則語音說明'))
      await rulesBtn!.trigger('click')
      expect(mockSpeak).toHaveBeenCalledTimes(1)
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('奶酪大盜'),
        expect.any(Object),
      )
    })
  })

  describe('startGame()', () => {
    it('should navigate to /cheese-thief/play when "開始遊戲" is clicked', async () => {
      const { wrapper, router } = await mountSetupView()
      const startBtn = wrapper.find('.btn-primary')
      await startBtn.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/cheese-thief/play')
    })

    it('should include the game config as a query parameter', async () => {
      const { wrapper, router } = await mountSetupView()
      const startBtn = wrapper.find('.btn-primary')
      await startBtn.trigger('click')
      await flushPromises()

      const query = router.currentRoute.value.query
      expect(query.config).toBeDefined()

      const config = JSON.parse(decodeURIComponent(query.config as string))
      expect(config).toHaveProperty('playerCount')
      expect(config).toHaveProperty('discussionMinutes')
      expect(config).toHaveProperty('votingSeconds')
    })

    it('should pass the selected player count in the config', async () => {
      const { wrapper, router } = await mountSetupView()

      // Select 7 players
      const btn7 = wrapper.findAll('.player-btn')[3]
      await btn7.trigger('click')

      const startBtn = wrapper.find('.btn-primary')
      await startBtn.trigger('click')
      await flushPromises()

      const query = router.currentRoute.value.query
      const config = JSON.parse(decodeURIComponent(query.config as string))
      expect(config.playerCount).toBe(7)
    })
  })

  describe('back navigation', () => {
    it('should navigate back to "/" when the back button is clicked', async () => {
      const { wrapper, router } = await mountSetupView()
      const backBtn = wrapper.find('.btn-back')
      await backBtn.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/')
    })
  })
})
