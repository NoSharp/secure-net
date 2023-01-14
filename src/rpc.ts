import { ReplicatedStorage, RunService } from "@rbxts/services";
import { t } from "@rbxts/t";
import { Cleaner } from "./cleaner";

const remoteFolder = ReplicatedStorage.WaitForChild("RemoteEvents");

interface DeferredPromise<R extends unknown[]> {
	resolve: (args: R) => void;
	reject: () => void;
}

export class NetRPC<T extends unknown[], R extends unknown[]> {
	private validators: ((sender: Player, parameter: unknown) => boolean)[];
	private deferredPromises: Map<string, DeferredPromise<R>>;
	private cooldown: number;
	private name: string;
	private remoteEvent: RemoteEvent;
	private cooldowns: Cleaner<number>;

	private buildCallback: ((inst: NetRPC<T, R>) => void) | undefined;

	public serverReceiveCallback: ((ply: Player, ...args: T) => R) | undefined;
	public clientReceiveCallback: ((...args: T) => R) | undefined;

	constructor(name: string) {
		this.validators = [];
		this.cooldowns = new Cleaner();
		this.name = name;
		this.cooldown = 0;
		this.deferredPromises = new Map();

		if (RunService.IsServer() === true) {
			this.remoteEvent = new Instance("RemoteEvent", remoteFolder);
			this.remoteEvent.Name = this.name;
		} else {
			this.remoteEvent = remoteFolder.WaitForChild(this.name)! as RemoteEvent;
		}
		this.setupRemoteEvent();
	}

	public getName() {
		return this.name;
	}

	setupRemoteEvent() {
		if (RunService.IsServer() === true) {
			this.remoteEvent.OnServerEvent.Connect((ply, guid: unknown, ...args: unknown[]) => {
				if (t.string(guid) !== undefined) return;
				if (!this.serverReceiveCallback) {
					return;
				}
				const curTime = tick();
				if ((this.cooldowns.get(ply) ?? 0) > curTime) {
					return;
				}

				this.cooldowns.set(ply, curTime + this.cooldown);
				if (args.size() !== this.validators.size()) {
					print("args size miss match. Expected: ", args.size(), "got:", this.validators.size());
					return;
				}

				for (let i = 0; i < this.validators.size(); i++) {
					if (!this.validators[i](ply, args[i])) {
						print("Validator @: " + i + "Failed! got:", args[i]);
						return;
					}
				}

				const res = this.serverReceiveCallback(ply, ...(args as T));

				this.remoteEvent.FireClient(ply, guid, ...res);
			});
		} else {
			this.remoteEvent.OnClientEvent.Connect((guid: string, ...args: R) => {
				const promise = this.deferredPromises.get(guid);
				if (promise === undefined) return;
				(promise as DeferredPromise<R>).resolve(args);
				this.deferredPromises.delete(guid);
			});
		}
	}

	withCooldown(cooldownBetweenMessage: number) {
		this.cooldown = cooldownBetweenMessage;
		return this;
	}

	withParameterValidator(validator: (player: Player, parameter: unknown) => boolean) {
		this.validators.push(validator);
		return this;
	}

	onServerReceive(callback: (ply: Player, ...args: T) => R) {
		this.serverReceiveCallback = callback;
		return this;
	}

	onClientReceive(callback: (...args: T) => R) {
		this.clientReceiveCallback = callback;
		return this;
	}

	sendToServer(...args: T): Promise<R> {
		const guid = tostring(os.clock());
		const promise = new Promise<R>((resolve, reject) => {
			this.deferredPromises.set(guid, {
				resolve: resolve,
				reject: reject,
			});
		});

		this.remoteEvent.FireServer(guid, ...args);

		return promise;
	}

	setBuildCallback(callback: (inst: NetRPC<T, R>) => void) {
		this.buildCallback = callback;
	}

	register() {
		this.buildCallback!(this);
		return this;
	}
}
