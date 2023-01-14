/**
 * A nicer version (in my opinion) of the maid approach offered by Quenty.
 * Used to delegate the responsibility of removing a value from the internal map
 * when a key (instance) goes invalid.
 */
export class Cleaner<T> {
	private instances: Map<Instance, T>;

	constructor() {
		this.instances = new Map();
	}

	set(instance: Instance, value: T) {
		instance.Destroying.Connect(() => {
			this.instances.delete(instance);
		});

		this.instances.set(instance, value);
	}

	get(instance: Instance): T | undefined {
		return this.instances.get(instance);
	}
}

export class TimedCleaner<K, V> {
	private monitored: Map<K, [number, V]>;
	private removeAfterSeconds: number;

	constructor(removedAfterSeconds: number) {
		this.monitored = new Map();
		this.removeAfterSeconds = removedAfterSeconds;
	}

	set(key: K, value: V) {
		this.monitored.set(key, [tick(), value]);
	}

	get(key: K): V | undefined {
		const val = this.monitored.get(key);
		if (val === undefined) {
			return val;
		}

		return val[1];
	}

	clean() {
		const curTick = tick();
		for (const [key, value] of this.monitored) {
			if (curTick - value[0] > this.removeAfterSeconds) {
				this.monitored.delete(key);
			}
		}
	}
}
