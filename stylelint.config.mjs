export default {
  extends: ['@vben/stylelint-config'],
  rules: {
    'declaration-property-value-no-unknown': [
      true,
      {
        ignoreProperties: {
          '/.+/': [String.raw`/v-bind\(.+\)/`],
        },
      },
    ],
  },
  root: true,
};
