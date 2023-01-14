import { ReplicatedStorage, RunService } from "@rbxts/services";
import { Cleaner } from "./cleaner";
import { NetDirection } from "./direction";

const remoteFolder = ReplicatedStorage.WaitForChild("RemoteEvents");

export interface NameOrientedEntity {
	getName(): string;
}

export class NetEvent<T extends unknown[]> implements NameOrientedEntity {
	private validators: ((parameter: unknown) => boolean)[];

	private cooldown: number;
	private name: string;
	private remoteEvent: RemoteEvent;
	private cooldowns: Cleaner<number>;
	private direction: NetDirection;

	private buildCallback: ((inst: NetEvent<T>) => void) | undefined;

	public serverReceiveCallback: ((ply: Player, ...args: T) => void) | undefined;
	public clientReceiveCallback: ((...args: T) => void) | undefined;

	constructor(name: string) {
		this.validators = [];
		this.cooldowns = new Cleaner();
		this.name = name;
		this.cooldown = 0;
		if (RunService.IsServer() === true) {
			this.remoteEvent = new Instance("RemoteEvent", remoteFolder);
			this.remoteEvent.Name = this.name;
		} else {
			this.remoteEvent = remoteFolder.WaitForChild(this.name)! as RemoteEvent;
		}
		this.direction = NetDirection.BiDirectional;
		this.setupRemoteEvent();
	}

	public getName() {
		return this.name;
	}

	setupRemoteEvent() {
		if (RunService.IsServer() === true) {
			this.remoteEvent.OnServerEvent.Connect((ply, ...args: unknown[]) => {
				if (this.direction === NetDirection.ServerToClient) return;

				if (!this.serverReceiveCallback) {
					return;
				}
				const curTime = tick();
				if ((this.cooldowns.get(ply) ?? 0) > curTime) {
					return;
				}

				this.cooldowns.set(ply, curTime + this.cooldown);
				if (args.size() !== this.validators.size()) {
					print("args size miss match!");
					return;
				}

				for (let i = 0; i < this.validators.size(); i++) {
					if (!this.validators[i](args[i])) {
						print("Validator @: " + i + "Failed!");
						return;
					}
				}

				this.serverReceiveCallback(ply, ...(args as T));
			});
		} else {
			this.remoteEvent.OnClientEvent.Connect((...args: unknown[]) => {
				if (this.clientReceiveCallback !== undefined) {
					this.clientReceiveCallback(...(args as T));
				}
			});
		}
	}

	public setDirection(direction: NetDirection) {
		this.direction = direction;
		return this;
	}

	withCooldown(cooldownBetweenMessage: number) {
		this.cooldown = cooldownBetweenMessage;
		return this;
	}

	withParameterValidator(validator: (parameter: unknown) => boolean) {
		this.validators.push(validator);
		return this;
	}

	onServerReceive(callback: (ply: Player, ...args: T) => void) {
		this.serverReceiveCallback = callback;
		return this;
	}

	onClientReceive(callback: (...args: T) => void) {
		this.clientReceiveCallback = callback;
		return this;
	}

	sendToServer(...args: T) {
		this.remoteEvent.FireServer(...args);
	}

	sendToClient(ply: Player, ...args: T) {
		this.remoteEvent.FireClient(ply, ...args);
	}

	broadcast(...args: T) {
		this.remoteEvent.FireAllClients(...args);
	}

	setBuildCallback(callback: (inst: NetEvent<T>) => void) {
		this.buildCallback = callback;
	}

	register() {
		this.buildCallback!(this);
		return this;
	}
}
