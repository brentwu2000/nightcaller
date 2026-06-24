import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CountdownTimer from '@/components/CountdownTimer.vue'

describe('CountdownTimer', () => {
  describe('time formatting', () => {
    it('should display seconds only when remaining is less than 60', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 45, total: 60 },
      })
      expect(wrapper.text()).toContain('45')
    })

    it('should display MM:SS format when remaining is 60 seconds or more', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 90, total: 300 },
      })
      expect(wrapper.text()).toContain('1:30')
    })

    it('should pad seconds to two digits in MM:SS format', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 65, total: 300 },
      })
      expect(wrapper.text()).toContain('1:05')
    })

    it('should display "0" when remaining is 0', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 0, total: 60 },
      })
      expect(wrapper.find('.timer-display').text()).toBe('0')
    })

    it('should display "3:00" for 180 seconds', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 180, total: 300 },
      })
      expect(wrapper.text()).toContain('3:00')
    })

    it('should display "10:00" for 600 seconds', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 600, total: 600 },
      })
      expect(wrapper.text()).toContain('10:00')
    })
  })

  describe('progress bar', () => {
    it('should not render the progress bar when showProgress is false', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60, showProgress: false },
      })
      expect(wrapper.find('.timer-progress').exists()).toBe(false)
    })

    it('should render the progress bar when showProgress is true', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60, showProgress: true },
      })
      expect(wrapper.find('.timer-progress').exists()).toBe(true)
    })

    it('should set progress bar width to 50% when half elapsed', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60, showProgress: true },
      })
      const bar = wrapper.find('.timer-progress-bar')
      expect(bar.attributes('style')).toContain('50%')
    })

    it('should set progress bar width to 0% at the start (remaining equals total)', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 60, total: 60, showProgress: true },
      })
      const bar = wrapper.find('.timer-progress-bar')
      expect(bar.attributes('style')).toContain('0%')
    })

    it('should set progress bar width to 100% when completed', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 0, total: 60, showProgress: true },
      })
      const bar = wrapper.find('.timer-progress-bar')
      expect(bar.attributes('style')).toContain('100%')
    })
  })

  describe('urgency state', () => {
    it('should not have urgent class when remaining is above the default threshold', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60 },
      })
      expect(wrapper.classes()).not.toContain('urgent')
    })

    it('should apply urgent class when remaining is at or below default threshold (10s)', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 10, total: 60 },
      })
      expect(wrapper.classes()).toContain('urgent')
    })

    it('should apply urgent class when remaining is below default threshold', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 5, total: 60 },
      })
      expect(wrapper.classes()).toContain('urgent')
    })

    it('should not apply urgent class when remaining is 0 (completed)', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 0, total: 60 },
      })
      // isUrgent requires remaining > 0
      expect(wrapper.classes()).not.toContain('urgent')
    })

    it('should respect a custom urgentThreshold prop', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 25, total: 60, urgentThreshold: 30 },
      })
      expect(wrapper.classes()).toContain('urgent')
    })

    it('should not be urgent when remaining exceeds the custom threshold', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 35, total: 60, urgentThreshold: 30 },
      })
      expect(wrapper.classes()).not.toContain('urgent')
    })
  })

  describe('size variants', () => {
    it('should apply timer-md class by default', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60 },
      })
      expect(wrapper.classes()).toContain('timer-md')
    })

    it('should apply timer-lg class when size is lg', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60, size: 'lg' },
      })
      expect(wrapper.classes()).toContain('timer-lg')
    })

    it('should apply timer-xl class when size is xl', () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 30, total: 60, size: 'xl' },
      })
      expect(wrapper.classes()).toContain('timer-xl')
    })
  })

  describe('props reactivity', () => {
    it('should update displayed time when remaining prop changes', async () => {
      const wrapper = mount(CountdownTimer, {
        props: { remaining: 60, total: 60 },
      })
      expect(wrapper.find('.timer-display').text()).toBe('1:00')

      await wrapper.setProps({ remaining: 30 })
      expect(wrapper.find('.timer-display').text()).toBe('30')
    })
  })
})
