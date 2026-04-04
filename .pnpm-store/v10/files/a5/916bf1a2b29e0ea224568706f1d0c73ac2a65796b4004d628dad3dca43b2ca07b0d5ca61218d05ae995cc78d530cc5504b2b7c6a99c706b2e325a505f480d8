import type { PluginOptions, PrefixItem } from './types';
import type { Rule } from 'postcss';
export interface Options {
    processedPrefixes: PrefixItem[];
    mixHashPriority: boolean;
    tokens: PluginOptions['tokens'];
}
export interface DefineFixOptions {
    name: string;
    selectors: string[];
    handleRule: (rule: Rule, options: Options) => void;
}
export declare function defineFix(options: DefineFixOptions): {
    name: string;
    selectors: string[];
    handleRule: (rule: Rule, options: Options) => void;
};
export declare function getAntdSelectors(prefixClsArr: string[]): string[];
export declare function getIncludeSelector(prefixClsArr: string[]): string;
export declare function getExcludeSelector(prefixClsArr: string[], hashPriority?: 'low' | 'high'): string;
