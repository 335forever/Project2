#include "Secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include "DHT.h"
#include <HTTPClient.h>

#define DHTPIN 13     // Digital pin connected to the DHT sensor
#define DHTTYPE DHT11 // DHT 11

#define MIN_NOTIFICATION_INTERVAL 600000

const int bufferSize = JSON_ARRAY_SIZE(4) + 4*JSON_OBJECT_SIZE(4) + 360;

float h;
float t;

DHT dht(DHTPIN, DHTTYPE);

// Mảng lưu trữ giá trị 20 lần đọc trước đó
float humidityRecords[20] = {0};
float temperatureRecords[20] = {0};

// Biến để theo dõi vị trí hiện tại trong mảng
int recordIndex = 0;
int recordCount = 0;

// Ngưỡng thay đổi (phần trăm)
const float humidityThreshold = 10.0;  // Ngưỡng thay đổi cho độ ẩm
const float temperatureThreshold = 5.0;  // Ngưỡng thay đổi cho nhiệt độ

unsigned long lastHumidityNotificationTime = 0;
unsigned long lastTemperatureNotificationTime = 0;

WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);


//***************************************************************************************************************************************

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Connected to Wi-Fi");
}

void reconnectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Reconnecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Connected to Wi-Fi");
}

void connectAWS() {
  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.setServer(AWS_IOT_ENDPOINT, 8883);

  // Create a message handler
  client.setCallback(messageHandler);

  Serial.println("Connecting to AWS IOT");

  while (!client.connect(THINGNAME)) {
    Serial.print(".");
    delay(100);
  }

  if (!client.connected()) {
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  client.subscribe("deviceStatus");

  Serial.println("AWS IoT Connected!");
}

void getdevicesinfo() {
  HTTPClient http;
  String url = "http://" + String(server_ip) + "/api/data/getdevicesinfo";

  http.begin(url);
  int httpCode = http.GET();

  if (httpCode > 0) {
      if (httpCode == HTTP_CODE_OK) {
          String payload = http.getString();
          Serial.println("Get devices status successfully");

          // Parse JSON
          DynamicJsonDocument doc(bufferSize);
          deserializeJson(doc, payload);

          // Loop through JSON array
          JsonArray devices = doc.as<JsonArray>();
          for (JsonObject device : devices) {
              int gpio = device["gpio"];
              int status = device["status"];

              // Set GPIO mode and initial state
              pinMode(gpio, OUTPUT);
              digitalWrite(gpio, status);
          }
      } else {
          Serial.printf("HTTP request failed with error code %d\n", httpCode);
      }
  } else {
      Serial.println("HTTP request failed");
  }

  http.end();
}

void publishMessage() {
  StaticJsonDocument<200> doc;
  doc["humidity"] = h;
  doc["temperature"] = t;
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer); // print to client

  client.publish("dhtData", jsonBuffer);
}

void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("incoming: ");
  Serial.println(topic);

  if (String(topic) == "deviceStatus") {
    Serial.println(F("Handling device status message"));
    
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
      return;
    }

    // Trích xuất thông tin GPIO và trạng thái từ đối tượng JSON
    int gpio = doc["gpio"];
    int status = doc["status"];
    const char* uuid = doc["uuid"];

    // In ra thông tin trích xuất được
    Serial.print("GPIO: ");
    Serial.print(gpio);
    Serial.print(", Status: ");
    Serial.println(status);

    // Gửi thông điệp xác nhận kèm UUID
    StaticJsonDocument<200> ackDoc;
    ackDoc["gpio"] = gpio; 
    ackDoc["status"] = status;
    ackDoc["uuid"] = uuid; 
    String ackMessage;
    serializeJson(ackDoc, ackMessage);
    if (client.publish("deviceStatus/ack", ackMessage.c_str())) digitalWrite(gpio, status);;
  }
}

