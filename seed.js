const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'kedai.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'Lainnya',
    available INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    table_number TEXT,
    note TEXT,
    total INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'QRIS',
    status TEXT NOT NULL DEFAULT 'menunggu_pembayaran',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    qty INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const menuCols = db.prepare("PRAGMA table_info(menu_items)").all().map((c) => c.name);
if (!menuCols.includes('image_url')) {
  db.exec('ALTER TABLE menu_items ADD COLUMN image_url TEXT');
}

const ADMIN_USER = process.env.SEED_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || 'jeyshen123';

const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get(ADMIN_USER);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(ADMIN_USER, hash);
  console.log(`Admin dibuat -> username: ${ADMIN_USER} / password: ${ADMIN_PASS}`);
} else {
  console.log('Admin sudah ada, dilewati.');
}

// Menu sesuai papan menu Henari Coffee.
// Catatan: seed ini akan MENGGANTI seluruh isi menu_items setiap kali dijalankan,
// supaya papan menu di web selalu sinkron dengan daftar di bawah ini.
const items = [
  // Coffe Series
  ['Kopi HENARI', null, 5000, 'Coffe Series', '/menu/kopi-henari.svg'],
  ['Kopi Susu HENARI', null, 7000, 'Coffe Series', '/menu/kopi-susu-henari.svg'],
  ['Palm Sugar', null, 13000, 'Coffe Series', '/menu/palm-sugar.svg'],
  ['Spanish Latte', null, 13000, 'Coffe Series', '/menu/spanish-latte.svg'],

  // Tea Series
  ['Teh Manis', null, 5000, 'Tea Series', '/menu/teh-manis.svg'],
  ['Es Teh Manis', null, 6000, 'Tea Series', '/menu/es-teh-manis.svg'],
  ['Thai Tea', null, 8000, 'Tea Series', '/menu/thai-tea.svg'],

  // Minuman Segar
  ['Es Mojito Melon', null, 10000, 'Minuman Segar', '/menu/es-mojito-melon.svg'],
  ['Es Taro Susu', null, 10000, 'Minuman Segar', '/menu/es-taro-susu.svg'],
  ['Es Cokelat Susu', null, 10000, 'Minuman Segar', '/menu/es-cokelat-susu.svg'],
  ['Es Blue Curacou', null, 10000, 'Minuman Segar', '/menu/es-blue-curacou.svg'],
  ['Es Mojito Melon Yakult', null, 15000, 'Minuman Segar', '/menu/es-mojito-melon-yakult.svg'],

  // Aneka Jus
  ['Jus Alpukat', null, 10000, 'Aneka Jus', '/menu/jus-alpukat.svg'],
  ['Jus Terong Belanda', null, 10000, 'Aneka Jus', '/menu/jus-terong-belanda.svg'],
  ['Jus Jeruk', null, 10000, 'Aneka Jus', '/menu/jus-jeruk.svg'],
  ['Jus Markisa', null, 10000, 'Aneka Jus', '/menu/jus-markisa.svg'],

  // Makanan
  ['Indomie Kuah', null, 13000, 'Makanan', '/menu/indomie-kuah.svg'],
  ['Indomie Goreng', null, 13000, 'Makanan', '/menu/indomie-goreng.svg'],
  ['Nasi Goreng', null, 15000, 'Makanan', '/menu/nasi-goreng.svg'],
  ['Mie Goreng Telur', null, 15000, 'Makanan', '/menu/mie-goreng-telur.svg'],
  ['Kwaitiu Telur', null, 15000, 'Makanan', '/menu/kwaitiu-telur.svg'],
  ['Bihun Goreng Telur', null, 15000, 'Makanan', '/menu/bihun-goreng-telur.svg'],

  // Snack
  ['Kentang Goreng', null, 7000, 'Snack', '/menu/kentang-goreng.svg'],
  ['Pisang Goreng Crispy', null, 10000, 'Snack', '/menu/pisang-goreng-crispy.svg'],
  ['Roti Bakar Cokelat', null, 7000, 'Snack', '/menu/roti-bakar-cokelat.svg'],
  ['Roti Bakar Keju', null, 7000, 'Snack', '/menu/roti-bakar-keju.svg'],
  ['Roti Bakar Srikaya', null, 7000, 'Snack', '/menu/roti-bakar-srikaya.svg'],
  ['Banana Pancake', null, 15000, 'Snack', '/menu/banana-pancake.svg'],

  // Menu Akhir Bulan
  ['Nasi + Telur', null, 10000, 'Menu Akhir Bulan', '/menu/nasi-telur.svg'],
];

const insertStmt = db.prepare(
  'INSERT INTO menu_items (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)'
);
const resetMenu = db.transaction(() => {
  db.exec('DELETE FROM menu_items');
  for (const i of items) insertStmt.run(...i);
});
resetMenu();
console.log(`Menu diperbarui: ${items.length} item ditulis ulang sesuai papan menu.`);

console.log('Seed selesai.');
