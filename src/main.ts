import { NameOrientedEntity, NetEvent } from "./event";
import { NetRPC } from "./rpc";

const RemoteEvents = new Map<string, RemoteEvent>();

const registeredEvents: { [key: string]: unknown } = {};
const registeredFunctions: { [key: string]: unknown } = {};

export function registerRemoteEvent<T extends unknown[]>(name: string): NetEvent<T> {
	const remoteEvent = new NetEvent<T>(name);
	remoteEvent.setBuildCallback((inst: NetEvent<T>) => {
		registeredEvents[inst.getName()] = inst;
	});
	return remoteEvent;
}

export function registerRPC<T extends unknown[], R extends unknown[]>(name: string) {
	const rpc = new NetRPC<T, R>(name);
	rpc.setBuildCallback((inst: NetRPC<T, R>) => {
		registeredFunctions[rpc.getName()] = inst;
	});

	return rpc;
}

export function getRemoteEvent<T extends unknown[]>(name: string): NetEvent<T> {
	return registeredEvents[name]! as NetEvent<T>;
}

export function getNetRPC<T extends unknown[], R extends unknown[]>(name: string): NetRPC<T, R> {
	return registeredFunctions[name]! as NetRPC<T, R>;
}
