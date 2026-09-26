import type { IconifyIcon } from '@iconify/vue';

import type { PropType } from 'vue';

import { defineComponent, h, ref, watch } from 'vue';

import { Icon, iconLoaded } from '@iconify/vue';

import { hasLocalIconCollection, loadLocalIconCollection } from './local-icons';

/** Covers saved icons rendered directly, without first opening the picker. */
export default defineComponent({
  name: 'LocalIconifyIcon',
  inheritAttrs: false,
  props: {
    icon: {
      type: [String, Object] as PropType<IconifyIcon | string>,
      required: true,
    },
  },
  setup(props, { attrs, slots }) {
    const ready = ref(false);
    watch(
      () => props.icon,
      async (icon, _, onCleanup) => {
        let stale = false;
        onCleanup(() => {
          stale = true;
        });
        const prefix =
          typeof icon === 'string' ? icon.split(':')[0] : undefined;
        if (
          typeof icon !== 'string' ||
          !prefix ||
          !hasLocalIconCollection(prefix) ||
          iconLoaded(icon)
        ) {
          ready.value = true;
          return;
        }
        ready.value = false;
        try {
          await loadLocalIconCollection(prefix);
          if (!stale) ready.value = iconLoaded(icon);
        } catch (error) {
          console.error(`Failed to load local icon ${icon}:`, error);
        }
      },
      { immediate: true },
    );
    return () =>
      ready.value
        ? h(Icon, { ...attrs, icon: props.icon }, slots)
        : h('span', { ...attrs, 'aria-hidden': 'true' });
  },
});
