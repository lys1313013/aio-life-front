import { type Duration } from './util.js';
import { type RequestInfo, type RequestInit, minimist } from './vendor.js';
export { default as path } from 'node:path';
export * as os from 'node:os';
type ArgvOpts = minimist.Opts & {
    camelCase?: boolean;
    parseBoolean?: boolean;
};
export declare const parseArgv: (args?: string[], opts?: ArgvOpts) => minimist.ParsedArgs;
export declare function updateArgv(args?: string[], opts?: ArgvOpts): void;
export declare const argv: minimist.ParsedArgs;
export declare function sleep(duration: Duration): Promise<void>;
export declare function fetch(url: RequestInfo, init?: RequestInit): Promise<Response>;
export declare function echo(...args: any[]): void;
export declare function question(query?: string, options?: {
    choices: string[];
}): Promise<string>;
export declare function stdin(): Promise<string>;
export declare function retry<T>(count: number, callback: () => T): Promise<T>;
export declare function retry<T>(count: number, duration: Duration | Generator<number>, callback: () => T): Promise<T>;
export declare function expBackoff(max?: Duration, rand?: Duration): Generator<number, void, unknown>;
export declare function spinner<T>(callback: () => T): Promise<T>;
export declare function spinner<T>(title: string, callback: () => T): Promise<T>;
