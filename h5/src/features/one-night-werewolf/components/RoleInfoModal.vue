<script setup lang="ts">
import { computed } from 'vue'
import { ONW_ROLES, getFactionColor, getFactionLabel } from '@/types/one-night-werewolf'
import type { OnwRoleId } from '@/types/one-night-werewolf'

const props = defineProps<{
  roleId: OnwRoleId | null
  roleImg?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const role = computed(() => {
  if (!props.roleId) return null
  return ONW_ROLES[props.roleId]
})

const factionColor = computed(() => role.value ? getFactionColor(role.value.faction) : '#999')
const factionLabel = computed(() => role.value ? getFactionLabel(role.value.faction) : '')

const nightActionLabel = computed(() => {
  if (!role.value) return ''
  if (!role.value.hasNightAction) return '無夜晚行動'
  return `夜晚順序：第 ${role.value.nightOrder} 位`
})
</script>

<template>
  <Transition name="modal">
    <div v-if="roleId && role" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-card">
        <!-- Close button -->
        <button class="modal-close" @click="emit('close')">&times;</button>

        <!-- Role image -->
        <div class="modal-img-wrap" :style="{ borderColor: factionColor }">
          <img
            v-if="roleImg"
            :src="roleImg"
            :alt="role.name"
            class="modal-img"
          />
          <div
            class="modal-img-glow"
            :style="{ background: `radial-gradient(ellipse at center, ${factionColor}22 0%, transparent 70%)` }"
          ></div>
        </div>

        <!-- Role info -->
        <h2 class="modal-name">{{ role.name }}</h2>

        <div class="modal-faction" :style="{ color: factionColor }">
          <span class="faction-dot" :style="{ background: factionColor }"></span>
          {{ factionLabel }}陣營
        </div>

        <!-- Description -->
        <div class="modal-section">
          <h3 class="modal-section-title">角色說明</h3>
          <p class="modal-text">{{ role.description }}</p>
        </div>

        <!-- Night Action -->
        <div class="modal-section">
          <h3 class="modal-section-title">夜晚行動</h3>
          <div class="night-info">
            <span
              class="night-badge"
              :class="{ 'night-badge--active': role.hasNightAction, 'night-badge--none': !role.hasNightAction }"
            >
              {{ role.hasNightAction ? '有行動' : '無行動' }}
            </span>
            <span class="night-order">{{ nightActionLabel }}</span>
          </div>
          <p class="modal-text">{{ role.nightInstruction }}</p>
        </div>

        <!-- Tips -->
        <div v-if="role.id === 'werewolf'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">若為孤狼（場上只有一張狼人牌），可以查看一張中間牌獲取額外資訊，有助於偽裝。</p>
        </div>
        <div v-else-if="role.id === 'minion'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">即使你被淘汰，只要狼人安全，狼人陣營仍然獲勝。保護狼人是你的首要目標。</p>
        </div>
        <div v-else-if="role.id === 'robber'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">交換後你的角色變了！如果偷到狼人牌，你現在就是狼人陣營。</p>
        </div>
        <div v-else-if="role.id === 'tanner'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">讓自己看起來可疑但不太可疑。你的目標是被淘汰！</p>
        </div>
        <div v-else-if="role.id === 'hunter'" class="modal-section modal-tip">
          <h3 class="modal-section-title">特殊能力</h3>
          <p class="modal-text">如果你被淘汰，你在投票時指向的玩家也會被一併淘汰。</p>
        </div>
        <div v-else-if="role.id === 'mason'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">兩名守夜人互相確認身份後，可以在白天互相信任。若只看到自己，另一名守夜人可能在中間牌。</p>
        </div>
        <div v-else-if="role.id === 'drunk'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">你已經不是酒鬼了！你的牌被換成了中間牌，但你不知道換到了什麼。</p>
        </div>
        <div v-else-if="role.id === 'insomniac'" class="modal-section modal-tip">
          <h3 class="modal-section-title">策略提示</h3>
          <p class="modal-text">你能確認自己的牌有沒有被換，這是非常有力的資訊。善加利用！</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: var(--space-lg);
}

.modal-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  max-width: 360px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.modal-close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  font-size: var(--font-xl);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  border-radius: 50%;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  z-index: 1;
}

.modal-close:active {
  background: var(--color-border);
}

/* Image */
.modal-img-wrap {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 3px solid;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.modal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.modal-img-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Name & faction */
.modal-name {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: var(--color-text);
  text-align: center;
}

.modal-faction {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-sm);
  font-weight: 700;
}

.faction-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* Sections */
.modal-section {
  width: 100%;
  padding: var(--space-md);
  background: var(--color-bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.modal-section-title {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.modal-text {
  font-size: var(--font-sm);
  color: var(--color-text);
  line-height: 1.6;
}

/* Night info */
.night-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.night-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
}

.night-badge--active {
  background: rgba(66, 165, 245, 0.15);
  color: #1565C0;
}

.night-badge--none {
  background: rgba(158, 158, 158, 0.15);
  color: #757575;
}

.night-order {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

/* Tip */
.modal-tip {
  border-color: rgba(255, 193, 7, 0.3);
  background: rgba(255, 193, 7, 0.05);
}

/* Transition */
.modal-enter-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-leave-active .modal-card {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .modal-card {
  transform: scale(0.9);
  opacity: 0;
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .modal-card {
  transform: scale(0.9);
  opacity: 0;
}
</style>
