# Secure Net
A Simple, framework indepenent networking library.

## Simple Examples

### Events

Are modeled directly after a RemoteEvent.
the type arguments are specified in the type arguments, given in the function call.

Scenario: Server to Client communication

```ts
const updateEvent = registerRemoteEvent<[number, number]>("Player.S2C.Update")
  .setDirection(NetDirection.ServerToClient)
  .register();
// Sending a net event to one player.
updateEvent.sendToClient(player, 12, 2002);
// Sending a net event to every player
updateEvent.broadcast(12, 2002);
// Send a net event to the server
updateEvent.sendToServer(12, 2002);
```

Scenario: Client to Server communication

```ts
const updateEvent = registerRemoteEvent<[number]>("Player.S2C.DoSomething")
  .setDirection(NetDirection.ClientToServer)
  .withCooldown(10)
  .withParameterValidator((player, someValue: unknown)=>{
    return t.number(someValue)
  })
  .onServerReceive((ply: Player, value: number)=>{
    // Do something with our value.
  })
  .register();

```
### RPCs
Similar to remote functions however it's implemented with RemoteEvents and deferred promises.

This is **ONLY** Client To Server.

The function call to register a remote event will take two sets of type arguments.
One for the inbound request, second for what it should return.

```ts
registerRemoteEvent<[string], [boolean]>("S2C.Pets.EquipPet")
  .withCooldown(10)
  .withParameterValidator((ply: Player, petId: unknown) => {
    // Call DataService, check if we have the petid.
    return false;
  })
  .onServerReceive((player: Player, petId: string) => {
    return [true];
  })
  .register();
```
