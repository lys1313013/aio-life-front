<template>
    <a-card
      style="width: 100%"
      :tab-list="tabListNoTitle"
      :active-tab-key="noTitleKey"
      @tabChange="key => onTabChange(key, 'noTitleKey')"
    >
      <p v-if="noTitleKey === 'article'">article content</p>
      <p v-else-if="noTitleKey === 'app'">app content</p>
      <p v-else>project content</p>
    </a-card>
  </template>
  <script lang="ts" setup>
  import { Card } from 'ant-design-vue';
  import { HomeOutlined } from '@ant-design/icons-vue';
  import { ref } from 'vue';
  const aCard = Card;
  const tabListNoTitle = [
    {
      key: 'article',
      tab: 'article',
    },
    {
      key: 'app',
      tab: 'app',
    },
    {
      key: 'project',
      tab: 'project',
    },
  ];
  const key = ref('tab1');
  const noTitleKey = ref('app');
  
  const onTabChange = (value: string, type: string) => {
    console.log(value, type);
    if (type === 'key') {
      key.value = value;
    } else if (type === 'noTitleKey') {
      noTitleKey.value = value;
    }
  };
  </script>
  
  