import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'GameSelect',
    component: () => import('@/features/cheese-thief/views/GameSelectView.vue'),
  },
  {
    path: '/cheese-thief/setup',
    name: 'CheeseThiefSetup',
    component: () => import('@/features/cheese-thief/views/GameSetupView.vue'),
  },
  {
    path: '/cheese-thief/play',
    name: 'CheeseThiefPlay',
    component: () => import('@/features/cheese-thief/views/GamePlayView.vue'),
  },
  {
    path: '/avalon/setup',
    name: 'AvalonSetup',
    component: () => import('@/features/avalon/views/AvalonSetupView.vue'),
  },
  {
    path: '/avalon/play',
    name: 'AvalonPlay',
    component: () => import('@/features/avalon/views/AvalonPlayView.vue'),
  },
  {
    path: '/one-night-werewolf/setup',
    name: 'OnwSetup',
    component: () => import('@/features/one-night-werewolf/views/OnwSetupView.vue'),
  },
  {
    path: '/one-night-werewolf/play',
    name: 'OnwPlay',
    component: () => import('@/features/one-night-werewolf/views/OnwPlayView.vue'),
  },
  {
    path: '/witch-hunt/setup',
    name: 'WitchHuntSetup',
    component: () => import('@/features/witch-hunt/views/WitchHuntSetupView.vue'),
  },
  {
    path: '/witch-hunt/play',
    name: 'WitchHuntPlay',
    component: () => import('@/features/witch-hunt/views/WitchHuntPlayView.vue'),
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/features/cheese-thief/views/HistoryView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/features/cheese-thief/views/SettingsView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
