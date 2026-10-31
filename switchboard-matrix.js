// Centralized Signal Broker: in-memory patch registry only.
// Null-prototype keys prevent special JavaScript object names from disappearing
// or resolving through Object.prototype. This module does not dispatch jobs.
const active_patches = Object.create(null);

function assertPortId(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a nonempty string`);
  }
}

function connect(jack, plug) {
  assertPortId(jack, 'jack');
  assertPortId(plug, 'plug');
  active_patches[jack] = plug;
}

function disconnect(jack) {
  assertPortId(jack, 'jack');
  delete active_patches[jack];
}

function getActivePatches() {
  // Return a detached, plain-object snapshot for existing consumers.
  return { ...active_patches };
}

module.exports = { connect, disconnect, getActivePatches };
