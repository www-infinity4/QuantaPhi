// Pulse Tones unit tests – Node built‑in test runner
// ------------------------------------------------------
// These tests verify the packet format and that dispatchPulse
// correctly calls the Signal Broker's `updateLink` method.

const { test, describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const { createPulsePacket, dispatchPulse, EVENT_CODES } = require('../pulse-tones.js');

describe('createPulsePacket', () => {
  it('should encode a click event with id 5 into 4 bytes', () => {
    const pkt = createPulsePacket('click', { id: 5 });
    assert.ok(pkt instanceof Uint8Array);
    assert.strictEqual(pkt.length, 4);
    assert.strictEqual(pkt[0], EVENT_CODES.click);
    assert.strictEqual(pkt[1], 5);
    assert.strictEqual(pkt[2], 0);
    assert.strictEqual(pkt[3], 0);
  });

  it('should accept a numeric payload directly', () => {
    const pkt = createPulsePacket('hover', 12);
    assert.strictEqual(pkt[0], EVENT_CODES.hover);
    assert.strictEqual(pkt[1], 12);
  });

  it('should throw for unknown event types', () => {
    assert.throws(() => createPulsePacket('unknown', {}), /Unsupported event type/);
  });

  it('should enforce payload id range (0‑255)', () => {
    assert.throws(() => createPulsePacket('click', { id: 300 }), /Payload id must fit/);
  });
});

describe('dispatchPulse', () => {
  let mockBroker;
  let receivedPatchId;
  let receivedPacket;

  beforeEach(() => {
    receivedPatchId = null;
    receivedPacket = null;
    mockBroker = {
      updateLink(patchId, packet) {
        receivedPatchId = patchId;
        receivedPacket = packet;
      },
    };
  });

  it('should call broker.updateLink with correct arguments', () => {
    const event = { type: 'click', targetId: 7 };
    dispatchPulse(event, mockBroker);
    assert.strictEqual(receivedPatchId, 'click_7');
    assert.ok(receivedPacket instanceof Uint8Array);
    assert.strictEqual(receivedPacket[0], EVENT_CODES.click);
    assert.strictEqual(receivedPacket[1], 7);
  });

  it('should throw if broker lacks updateLink', () => {
    const badBroker = {};
    const event = { type: 'click', targetId: 1 };
    assert.throws(() => dispatchPulse(event, badBroker), /Broker does not implement updateLink/);
  });

  it('should validate event shape', () => {
    const badEvent = { type: 'click' }; // missing targetId
    assert.throws(() => dispatchPulse(badEvent, mockBroker), /Event must have string type and numeric targetId/);
  });
});
