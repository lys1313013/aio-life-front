import * as eslint from 'eslint';
import * as eslint_plugin_turbo from 'eslint-plugin-turbo';

declare const _default: {
    plugins: {
        turbo: {
            meta: {
                name: string;
                version: string;
            };
            rules: {
                [x: string]: {
                    create: (context: eslint_plugin_turbo.RuleContextWithOptions) => eslint.Rule.RuleListener;
                    meta: eslint.Rule.RuleMetaData;
                };
            };
            configs: {
                recommended: {
                    settings: {
                        turbo: {
                            cacheKey: number | eslint_plugin_turbo.ProjectKey;
                        };
                    };
                    plugins: string[];
                    rules: {
                        [x: string]: "error";
                    };
                };
                "flat/recommended": {
                    plugins: {
                        readonly turbo: eslint.ESLint.Plugin;
                    };
                    name: string;
                    rules: {
                        [x: string]: "error";
                    };
                    settings: {
                        turbo: {
                            cacheKey: number | eslint_plugin_turbo.ProjectKey;
                        };
                    };
                };
            };
        };
    };
    rules: {
        "turbo/no-undeclared-env-vars": "error";
    };
}[];

export { _default as default };
