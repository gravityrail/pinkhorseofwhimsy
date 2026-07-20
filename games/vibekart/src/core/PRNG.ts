import seedrandom from 'seedrandom';

/**
 * Pseudo-random number generator with consistent seeding
 * for reproducible procedural generation.
 */
export class PRNG {
  private rng: seedrandom.PRNG;
  private seed: string;

  /**
   * Create a new PRNG with the given seed
   */
  constructor(seed: string) {
    this.seed = seed;
    this.rng = seedrandom(seed);
  }

  /**
   * Get the current seed
   */
  getSeed(): string {
    return this.seed;
  }

  /**
   * Reset the generator with a new seed
   */
  setSeed(seed: string): void {
    this.seed = seed;
    this.rng = seedrandom(seed);
  }

  /**
   * Get a random float between 0 (inclusive) and 1 (exclusive)
   */
  random(): number {
    return this.rng();
  }

  /**
   * Get a random float between min (inclusive) and max (exclusive)
   */
  randomRange(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  /**
   * Get a random integer between min (inclusive) and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Get a random boolean with the given probability of being true
   */
  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Get a random item from an array
   */
  randomItem<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Get a random point within a circle
   * @returns [x, y] coordinates
   */
  randomPointInCircle(radius: number = 1): [number, number] {
    const angle = this.random() * Math.PI * 2;
    const r = radius * Math.sqrt(this.random());
    return [
      r * Math.cos(angle),
      r * Math.sin(angle)
    ];
  }

  /**
   * Get a random point within a rectangle
   * @returns [x, y] coordinates
   */
  randomPointInRect(width: number, height: number): [number, number] {
    return [
      this.randomRange(0, width),
      this.randomRange(0, height)
    ];
  }
}
