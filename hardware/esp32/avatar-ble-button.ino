/* Avatar AI ESP32 button demonstration — original ESP32 DevKit / WROOM, GPIO27.
 * Non-sensitive button events only; no EEG, microphone, location, or Internet.
 * ESP32 Arduino core with BLEDevice/BLEServer/BLE2902 support required.
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

static const char *SERVICE_UUID = "b3d70001-62ce-49b9-a52b-0e1923000001";
static const char *NOTIFY_UUID  = "b3d70002-62ce-49b9-a52b-0e1923000001";
static const int BUTTON_GPIO = 27; // Momentary switch between GPIO27 and GND
static BLECharacteristic *observation = nullptr;
static bool connected = false;
static unsigned long sequence = 0;
static int stableState = HIGH, lastRead = HIGH;
static unsigned long changedAt = 0;

class ConnectionCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override { connected = true; }
  void onDisconnect(BLEServer *server) override {
    connected = false;
    BLEDevice::startAdvertising();
  }
};

void setup() {
  pinMode(BUTTON_GPIO, INPUT_PULLUP);
  BLEDevice::init("Avatar-ESP32");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ConnectionCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);
  observation = service->createCharacteristic(NOTIFY_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  observation->addDescriptor(new BLE2902());
  observation->setValue("{\"v\":1,\"kind\":\"button\",\"id\":\"button\",\"value\":0,\"seq\":0}");
  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
}

void loop() {
  int reading = digitalRead(BUTTON_GPIO);
  if (reading != lastRead) changedAt = millis();
  if (millis() - changedAt > 45 && reading != stableState) {
    stableState = reading;
    if (connected && observation) {
      String packet = "{\"v\":1,\"kind\":\"button\",\"id\":\"button\",\"value\":";
      packet += stableState == LOW ? "1" : "0";
      packet += ",\"seq\":" + String(++sequence) + "}";
      observation->setValue(packet.c_str());
      observation->notify();
    }
  }
  lastRead = reading;
  delay(10);
}