void sendHumidityPostRequest(float humidity,float humidityChange) {
  Serial.println("Phat hien do am thay doi dot ngot");
  HTTPClient http;
  String url = "http://" + String(server_ip) + "/api/devices/noti/humidity";

  // Tạo một JSON object để chứa dữ liệu
  StaticJsonDocument<200> jsonDocument;
  jsonDocument["humidity"] = humidity;
  jsonDocument["humidityChange"] = humidityChange;

  // Chuyển đổi JSON object sang String
  String jsonString;
  serializeJson(jsonDocument, jsonString);

  // Thiết lập header của request
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Gửi POST request với dữ liệu JSON
  int httpCode = http.POST(jsonString);

  // Kiểm tra kết quả của request
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("Send noti response: " + payload);
    } else {
      Serial.printf("Send noti failed, error code: %d\n", httpCode);
    }
  } else {
    Serial.printf("Send noti failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void sendTemperaturePostRequest(float temperature,float temperatureChange) {
  Serial.println("Phat hien nhiet do thay doi dot ngot");
  HTTPClient http;
  String url = "http://" + String(server_ip) + "/api/devices/noti/temperature";

  // Tạo một JSON object để chứa dữ liệu
  StaticJsonDocument<200> jsonDocument;
  jsonDocument["temperature"] = temperature;
  jsonDocument["temperatureChange"] = temperatureChange;

  // Chuyển đổi JSON object sang String
  String jsonString;
  serializeJson(jsonDocument, jsonString);

  // Thiết lập header của request
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Gửi POST request với dữ liệu JSON
  int httpCode = http.POST(jsonString);

  // Kiểm tra kết quả của request
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("Send noti response: " + payload);
    } else {
      Serial.printf("Send noti failed, error code: %d\n", httpCode);
    }
  } else {
    Serial.printf("Send noti failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

float calculateAverage(float records[]) {
  float sum = 0;
  for (int i = 0; i < 20; i++) {
    sum += records[i];
  }
  return sum / 20;
}

//***************************************************************************************************************************************

void setup() {
  Serial.begin(115200);
  connectWifi();
  connectAWS();
  getdevicesinfo();
  dht.begin();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) reconnectWifi();
  
  h = dht.readHumidity();
  t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {  // Check if any reads failed and exit early (to try again).
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  Serial.print(F("Humidity: "));
  Serial.print(h);
  Serial.print(F("%  Temperature: "));
  Serial.print(t);
  Serial.println(F("°C "));

  publishMessage();
  client.loop();
  
  // Cập nhật mảng lưu trữ
  humidityRecords[recordIndex] = h;
  temperatureRecords[recordIndex] = t;

  // Tăng recordIndex và điều chỉnh nếu vượt quá 19
  recordIndex = (recordIndex + 1) % 20;
  recordCount++;

  // Chỉ kiểm tra khi đã có ít nhất 20 bản ghi
  if (recordCount >= 20) {
    float avgHumidity = calculateAverage(humidityRecords);
    float avgTemperature = calculateAverage(temperatureRecords);

    float humidityChange = h - avgHumidity;
    float temperatureChange = t - avgTemperature;

    unsigned long currentMillis = millis();

    if (humidityChange > humidityThreshold && 
      currentMillis - lastHumidityNotificationTime >= MIN_NOTIFICATION_INTERVAL) {
      // Gửi tín hiệu độ ẩm tới server bằng POST API
      sendHumidityPostRequest(h,humidityChange);
      lastHumidityNotificationTime = currentMillis;
    }
    
    if (temperatureChange > temperatureThreshold && 
      currentMillis - lastTemperatureNotificationTime >= MIN_NOTIFICATION_INTERVAL) {
      // Gửi tín hiệu nhiệt độ tới server bằng POST API
      sendTemperaturePostRequest(t,temperatureChange);
      lastTemperatureNotificationTime = currentMillis;
    }
  }

  delay(5000);
}
