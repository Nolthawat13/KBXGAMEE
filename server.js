// --- Core & Security ---
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Security middlewares & proxy awareness ----
app.set('trust proxy', true);               // รองรับการอยู่หลัง Cloudflare / Tunnel
app.use(helmet());                          // HTTP security headers
app.use(rateLimit({                         // จำกัดอัตราคำขอเบื้องต้น
  windowMs: 60 * 1000, // 1 นาที
  max: 200,            // 200 req/นาที/IP (ปรับได้ภายหลัง)
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json());                    // JSON body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // ให้บริการไฟล์ static

// --- Admin Configuration ---
// แนะนำให้ตั้ง ADMIN_PASSWORD ผ่าน ENV (Replit Secrets/GitHub Secrets/systemd EnvFile)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD is not set. Admin endpoints will be unusable.');
}

// Helper: เปรียบเทียบรหัสแบบ timing-safe
function safeEqual(a, b) {
  try {
    const ab = Buffer.from(a || '', 'utf8');
    const bb = Buffer.from(b || '', 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// Middleware ตรวจสอบ Admin Password จาก req.body.password
function authenticateAdmin(req, res, next) {
  const pwd = req.body?.password || '';
  if (!ADMIN_PASSWORD || !safeEqual(pwd, ADMIN_PASSWORD)) {
    return res.status(401).json({ success: false, error: 'ไม่ได้รับอนุญาต: รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
  }
  next();
}

// --- Database Setup ---
// ใช้ DB_PATH จาก ENV (ค่าเริ่มต้นคือ ./kbx.db ในโฟลเดอร์โปรเจ็กต์)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'kbx.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    return;
  }
  console.log(`Connected to SQLite DB at: ${DB_PATH}`);

  // ตาราง hints
  db.run(`
    CREATE TABLE IF NOT EXISTS hints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty TEXT NOT NULL,
      text TEXT NOT NULL UNIQUE COLLATE NOCASE
    )
  `, (createErr) => {
    if (createErr) {
      console.error('Error creating hints table:', createErr.message);
    } else {
      console.log('Hints table checked/created.');

      // เติมข้อมูลตั้งต้นถ้าตารางยังว่าง
      db.get("SELECT COUNT(*) AS count FROM hints", (err2, row) => {
        if (err2) { console.error("Error checking hint count:", err2.message); return; }
        if ((row?.count || 0) === 0) {
          const initialHints = [
            { faculty: "วิศวกรรมศาสตร์", text: "ลานเกียร์" },
            { faculty: "วิศวกรรมศาสตร์", text: "ตึก SCL" },
            { faculty: "วิทยาศาสตร์", text: "ห้องแล็บเคมี" },
            { faculty: "วิทยาศาสตร์", text: "ตึกจุลชีววิทยา" },
            { faculty: "สถาปัตยกรรมศาสตร์", text: "สตูดิโอ" },
            { faculty: "สถาปัตยกรรมศาสตร์", text: "โมเดล 3 มิติ" },
            { faculty: "บริหารธุรกิจ", text: "ห้องสัมมนาใหญ่" },
            { faculty: "บริหารธุรกิจ", text: "Case Study" },
            { faculty: "เทคโนโลยีสารสนเทศ", text: "ห้องเซิร์ฟเวอร์" },
            { faculty: "เทคโนโลยีสารสนเทศ", text: "Coding Bootcamp" },
            { faculty: "แพทยศาสตร์", text: "โรงพยาบาลลาดกระบัง" },
            { faculty: "แพทยศาสตร์", text: "ห้องผ่าตัดจำลอง" },
            { faculty: "ครุศาสตร์อุตสาหกรรม", text: "โรงฝึกงาน" },
            { faculty: "ครุศาสตร์อุตสาหกรรม", text: "ห้องเครื่องมือ" },
            { faculty: "นวัตกรรมเกษตร", text: "ฟาร์มสาธิต" },
            { faculty: "นวัตกรรมเกษตร", text: "โรงเรือนอัจฉริยะ" },
            { faculty: "อุตสาหกรรมอาหาร", text: "ห้องปฏิบัติการอาหาร" },
            { faculty: "อุตสาหกรรมอาหาร", text: "พัฒนาผลิตภัณฑ์ใหม่" },
            { faculty: "วิทยาลัยนานาชาติ", text: "เรียนเป็นภาษาอังกฤษ" },
            { faculty: "วิทยาลัยนานาชาติ", text: "เพื่อนต่างชาติ" },
            { faculty: "รวม", text: "หอสมุดกลาง" },
            { faculty: "รวม", text: "โรงอาหาร" },
            { faculty: "รวม", text: "ตึกกิจกรรมนักศึกษา" },
            { faculty: "รวม", text: "สนามบาส" },
            { faculty: "รวม", text: "สอบไฟนอล" },
            { faculty: "รวม", text: "กิจกรรมรับน้อง" },
            { faculty: "รวม", text: "ชุดครุย" },
            { faculty: "รวม", text: "พี่รหัส" },
            { faculty: "รวม", text: "ลงทะเบียนเรียน" },
            { faculty: "รวม", text: "กิจกรรมชมรม" },
            { faculty: "รวม", text: "กีฬามหาวิทยาลัย" },
            { faculty: "รวม", text: "รถไฟฟ้าสายสีชมพู" },
            { faculty: "รวม", text: "ศูนย์หนังสือมหาวิทยาลัย" },
            { faculty: "รวม", text: "หอพักนักศึกษา" },
            { faculty: "รวม", text: "ตึกอธิการบดี" },
            { faculty: "รวม", text: "ห้องสมุดคณะ" },
            { faculty: "รวม", text: "รถประจำทางในมหาลัย" },
            { faculty: "รวม", text: "คาบว่าง" },
            { faculty: "รวม", text: "โปรเจกต์จบ" }
          ];
          const stmt = db.prepare("INSERT INTO hints (faculty, text) VALUES (?, ?)");
          initialHints.forEach(item => {
            stmt.run(item.faculty, item.text, (insErr) => {
              if (insErr) console.error(`Seed error '${item.faculty}:${item.text}':`, insErr.message);
            });
          });
          stmt.finalize(() => console.log(`Seeded ${initialHints.length} hints.`));
        }
      });
    }
  });

  // ตาราง users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      current_spins_count INTEGER DEFAULT 0,
      last_spin_timestamp INTEGER DEFAULT 0,
      current_add_count INTEGER DEFAULT 0,
      last_add_timestamp INTEGER DEFAULT 0
    )
  `, (e) => e ? console.error('Error creating users table:', e.message) : console.log('Users table checked/created.'));

  // ตารางประวัติ
  db.run(`
    CREATE TABLE IF NOT EXISTS random_pick_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      hint_id INTEGER NOT NULL,
      hint_text TEXT NOT NULL,
      activity_type TEXT NOT NULL,    -- 'random_pick' | 'add_hint'
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      hint_owner_user_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (hint_id) REFERENCES hints(id) ON DELETE CASCADE
    )
  `, (e) => {
    if (e) {
      console.error('Error creating random_pick_history table:', e.message);
      console.warn('If you changed schema, you may need to migrate manually.');
    } else {
      console.log('Random pick history table checked/created.');
    }
  });
});

// --- Helper: สร้าง response หลังสุ่ม ---
function processAndRespond(userId, randomHint, currentSpins, newLastSpinTime, MAX_SPINS_PER_COOLDOWN, COOLDOWN_MS, res) {
  db.run(
    'INSERT INTO random_pick_history (user_id, hint_id, hint_text, activity_type) VALUES (?, ?, ?, ?)',
    [userId, randomHint.id, randomHint.text, 'random_pick'],
    (historyErr) => {
      if (historyErr) console.error('History insert error:', historyErr.message);
    }
  );

  let cooldownEndTime = null;
  let cooldownActive = false;
  if (currentSpins >= MAX_SPINS_PER_COOLDOWN) {
    cooldownEndTime = newLastSpinTime + COOLDOWN_MS;
    cooldownActive = true;
  }

  res.json({
    success: true,
    hint: { id: randomHint.id, text: randomHint.text, faculty: randomHint.faculty },
    spins_left: MAX_SPINS_PER_COOLDOWN - currentSpins,
    cooldown_active: cooldownActive,
    cooldown_end_timestamp: cooldownEndTime
  });
}

// --- API Endpoints ---

// 0) สถานะ cooldown ของผู้ใช้
app.get('/api/user/status', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required.' });

  const MAX_SPINS_PER_COOLDOWN = 3;
  const COOLDOWN_MS = 6 * 60 * 60 * 1000;

  const MAX_ADDS_PER_COOLDOWN = 3;
  const COOLDOWN_MS_ADD = 6 * 60 * 60 * 1000;

  db.get(
    'SELECT current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp FROM users WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะผู้ใช้' });

      const now = Date.now();

      let spin = {
        currentSpins: row ? row.current_spins_count : 0,
        lastSpinTime: row ? row.last_spin_timestamp : 0,
        cooldownActive: false,
        cooldownEndTime: null,
        spinsLeft: MAX_SPINS_PER_COOLDOWN
      };
      let add = {
        currentAdds: row ? row.current_add_count : 0,
        lastAddTime: row ? row.last_add_timestamp : 0,
        cooldownActive: false,
        cooldownEndTime: null,
        addsLeft: MAX_ADDS_PER_COOLDOWN
      };

      if (spin.lastSpinTime > 0 && (now - spin.lastSpinTime >= COOLDOWN_MS)) {
        spin.currentSpins = 0; spin.lastSpinTime = 0;
      }
      spin.spinsLeft = MAX_SPINS_PER_COOLDOWN - spin.currentSpins;
      if (spin.currentSpins >= MAX_SPINS_PER_COOLDOWN) {
        spin.cooldownActive = true;
        spin.cooldownEndTime = spin.lastSpinTime + COOLDOWN_MS;
      }

      if (add.lastAddTime > 0 && (now - add.lastAddTime >= COOLDOWN_MS_ADD)) {
        add.currentAdds = 0; add.lastAddTime = 0;
      }
      add.addsLeft = MAX_ADDS_PER_COOLDOWN - add.currentAdds;
      if (add.currentAdds >= MAX_ADDS_PER_COOLDOWN) {
        add.cooldownActive = true;
        add.cooldownEndTime = add.lastAddTime + COOLDOWN_MS_ADD;
      }

      res.json({ success: true, spin_status: spin, add_status: add });
    }
  );
});

// 1) สุ่มคำใบ้ 1 คำ (กันซ้ำตามประวัติและ exclude_id)
app.get('/api/random-hint', (req, res) => {
  const userId = req.headers['x-user-id'];
  const excludeHintId = req.query.exclude_id ? parseInt(req.query.exclude_id) : null;
  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required.' });

  const MAX_SPINS_PER_COOLDOWN = 3;
  const COOLDOWN_MS = 6 * 60 * 60 * 1000;

  db.get(
    'SELECT current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp FROM users WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });

      let currentSpins = row ? row.current_spins_count : 0;
      let lastSpinTime = row ? row.last_spin_timestamp : 0;
      const now = Date.now();

      if (lastSpinTime > 0 && (now - lastSpinTime >= COOLDOWN_MS)) {
        currentSpins = 0; lastSpinTime = 0;
      }
      if (currentSpins >= MAX_SPINS_PER_COOLDOWN) {
        const cooldownEndTime = lastSpinTime + COOLDOWN_MS;
        const timeLeftHours = Math.ceil((cooldownEndTime - now) / (1000 * 60 * 60));
        return res.status(429).json({
          success: false,
          error: `คุณสุ่มคำครบ ${MAX_SPINS_PER_COOLDOWN} ครั้งแล้ว กรุณารออีกประมาณ ${timeLeftHours} ชั่วโมง`,
          cooldown_end_timestamp: cooldownEndTime,
          spins_left: 0,
          cooldown_active: true
        });
      }

      currentSpins++;
      let newLastSpinTime = lastSpinTime;
      if ((currentSpins === 1 && lastSpinTime === 0) || currentSpins === MAX_SPINS_PER_COOLDOWN) {
        newLastSpinTime = now;
      }

      const existingAddCount = row ? row.current_add_count : 0;
      const existingAddTime = row ? row.last_add_timestamp : 0;

      db.run(
        `INSERT OR REPLACE INTO users (user_id, current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, currentSpins, newLastSpinTime, existingAddCount, existingAddTime],
        (updateErr) => { if (updateErr) console.error('Update user spin error:', updateErr.message); }
      );

      const minTs = now - COOLDOWN_MS;
      db.all(`
        SELECT DISTINCT hint_id
        FROM random_pick_history
        WHERE 
          (user_id = ? AND activity_type = 'add_hint' AND hint_owner_user_id = ?)
          OR
          (user_id = ? AND activity_type = 'random_pick' AND timestamp >= ?)
      `, [userId, userId, userId, minTs], (err2, rows) => {
        if (err2) return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติ' });

        let excluded = rows.map(r => r.hint_id);
        if (excludeHintId && !excluded.includes(excludeHintId)) excluded.push(excludeHintId);
        excluded = [...new Set(excluded)];

        let whereClause = '';
        let params = [];
        if (excluded.length > 0) {
          whereClause = `WHERE id NOT IN (${excluded.map(() => '?').join(',')})`;
          params = excluded;
        }

        db.all(`SELECT id, text, faculty FROM hints ${whereClause} ORDER BY RANDOM() LIMIT 1`, params, (e3, hints) => {
          if (e3) return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงคำใบ้' });
          if (!hints || hints.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'ไม่พบคำใบ้ใหม่ให้สุ่มในตอนนี้',
              spins_left: MAX_SPINS_PER_COOLDOWN - currentSpins,
              cooldown_active: false,
              cooldown_end_timestamp: null
            });
          }
          const randomHint = hints[0];
          processAndRespond(userId, randomHint, currentSpins, newLastSpinTime, MAX_SPINS_PER_COOLDOWN, COOLDOWN_MS, res);
        });
      });
    }
  );
});

