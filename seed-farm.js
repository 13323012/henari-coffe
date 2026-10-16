// Skrip demo: mengisi data contoh untuk dashboard "Kebun Kopi" di panel admin.
// Jalankan sekali dengan: node seed-farm.js
// Setelah node ESP32 asli mulai mengirim data lewat /api/farm/ingest,
// skrip ini tidak perlu dijalankan lagi.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'kedai.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS farm_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    latitude REAL,
    longitude REAL,
    last_seen TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS farm_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES farm_devices(id) ON DELETE CASCADE,
    air_temp REAL,
    air_humidity REAL,
    soil_moisture REAL,
    light_lux REAL,
    rain_mm REAL,
    wind_speed REAL,
    battery_voltage REAL,
    solar_voltage REAL,
    solar_current REAL,
    soil_n REAL,
    soil_p REAL,
    soil_k REAL,
    soil_ph REAL,
    soil_ec REAL,
    lora_rssi REAL,
    lora_snr REAL,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS farm_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES farm_devices(id) ON DELETE CASCADE,
    component_key TEXT NOT NULL,
    label TEXT NOT NULL,
    spec TEXT,
    status TEXT NOT NULL DEFAULT 'aktif',
    note TEXT,
    installed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
try { db.exec('ALTER TABLE farm_readings ADD COLUMN solar_current REAL'); } catch (e) {}
for (const col of ['soil_n', 'soil_p', 'soil_k', 'soil_ph', 'soil_ec', 'lora_rssi', 'lora_snr']) {
  try { db.exec(`ALTER TABLE farm_readings ADD COLUMN ${col} REAL`); } catch (e) {}
}
try { db.exec('ALTER TABLE farm_devices ADD COLUMN lora_gateway TEXT'); } catch (e) {}

let device = db.prepare('SELECT * FROM farm_devices WHERE device_key = ?').get('kebun-ronggur-01');
if (!device) {
  const result = db
    .prepare(
      `INSERT INTO farm_devices (device_key, name, location, latitude, longitude, last_seen)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .run('kebun-ronggur-01', 'Node Kebun Ronggur Nihuta', 'Ronggur Nihuta, Samosir', 2.6206, 98.7076);
  device = { id: result.lastInsertRowid };
  console.log('Node demo dibuat:', device.id);
}
db.prepare('UPDATE farm_devices SET lora_gateway = ? WHERE id = ? AND lora_gateway IS NULL')
  .run('Gateway Rumah Jaga - RAK7268', device.id);

// Seed daftar komponen fisik node, supaya panel "Komponen Perangkat" langsung
// terisi contoh yang bisa diubah/dihapus dari admin.
const componentCount = db.prepare('SELECT COUNT(*) AS n FROM farm_components WHERE device_id = ?').get(device.id).n;
if (componentCount === 0) {
  const insertComp = db.prepare(
    `INSERT INTO farm_components (device_id, component_key, label, spec, status, note) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const demoComponents = [
    ['esp32', 'Mikrokontroler ESP32', 'ESP32-WROOM-32, dual-core 240MHz', 'aktif', 'Otak utama node, baca semua sensor & kirim ke LoRa'],
    ['lora_module', 'Modul LoRa (SX1276/RFM95)', '915MHz, TX 20dBm', 'aktif', 'Kirim data ke gateway setiap 10 menit'],
    ['soil_moisture_sensor', 'Sensor Kelembapan Tanah (kapasitif)', 'Capacitive Soil Moisture v2.0', 'aktif', 'Ditanam 15cm di zona akar'],
    ['soil_npk_sensor', 'Sensor Kesuburan Tanah NPK+pH', 'RS485 7-in-1 Soil NPK+pH+EC', 'aktif', 'Kalibrasi ulang tiap 3 bulan'],
    ['dht22', 'Sensor Suhu & Kelembapan Udara', 'SHT31, akurasi ±0.3°C', 'aktif', null],
    ['lux_sensor', 'Sensor Intensitas Cahaya', 'BH1750, I2C', 'aktif', null],
    ['rain_gauge', 'Sensor Curah Hujan', 'Tipping bucket 0.2mm/tip', 'aktif', null],
    ['anemometer', 'Anemometer', 'Cup anemometer 0-30 m/s', 'perlu_cek', 'Baling-baling agak seret, cek bearing'],
    ['solar_panel', 'Panel Surya', '20Wp Monokristalin 12V', 'aktif', null],
    ['solar_charge_controller', 'Solar Charge Controller', 'PWM 10A 12/24V', 'aktif', null],
    ['battery', 'Baterai', 'LiFePO4 12.8V 10Ah', 'aktif', 'Ganti tiap 3-4 tahun'],
    ['enclosure', 'Kotak Panel Tahan Cuaca', 'IP65, dudukan tiang 2 inci', 'aktif', null],
  ];
  demoComponents.forEach((c) => insertComp.run(device.id, ...c));
  console.log('Daftar komponen demo untuk node kebun-ronggur-01 berhasil dibuat.');
}

const now = Date.now();
const insert = db.prepare(
  `INSERT INTO farm_readings
    (device_id, air_temp, air_humidity, soil_moisture, light_lux, rain_mm, wind_speed, battery_voltage,
     solar_voltage, solar_current, soil_n, soil_p, soil_k, soil_ph, soil_ec, lora_rssi, lora_snr, recorded_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

for (let i = 24; i >= 0; i--) {
  const t = new Date(now - i * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const hourOfDay = new Date(now - i * 60 * 60 * 1000).getHours();
  const daylight = hourOfDay > 6 && hourOfDay < 18;
  insert.run(
    device.id,
    (18 + Math.random() * 6).toFixed(1),           // suhu udara 18-24°C (khas dataran tinggi Samosir)
    (65 + Math.random() * 20).toFixed(1),           // kelembapan udara 65-85%
    (35 + Math.random() * 30).toFixed(1),           // kelembapan tanah 35-65%
    daylight ? Math.round(8000 + Math.random() * 30000) : Math.round(Math.random() * 50),
    Math.random() < 0.15 ? +(Math.random() * 8).toFixed(1) : 0,
    (0.5 + Math.random() * 3).toFixed(1),
    (11.8 + Math.random() * 1.2).toFixed(2),
    daylight ? (13 + Math.random() * 2).toFixed(2) : (0).toFixed(2),
    daylight ? (0.6 + Math.random() * 1.4).toFixed(2) : (0).toFixed(2),  // arus panel surya (A)
    Math.round(15 + Math.random() * 25),         // nitrogen mg/kg
    Math.round(8 + Math.random() * 15),          // fosfor mg/kg
    Math.round(80 + Math.random() * 60),         // kalium mg/kg
    (5.6 + Math.random() * 0.9).toFixed(1),      // pH tanah, sasaran ideal kopi 5.5-6.5
    Math.round(200 + Math.random() * 300),       // konduktivitas listrik (µS/cm)
    Math.round(-65 - Math.random() * 45),        // RSSI LoRa (dBm), makin dekat 0 makin bagus
    (5 + Math.random() * 5).toFixed(1),          // SNR LoRa (dB)
    t
  );
}

console.log('Data demo 25 jam terakhir berhasil dibuat untuk node kebun-ronggur-01.');
