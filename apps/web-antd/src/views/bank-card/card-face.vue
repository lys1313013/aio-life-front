<script setup lang="ts">
import { computed, ref } from 'vue';

import {
  BankOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useAuthImageUrl } from '#/composables/useAuthImageUrl';
import { clearImageCache } from '#/utils/file';

import { defaultColor } from './model';

const props = defineProps<{
  bankCode?: string;
  bankName?: string;
  cardName?: null | string;
  cardType?: string;
  color?: null | string;
  fileId?: string;
  publicUrl?: null | string;
}>();
const retry = ref(0);
const { blobUrl, error, loading } = useAuthImageUrl(
  () => {
    void retry.value;
    return props.fileId;
  },
  () => props.publicUrl,
);
const hasImage = computed(
  () => props.fileId && blobUrl.value && !error.value && !loading.value,
);
</script>
<template>
  <div class="card-presentation">
    <div
      class="card-face"
      :class="{ 'has-image': hasImage, 'has-actions': $slots.actions }"
      :style="{ '--card-color': color || defaultColor(bankCode) }"
      :aria-busy="loading"
    >
      <img
        v-if="hasImage"
        :src="blobUrl"
        :alt="`${bankName || ''}卡面`"
        @error="error = true"
      />
      <template v-else>
        <div class="face-bank">
          <span class="bank-mark"><BankOutlined /></span
          ><span>{{ bankName || '选择银行' }}</span>
        </div>
        <div class="chip" aria-hidden="true"><span></span></div>
        <div class="face-bottom">
          <span class="product-name">{{
            cardName || bankCode || 'BANK CARD'
          }}</span
          ><span class="card-type">{{
            cardType === 'credit' ? '信用卡' : '储蓄卡'
          }}</span>
        </div>
        <div class="face-orbit" aria-hidden="true"></div>
      </template>
      <div
        v-if="loading"
        class="image-state"
        role="status"
        aria-label="加载卡面"
      >
        <LoadingOutlined spin />
      </div>
      <button
        v-else-if="error"
        class="image-state"
        type="button"
        aria-label="重试卡面图片"
        @click.stop="
          clearImageCache(fileId);
          retry++;
        "
      >
        <ReloadOutlined />
      </button>
      <div
        v-if="!hasImage && ($slots.number || $slots.actions)"
        class="face-overlay"
      >
        <div v-if="$slots.number" class="face-number">
          <slot name="number"></slot>
        </div>
        <div v-if="$slots.actions" class="face-actions">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
    <div
      v-if="$slots.caption || (hasImage && ($slots.number || $slots.actions))"
      class="card-footer"
    >
      <div v-if="$slots.caption" class="footer-caption">
        <slot name="caption"></slot>
      </div>
      <div v-if="hasImage && $slots.number" class="footer-number">
        <slot name="number"></slot>
      </div>
      <div v-if="hasImage && $slots.actions" class="footer-actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>
<style scoped>
.image-state {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.card-face {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  aspect-ratio: 1.586;
  border-radius: 16px;
  padding: 23px;
  background: linear-gradient(125deg, #ffffff12, #00000015), var(--card-color);
  color: #fff;
  box-shadow: 0 7px 20px #0000000c;
}
.card-face.has-image {
  padding: 0;
  background: transparent;
  box-shadow: none;
}
.card-face img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.face-bank {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 550;
  letter-spacing: 0.035em;
}
.has-actions .face-bank {
  padding-right: 34px;
}
.face-bank > span:last-child {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.face-number {
  position: absolute;
  inset: 47% 23px auto 69px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 27px;
  line-height: 20px;
  text-align: right;
}
.face-actions {
  position: absolute;
  top: 23px;
  right: 16px;
}
.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 3px 0;
  color: hsl(var(--foreground));
}
.footer-caption {
  flex: 1;
  min-width: 0;
}
.footer-number {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 65%;
  margin-left: auto;
  color: hsl(var(--muted-foreground));
  text-align: right;
}
.footer-number :deep(.card-number) {
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0.025em;
  overflow-wrap: anywhere;
}
.footer-actions {
  flex: none;
}
.card-footer .footer-actions :deep(.ant-btn) {
  width: 44px;
  height: 44px;
  border-radius: 10px;
}
.card-footer .footer-actions :deep(.ant-btn:hover),
.card-footer .footer-actions :deep(.ant-btn:focus-visible) {
  background: hsl(var(--muted));
}
.bank-mark {
  display: grid;
  place-items: center;
  width: 33px;
  height: 33px;
  border-radius: 50%;
  background: #ffffff18;
  font-size: 19px;
  flex-shrink: 0;
}
.chip {
  position: absolute;
  top: 47%;
  width: 34px;
  height: 27px;
  border-radius: 6px;
  border: 1px solid #ffffff45;
  background: linear-gradient(135deg, #e4d6af95, #cbb98740);
  overflow: hidden;
}
.chip::before,
.chip::after {
  content: '';
  position: absolute;
  top: 9px;
  width: 100%;
  height: 1px;
  background: #ffffff45;
}
.chip::after {
  top: 17px;
}
.chip span {
  display: block;
  width: 15px;
  height: 100%;
  margin: auto;
  border-inline: 1px solid #ffffff45;
}
.face-bottom {
  position: absolute;
  inset: auto 23px 23px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}
.product-name {
  font-size: 12px;
  letter-spacing: 0.08em;
  opacity: 0.85;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card-type {
  font-size: 11px;
  letter-spacing: 0.1em;
  opacity: 0.7;
  flex-shrink: 0;
}
.face-orbit {
  position: absolute;
  z-index: -1;
  width: 260px;
  height: 260px;
  right: -115px;
  top: -36px;
  border: 1px solid #ffffff0d;
  border-radius: 50%;
  box-shadow:
    0 0 0 26px #ffffff04,
    0 0 0 62px #ffffff03;
}
@media (max-width: 420px) {
  .card-face {
    padding: 20px;
  }
  .face-number {
    inset-inline: 66px 20px;
  }
  .face-actions {
    top: 20px;
    right: 13px;
  }
  .face-bottom {
    inset-inline: 20px;
    bottom: 20px;
  }
}
</style>