// 2) เพิ่มคำใบ้ (user หรือ admin)
app.post('/api/hints', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { faculty, text, password } = req.body;

  // โหมด admin (มี password และถูกต้อง)
  if (password && safeEqual(password, ADMIN_PASSWORD)) {
    const trimmedFaculty = (faculty || '').trim();
    const trimmedText = (text || '').trim();

    db.get("SELECT COUNT(*) AS count FROM hints WHERE faculty = ? AND text COLLATE NOCASE = ?",
      [trimmedFaculty, trimmedText],
      (err, row_hint_check) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (row_hint_check.count > 0) {
          return res.status(409).json({ success: false, error: `คำใบ้ '${trimmedFaculty} : ${trimmedText}' มีอยู่ในระบบแล้ว` });
        }

        db.run("INSERT INTO hints (faculty, text) VALUES (?, ?)", [trimmedFaculty, trimmedText], function (insertErr) {
          if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });
          const hintId = this.lastID;

          // log ประวัติ
          db.run(
            'INSERT INTO random_pick_history (user_id, hint_id, hint_text, activity_type, hint_owner_user_id) VALUES (?, ?, ?, ?, ?)',
            [userId || 'admin', hintId, trimmedText, 'add_hint', userId || 'admin'],
            (historyErr) => { if (historyErr) console.error('Admin add history error:', historyErr.message); }
          );

          res.status(201).json({
            success: true,
            message: 'เพิ่มคำใบ้สำเร็จแล้ว (Admin)',
            id: hintId, faculty: trimmedFaculty, text: trimmedText
          });
        });
      }
    );
    return;
  }

  // โหมดผู้ใช้ทั่วไป
  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required.' });
  if (!faculty || typeof faculty !== 'string' || !faculty.trim()) {
    return res.status(400).json({ success: false, error: 'ต้องเลือกคณะ' });
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'ต้องมีข้อความคำใบ้' });
  }

  const trimmedFaculty = faculty.trim();
  const trimmedText = text.trim();

  const MAX_ADDS_PER_COOLDOWN = 3;
  const COOLDOWN_MS_ADD = 6 * 60 * 60 * 1000;

  db.get(
    'SELECT current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp FROM users WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });

      let currentAdds = row ? row.current_add_count : 0;
      let lastAddTime = row ? row.last_add_timestamp : 0;
      const now = Date.now();

      if (lastAddTime > 0 && (now - lastAddTime >= COOLDOWN_MS_ADD)) {
        currentAdds = 0; lastAddTime = 0;
      }

      if (currentAdds >= MAX_ADDS_PER_COOLDOWN) {
        const cooldownEndTime = lastAddTime + COOLDOWN_MS_ADD;
        const timeLeftHours = Math.ceil((cooldownEndTime - now) / (1000 * 60 * 60));
        return res.status(429).json({
          success: false,
          error: `คุณเพิ่มคำใบ้ครบ ${MAX_ADDS_PER_COOLDOWN} ครั้งแล้ว กรุณารออีกประมาณ ${timeLeftHours} ชั่วโมง`,
          cooldown_end_timestamp: cooldownEndTime,
          adds_left: 0,
          cooldown_active: true
        });
      }

      db.get("SELECT COUNT(*) AS count FROM hints WHERE faculty = ? AND text COLLATE NOCASE = ?",
        [trimmedFaculty, trimmedText],
        (err2, row_hint_check) => {
          if (err2) return res.status(500).json({ success: false, error: err2.message });
          if (row_hint_check.count > 0) {
            return res.status(409).json({ success: false, error: `คำใบ้ '${trimmedFaculty} : ${trimmedText}' มีอยู่ในระบบแล้ว` });
          }

          currentAdds++;
          let newLastAddTime = lastAddTime;
          if ((currentAdds === 1 && lastAddTime === 0) || currentAdds === MAX_ADDS_PER_COOLDOWN) {
            newLastAddTime = now;
          }

          const existingSpinCount = row ? row.current_spins_count : 0;
          const existingSpinTime = row ? row.last_spin_timestamp : 0;

          db.run(
            `INSERT OR REPLACE INTO users (user_id, current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, existingSpinCount, existingSpinTime, currentAdds, newLastAddTime],
            (updateErr) => { if (updateErr) console.error('Update user add error:', updateErr.message); }
          );

          db.run("INSERT INTO hints (faculty, text) VALUES (?, ?)", [trimmedFaculty, trimmedText], function (insertErr) {
            if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });
            const hintId = this.lastID;

            db.run(
              'INSERT INTO random_pick_history (user_id, hint_id, hint_text, activity_type, hint_owner_user_id) VALUES (?, ?, ?, ?, ?)',
              [userId, hintId, trimmedText, 'add_hint', userId],
              (historyErr) => { if (historyErr) console.error('User add history error:', historyErr.message); }
            );

            let cooldownEndTime = null;
            let cooldownActive = false;
            if (currentAdds >= MAX_ADDS_PER_COOLDOWN) {
              cooldownEndTime = newLastAddTime + COOLDOWN_MS_ADD;
              cooldownActive = true;
            }

            res.status(201).json({
              success: true,
              message: 'เพิ่มคำใบ้สำเร็จแล้ว!',
              id: hintId,
              faculty: trimmedFaculty,
              text: trimmedText,
              adds_left: MAX_ADDS_PER_COOLDOWN - currentAdds,
              cooldown_end_timestamp: cooldownEndTime,
              cooldown_active: cooldownActive
            });
          });
        }
      );
    }
  );
});

// 3) Admin: ดึงคำใบ้ทั้งหมด
app.post('/api/admin/hints/all', authenticateAdmin, (req, res) => {
  db.all("SELECT id, faculty, text FROM hints ORDER BY faculty, text", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, hints: rows });
  });
});

// 4) Admin: ลบคำใบ้ตาม ID
app.delete('/api/admin/hints/:id', authenticateAdmin, (req, res) => {
  const id = req.params.id;
  if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID ไม่ถูกต้อง' });

  db.run("DELETE FROM hints WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'ไม่พบคำใบ้ที่ต้องการลบ' });

    db.run("DELETE FROM random_pick_history WHERE hint_id = ?", id, (hErr) => {
      if (hErr) console.error('Error deleting history for hint_id:', id, hErr.message);
    });
    res.json({ success: true, message: `ลบคำใบ้ ID: ${id} สำเร็จแล้ว` });
  });
});

// 5) Admin: แก้ไขคำใบ้ตาม ID
app.put('/api/admin/hints/:id', authenticateAdmin, (req, res) => {
  const id = req.params.id;
  const { faculty, text } = req.body;

  if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID ไม่ถูกต้อง' });
  if (!faculty || typeof faculty !== 'string' || !faculty.trim()) {
    return res.status(400).json({ success: false, error: 'ต้องเลือกคณะ' });
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'ต้องมีข้อความคำใบ้' });
  }

  const trimmedFaculty = faculty.trim();
  const trimmedText = text.trim();

  db.get(
    "SELECT COUNT(*) AS count FROM hints WHERE faculty = ? AND text COLLATE NOCASE = ? AND id != ?",
    [trimmedFaculty, trimmedText, id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (row.count > 0) {
        return res.status(409).json({ success: false, error: `คำใบ้ '${trimmedFaculty} : ${trimmedText}' มีอยู่ในระบบแล้ว (ซ้ำกับรายการอื่น)` });
      }

      db.run("UPDATE hints SET faculty = ?, text = ? WHERE id = ?", [trimmedFaculty, trimmedText, id], function (e2) {
        if (e2) return res.status(500).json({ success: false, error: e2.message });
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: 'ไม่พบคำใบ้ที่ต้องการแก้ไข หรือไม่มีการเปลี่ยนแปลงข้อมูล' });
        }
        db.run("UPDATE random_pick_history SET hint_text = ? WHERE hint_id = ?", [trimmedText, id], (hErr) => {
          if (hErr) console.error('Error updating history text for hint_id:', id, hErr.message);
        });
        res.status(200).json({
          success: true,
          message: `แก้ไขคำใบ้ ID: ${id} สำเร็จแล้ว`,
          updatedHint: { id: parseInt(id, 10), faculty: trimmedFaculty, text: trimmedText }
        });
      });
    }
  );
});

// 6) ประวัติสุ่มของผู้ใช้ (ล่าสุด 20 รายการ)
app.get('/api/user/spin-history', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required.' });

  db.all(`
    SELECT
      rph.hint_id,
      rph.hint_text,
      rph.timestamp,
      rph.activity_type,
      rph.hint_owner_user_id,
      h.faculty
    FROM random_pick_history AS rph
    LEFT JOIN hints AS h ON rph.hint_id = h.id
    WHERE rph.user_id = ?
    ORDER BY rph.timestamp DESC
    LIMIT 20
  `, [userId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติการสุ่ม' });
    res.json({ success: true, history: rows });
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`KBX Game server running on port ${PORT}`);
  console.log(`Admin panel path: /admin.html`);
});