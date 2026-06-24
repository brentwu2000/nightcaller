<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const appVersion = __APP_VERSION__

interface GameTemplate {
  id: string
  name: string
  nameEn: string
  description: string
  playerRange: string
  duration: string
  available: boolean
  image?: string
  featuredImage: string
  emoji?: string
}

const allGames: GameTemplate[] = [
  {
    id: 'cheese-thief',
    name: '奶酪大盜',
    nameEn: 'Cheese Thief',
    description: '大盜潛入偷走了奶酪！瞌睡鼠們能找出大盜嗎？',
    playerRange: '4-8 人',
    duration: '20-30',
    available: true,
    image: 'https://shop.painkillerbg.com/cdn/shop/files/pic6951766_1024x1024.jpg?v=1744730663',
    featuredImage: 'https://shop.painkillerbg.com/cdn/shop/files/pic6951766_1024x1024.jpg?v=1744730663',
  },
  {
    id: 'one-night-werewolf',
    name: '一夜終極狼人',
    nameEn: 'One Night Werewolf',
    description: '一個夜晚，一場推理！快節奏狼人殺',
    playerRange: '3-10 人',
    duration: '10-15',
    available: true,
    image: 'https://cdn.shopify.com/s/files/1/0740/4855/products/ONUW_272896be-e795-4aec-9e37-ccd43ca0872d.png?v=1653932533',
    featuredImage: 'https://cdn.shopify.com/s/files/1/0740/4855/products/ONUW_272896be-e795-4aec-9e37-ccd43ca0872d.png?v=1653932533',
  },
  {
    id: 'avalon',
    name: '阿瓦隆',
    nameEn: 'Avalon',
    description: '亞瑟王的忠臣與邪惡勢力的對決',
    playerRange: '5-10 人',
    duration: '30-45',
    available: true,
    image: 'https://shop.painkillerbg.com/cdn/shop/products/pic1398895_1_1024x1024.jpg?v=1589062770',
    featuredImage: 'https://shop.painkillerbg.com/cdn/shop/products/pic1398895_1_1024x1024.jpg?v=1589062770',
  },
  {
    id: 'witch-hunt',
    name: '獵巫鎮',
    nameEn: 'Witch Hunt',
    description: '中世紀獵巫審判，死後化身天使或惡魔繼續戰鬥',
    playerRange: '6-12 人',
    duration: '30-60',
    available: true,
    image: 'https://facadegames.com/cdn/shop/products/Salem_1692_1024x1024.png?v=1606917628',
    featuredImage: 'https://facadegames.com/cdn/shop/files/1600x1000_Salem_2000x.jpg?v=1685631440',
  },
]

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const games = shuffle(allGames)
const featured = computed(() => games[0])
const otherGames = computed(() => games.slice(1))

/**
 * Pre-play a silent TTS utterance inside the user click gesture
 * to unlock iOS Safari's audio policy for speechSynthesis.
 */
function unlockTts(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(' ')
  utterance.volume = 0.01
  utterance.rate = 2
  utterance.lang = 'zh-TW'
  window.speechSynthesis.speak(utterance)
  // Cancel immediately so the user hears nothing
  setTimeout(() => window.speechSynthesis.cancel(), 100)
}

function selectGame(game: GameTemplate): void {
  if (game.available) {
    unlockTts()
    router.push(`/${game.id}/setup`)
  }
}


</script>

<template>
  <div class="select-page">
    <!-- Header -->
    <header class="select-header">
      <h1 class="header-title">選擇遊戲</h1>
    </header>

    <!-- Scrollable content -->
    <div class="select-content">
      <!-- Featured game card -->
      <button
        class="featured-card"
        @click="selectGame(featured)"
      >
        <img
          :src="featured.featuredImage"
          :alt="featured.name"
          class="featured-img"
          loading="eager"
        />
        <div class="featured-scrim"></div>
        <div class="featured-overlay">
          <h2 class="featured-name">{{ featured.name }}</h2>
          <p class="featured-desc">{{ featured.description }}</p>
          <div class="featured-bottom">
            <div class="featured-meta">
              <span class="meta-item">
                <span class="meta-icon">&#x1F465;</span>
                <span>{{ featured.playerRange.replace(' 人', '') }}</span>
                <span class="meta-unit">玩家</span>
              </span>
              <span class="meta-item">
                <span class="meta-icon">&#x1F551;</span>
                <span>{{ featured.duration }}</span>
                <span class="meta-unit">分鐘</span>
              </span>
            </div>
            <span class="featured-btn">開始遊戲</span>
          </div>
        </div>
      </button>

      <!-- Other games grid -->
      <div class="games-grid">
        <button
          v-for="game in otherGames"
          :key="game.id"
          class="game-card-mini"
          :class="{ disabled: !game.available }"
          @click="selectGame(game)"
        >
          <div class="mini-illustration">
            <img
              v-if="game.image"
              :src="game.image"
              :alt="game.name"
              class="mini-img"
            />
            <span v-else>{{ game.emoji || '&#x2694;' }}</span>
          </div>
          <div class="mini-body">
            <h3 class="mini-name">{{ game.name }}</h3>
            <div class="mini-meta">
              <span>{{ game.playerRange }}</span>
              <span v-if="!game.available" class="coming-soon">即將推出</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Version footer -->
    <div class="version-footer">
      v{{ appVersion }}
    </div>
  </div>
</template>

<style scoped>
.select-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg);
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

/* Header */
.select-header {
  background: var(--color-primary);
  padding: var(--space-lg) var(--space-lg);
  padding-top: calc(var(--space-lg) + env(safe-area-inset-top, 0px));
  text-align: center;
}

.header-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-text-on-primary);
}

/* Content — scrollable area between header and tab bar */
.select-content {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
  min-height: 0;
}

/* Featured card */
.featured-card {
  width: 100%;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  text-align: left;
  position: relative;
  margin-bottom: var(--space-xl);
  aspect-ratio: 4 / 3;
}

.featured-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  display: block;
}

.featured-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

.featured-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--space-xl);
}

.featured-name {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
  margin-bottom: var(--space-xs);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.featured-desc {
  font-size: var(--font-sm);
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: var(--space-md);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.featured-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.featured-meta {
  display: flex;
  gap: var(--space-lg);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: #FFFFFF;
  font-weight: 600;
  font-size: var(--font-sm);
}

.meta-icon {
  font-size: var(--font-md);
}

.meta-unit {
  font-weight: 400;
  opacity: 0.7;
}

.featured-btn {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  padding: var(--space-sm) var(--space-xl);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-sm);
  white-space: nowrap;
}

/* Games grid */
.games-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.game-card-mini {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  text-align: left;
  transition: transform var(--anim-micro) ease;
}

.game-card-mini:active:not(.disabled) {
  transform: scale(0.97);
}

.game-card-mini.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-illustration {
  background: var(--color-bg-card-variant);
  padding: var(--space-lg);
  text-align: center;
  font-size: 48px;
  line-height: 1;
  overflow: hidden;
}

.mini-illustration:has(.mini-img) {
  padding: 0;
}

.mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 25%;
  display: block;
  aspect-ratio: 16 / 10;
}

.mini-body {
  padding: var(--space-md);
}

.mini-name {
  font-size: var(--font-md);
  font-weight: 700;
  margin-bottom: var(--space-xs);
}

.mini-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.coming-soon {
  font-style: italic;
  color: var(--color-text-muted);
}

.version-footer {
  text-align: center;
  padding: var(--space-md);
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.4;
  flex-shrink: 0;
}
</style>
