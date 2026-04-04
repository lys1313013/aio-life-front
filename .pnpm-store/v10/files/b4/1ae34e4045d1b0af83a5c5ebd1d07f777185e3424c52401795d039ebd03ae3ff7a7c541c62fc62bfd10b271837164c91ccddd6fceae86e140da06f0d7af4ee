interface DetectOptions {
    /**
     * Base path to execute command.
     * @default process.cwd()
     */
    cwd?: string;
    /**
     * Whether to use absolute path.
     * @default false
     */
    absolute?: boolean;
    /**
     * Glob patterns to exclude from matches.
     * @default node_modules/.git/dist
     */
    ignore?: string[];
    /**
     * Glob pattern to filter output circles.
     * @default ['node_modules']
     */
    filter?: string;
    /**
     * Exclude pure type-references when calculating circles.
     * @default false
     */
    excludeTypes?: boolean;
}
/**
 * Detect circles among dependencies.
 */
declare function circularDepsDetect(options?: DetectOptions): Promise<string[][]>;

declare const logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
};

declare function printCircles(circles?: string[][]): void;

export { type DetectOptions, circularDepsDetect, logger, printCircles };
