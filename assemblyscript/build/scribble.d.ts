declare namespace __AdaptedExports {
  /** Exported memory */
  export const memory: WebAssembly.Memory;
  /** assembly/index/MAX_POINTS */
  export const MAX_POINTS: {
    /** @type `i32` */
    get value(): number
  };
  /**
   * assembly/index/push
   * @param x `f64`
   * @param y `f64`
   * @param connected `bool`
   */
  export function push(x: number, y: number, connected: boolean): void;
  /**
   * assembly/index/clear
   */
  export function clear(): void;
  /**
   * assembly/index/getCount
   * @returns `i32`
   */
  export function getCount(): number;
  /**
   * assembly/index/startSlot
   * @returns `i32`
   */
  export function startSlot(): number;
  /**
   * assembly/index/slotAt
   * @param i `i32`
   * @returns `i32`
   */
  export function slotAt(i: number): number;
  /**
   * assembly/index/getX
   * @param slot `i32`
   * @returns `f64`
   */
  export function getX(slot: number): number;
  /**
   * assembly/index/getY
   * @param slot `i32`
   * @returns `f64`
   */
  export function getY(slot: number): number;
  /**
   * assembly/index/getConnected
   * @param slot `i32`
   * @returns `bool`
   */
  export function getConnected(slot: number): boolean;
  /**
   * assembly/index/segmentAlpha
   * @param i `i32`
   * @returns `f64`
   */
  export function segmentAlpha(i: number): number;
}
/** Instantiates the compiled WebAssembly module with the given imports. */
export declare function instantiate(module: WebAssembly.Module, imports: {
  env: unknown,
}): Promise<typeof __AdaptedExports>;
