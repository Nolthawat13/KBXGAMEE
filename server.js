const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Admin Configuration ---
// แนะนำให้ตั้งค่า ADMIN_PASSWORD เป็น Environment Variable ใน Replit Secrets
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
    console.warn('WARNING: ADMIN_PASSWORD is not set as an environment variable. Admin functionality will be disabled or insecure.');
    console.warn('Please set ADMIN_PASSWORD in your Replit secrets or .env file.');
}
console.log('DEBUG: Admin Password (first/last char):', ADMIN_PASSWORD ? ADMIN_PASSWORD[0] + '...' + ADMIN_PASSWORD[ADMIN_PASSWORD.length - 1] : 'NOT SET');

// Middleware สำหรับตรวจสอบ Admin Password
function authenticateAdmin(req, res, next) {
    const { password } = req.body;

    if (!ADMIN_PASSWORD || !password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'ไม่ได้รับอนุญาต: รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
    }
    next();
}

// --- Database Setup ---
const db = new sqlite3.Database('./kbx.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the KBX SQLite database.');

        // สร้างตาราง 'hints'
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
                console.log('Hints table checked/created successfully.');

                // เพิ่มคำใบ้เริ่มต้นถ้าตารางว่างเปล่า
                db.get("SELECT COUNT(*) AS count FROM hints", (err, row) => {
                    if (err) { console.error("Error checking initial hint count:", err.message); return; }
                    if (row.count === 0) {
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
                            stmt.run(item.faculty, item.text, (insertErr) => {
                                if (insertErr) console.error(`Error inserting initial hint '${item.faculty} : ${item.text}':`, insertErr.message);
                            });
                        });
                        stmt.finalize(() => { console.log(`Added ${initialHints.length} initial hints.`); });
                    }
                });
            }
        });

        // สร้างตาราง 'users' สำหรับเก็บข้อมูลผู้ใช้และสถานะการสุ่ม/เพิ่มคำใบ้
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                current_spins_count INTEGER DEFAULT 0,
                last_spin_timestamp INTEGER DEFAULT 0,
                current_add_count INTEGER DEFAULT 0,
                last_add_timestamp INTEGER DEFAULT 0
            )
        `, (createErr) => {
            if (createErr) {
                console.error('Error creating users table:', createErr.message);
            } else {
                console.log('Users table checked/created successfully.');
            }
        });

        // สร้างตาราง 'random_pick_history' สำหรับเก็บประวัติการสุ่ม
        // hint_owner_user_id ใช้ระบุว่าคำใบ้นั้นถูกเพิ่มโดยผู้ใช้คนใด (ถ้ามี)
        db.run(`
            CREATE TABLE IF NOT EXISTS random_pick_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,          -- ID ของผู้ที่สุ่ม/เพิ่มคำใบ้
                hint_id INTEGER NOT NULL,       -- ID ของคำใบ้ที่ถูกสุ่ม/เพิ่ม
                hint_text TEXT NOT NULL,        -- ข้อความของคำใบ้ (เก็บไว้เผื่อคำใบ้ในตาราง hints ถูกลบไป)
                activity_type TEXT NOT NULL,    -- 'random_pick' หรือ 'add_hint'
                timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                hint_owner_user_id TEXT,        -- ID ของผู้ที่สร้างคำใบ้นี้ (ถ้าเป็น add_hint)
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (hint_id) REFERENCES hints(id) ON DELETE CASCADE
            )
        `, (createErr) => {
            if (createErr) {
                console.error('Error creating random_pick_history table:', createErr.message);
                console.warn('NOTE: If you changed the table schema, you might need to manually drop and recreate this table.');
            } else {
                console.log('Random pick history table checked/created successfully.');
            }
        });
    }
});

// --- Middleware ---
app.use(express.json()); // สำหรับการ Parse JSON body ใน Request
app.use(express.static(path.join(__dirname, 'public'))); // สำหรับให้บริการ Static Files (HTML, CSS, JS)

// --- API Endpoints ---

// 0. GET /api/user/status: ดึงสถานะ Cooldown ของผู้ใช้
app.get('/api/user/status', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const MAX_SPINS_PER_COOLDOWN = 3;
    const COOLDOWN_HOURS = 6;
    const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

    const MAX_ADDS_PER_COOLDOWN = 3;
    const COOLDOWN_HOURS_ADD = 6;
    const COOLDOWN_MS_ADD = COOLDOWN_HOURS_ADD * 60 * 60 * 1000;

    db.get('SELECT current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Error fetching user status data:', err.message);
            return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะผู้ใช้' });
        }

        let spinStatus = {
            currentSpins: row ? row.current_spins_count : 0,
            lastSpinTime: row ? row.last_spin_timestamp : 0,
            cooldownActive: false,
            cooldownEndTime: null,
            spinsLeft: MAX_SPINS_PER_COOLDOWN
        };

        let addStatus = {
            currentAdds: row ? row.current_add_count : 0,
            lastAddTime: row ? row.last_add_timestamp : 0,
            cooldownActive: false,
            cooldownEndTime: null,
            addsLeft: MAX_ADDS_PER_COOLDOWN
        };

        const currentTime = Date.now();

        // Check spin cooldown
        if (spinStatus.lastSpinTime > 0 && (currentTime - spinStatus.lastSpinTime >= COOLDOWN_MS)) {
            spinStatus.currentSpins = 0;
            spinStatus.lastSpinTime = 0;
        }
        spinStatus.spinsLeft = MAX_SPINS_PER_COOLDOWN - spinStatus.currentSpins;
        if (spinStatus.currentSpins >= MAX_SPINS_PER_COOLDOWN) {
            spinStatus.cooldownActive = true;
            spinStatus.cooldownEndTime = spinStatus.lastSpinTime + COOLDOWN_MS;
        }

        // Check add cooldown
        if (addStatus.lastAddTime > 0 && (currentTime - addStatus.lastAddTime >= COOLDOWN_MS_ADD)) {
            addStatus.currentAdds = 0;
            addStatus.lastAddTime = 0;
        }
        addStatus.addsLeft = MAX_ADDS_PER_COOLDOWN - addStatus.currentAdds;
        if (addStatus.currentAdds >= MAX_ADDS_PER_COOLDOWN) {
            addStatus.cooldownActive = true;
            addStatus.cooldownEndTime = addStatus.lastAddTime + COOLDOWN_MS_ADD;
        }

        res.json({
            success: true,
            spin_status: spinStatus,
            add_status: addStatus
        });
    });
});

// 1. GET /api/random-hint: ดึงคำใบ้แบบสุ่ม 1 คำ
app.get('/api/random-hint', (req, res) => {
    const userId = req.headers['x-user-id'];
    const excludeHintId = req.query.exclude_id ? parseInt(req.query.exclude_id) : null; // ID ที่ Frontend ขอให้ไม่สุ่มซ้ำทันที

    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const MAX_SPINS_PER_COOLDOWN = 3;
    const COOLDOWN_HOURS = 6;
    const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

    db.get('SELECT current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Error fetching user spin data:', err.message);
            return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
        }

        let currentSpins = row ? row.current_spins_count : 0;
        let lastSpinTime = row ? row.last_spin_timestamp : 0;
        const currentTime = Date.now();

        // รีเซ็ตถ้าคูลดาวน์หมดอายุ
        if (lastSpinTime > 0 && (currentTime - lastSpinTime >= COOLDOWN_MS)) {
            currentSpins = 0;
            lastSpinTime = 0;
            console.log(`[SPIN DEBUG] User ${userId} spin cooldown expired. Resetting spins to 0.`);
        }

        // ตรวจสอบว่าสปินเกินขีดจำกัดหรือไม่ (ก่อนเพิ่มจำนวนสปินในรอบนี้)
        if (currentSpins >= MAX_SPINS_PER_COOLDOWN) {
            const timeLeftMs = COOLDOWN_MS - (currentTime - lastSpinTime);
            const timeLeftHours = Math.ceil(timeLeftMs / (1000 * 60 * 60));
            const cooldownEndTime = lastSpinTime + COOLDOWN_MS;
            console.log(`[SPIN DEBUG] User ${userId} BLOCKED. currentSpins: ${currentSpins} >= ${MAX_SPINS_PER_COOLDOWN}. Cooldown End: ${new Date(cooldownEndTime).toISOString()}`);
            return res.status(429).json({
                success: false,
                error: `คุณสุ่มคำครบ ${MAX_SPINS_PER_COOLDOWN} ครั้งแล้ว กรุณารออีกประมาณ ${timeLeftHours} ชั่วโมง`,
                cooldown_end_timestamp: cooldownEndTime,
                spins_left: 0,
                cooldown_active: true
            });
        }

        // ถ้าผ่านการเช็ค Cooldown ให้เพิ่มจำนวนสปิน
        currentSpins++;

        let newLastSpinTime = lastSpinTime;
        if (currentSpins === 1 && lastSpinTime === 0) { // เริ่มรอบใหม่
            newLastSpinTime = currentTime;
        } else if (currentSpins === MAX_SPINS_PER_COOLDOWN) { // สปินครบจำนวน
            newLastSpinTime = currentTime;
        }

        // อัปเดต user ใน DB
        const existingAddCount = row ? row.current_add_count : 0;
        const existingAddTime = row ? row.last_add_timestamp : 0;

        db.run(
            `INSERT OR REPLACE INTO users (user_id, current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp) VALUES (?, ?, ?, ?, ?)`,
            [userId, currentSpins, newLastSpinTime, existingAddCount, existingAddTime],
            (updateErr) => {
                if (updateErr) {
                    console.error('Error updating user spin data:', updateErr.message);
                } else {
                    console.log(`[SPIN DEBUG] User ${userId} DB updated. currentSpins: ${currentSpins}, newLastSpinTime: ${newLastSpinTime}`);
                }
            }
        );

        // ดึง ID ของคำใบ้ที่ควรถูก Exclude สำหรับผู้ใช้คนนี้
        // 1. คำที่ผู้ใช้ปัจจุบันเป็นคนเพิ่ม (hint_owner_user_id = userId และ activity_type = 'add_hint') - ควรถูก Exclude เสมอ
        // 2. คำที่ผู้ใช้ปัจจุบันเคยสุ่มเจอแล้วในรอบ Cooldown ปัจจุบัน (activity_type = 'random_pick' และ timestamp >= minTimestampForExclusion)
        const minTimestampForExclusion = currentTime - COOLDOWN_MS; // คำที่สุ่มเจอใน 6 ชั่วโมงที่ผ่านมา

        db.all(`
            SELECT DISTINCT hint_id
            FROM random_pick_history
            WHERE 
                (user_id = ? AND activity_type = 'add_hint' AND hint_owner_user_id = ?) OR -- คำที่ผู้ใช้ปัจจุบันเพิ่มเอง (ไม่จำกัดเวลา)
                (user_id = ? AND activity_type = 'random_pick' AND timestamp >= ?)        -- คำที่ผู้ใช้ปัจจุบันสุ่มเจอในรอบ Cooldown ปัจจุบัน
        `, [userId, userId, userId, minTimestampForExclusion], (err, historyRows) => {
            if (err) {
                console.error('Error fetching user history for exclusion:', err.message);
                return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติเพื่อยกเว้นคำใบ้' });
            }

            let excludedHintIds = historyRows.map(row => row.hint_id);

            // เพิ่มคำที่ Frontend บอกให้ไม่สุ่มซ้ำ (คำล่าสุดที่เพิ่งสุ่ม) ถ้ายังไม่ถูก Exclude ไปแล้ว
            if (excludeHintId && !excludedHintIds.includes(excludeHintId)) {
                excludedHintIds.push(excludeHintId);
            }
            const uniqueExcludedHintIds = [...new Set(excludedHintIds)]; // ทำให้ ID ไม่ซ้ำกันใน array

            let whereClause = '';
            let params = [];
            if (uniqueExcludedHintIds.length > 0) {
                whereClause = `WHERE id NOT IN (${uniqueExcludedHintIds.map(() => '?').join(',')})`;
                params = uniqueExcludedHintIds;
            }

            // สุ่ม 1 คำที่ไม่ซ้ำจากคำที่เหลืออยู่
            // ใช้ ORDER BY RANDOM() LIMIT 1 เพื่อประสิทธิภาพในการสุ่ม
            db.all(`SELECT id, text, faculty FROM hints ${whereClause} ORDER BY RANDOM() LIMIT 1`, params, (err, hints) => {
                if (err) {
                    console.error('Error fetching hints for random pick:', err.message);
                    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงคำใบ้' });
                }
                if (hints.length === 0) {
                    // หากไม่มีคำใบ้เหลือให้สุ่มแล้วหลังจาก Exclude คำที่กำหนด
                    return res.status(404).json({
                        success: false,
                        error: 'ไม่พบคำใบ้ใหม่ให้สุ่มในตอนนี้ (คุณอาจสุ่มเจอคำทั้งหมดแล้วในรอบนี้ หรือเหลือแต่คำที่คุณเพิ่มไว้)',
                        spins_left: MAX_SPINS_PER_COOLDOWN - currentSpins,
                        cooldown_active: false,
                        cooldown_end_timestamp: null
                    });
                } else {
                    const randomHint = hints[0]; // เนื่องจากใช้ LIMIT 1, ผลลัพธ์จะมีแค่ 1 แถวใน index 0
                    processAndRespond(userId, randomHint, currentSpins, newLastSpinTime, MAX_SPINS_PER_COOLDOWN, COOLDOWN_MS, res);
                }
            });
        });
    });
});

// Helper function to process response (to avoid code duplication)
function processAndRespond(userId, randomHint, currentSpins, newLastSpinTime, MAX_SPINS_PER_COOLDOWN, COOLDOWN_MS, res) {
    // บันทึกในประวัติ
    db.run('INSERT INTO random_pick_history (user_id, hint_id, hint_text, activity_type) VALUES (?, ?, ?, ?)',
        [userId, randomHint.id, randomHint.text, 'random_pick'],
        (historyErr) => {
            if (historyErr) {
                console.error('Error inserting random pick history:', historyErr.message);
            } else {
                console.log(`[SPIN DEBUG] Random hint history logged for user ${userId}: ${randomHint.text}`);
            }
        }
    );

    let cooldownEndTime = null;
    let cooldownActive = false;
    if (currentSpins >= MAX_SPINS_PER_COOLDOWN) {
        cooldownEndTime = newLastSpinTime + COOLDOWN_MS;
        cooldownActive = true;
        console.log(`[SPIN DEBUG] User ${userId} just hit spin limit with this spin. Cooldown set to ${new Date(cooldownEndTime).toISOString()}`);
    }

    res.json({
        success: true,
        hint: { id: randomHint.id, text: randomHint.text, faculty: randomHint.faculty },
        spins_left: MAX_SPINS_PER_COOLDOWN - currentSpins,
        cooldown_active: cooldownActive,
        cooldown_end_timestamp: cooldownEndTime
    });
}


// 2. POST /api/hints: เพิ่มคำใบ้ใหม่ (สำหรับผู้ใช้ทั่วไป)
app.post('/api/hints', (req, res) => {
    const userId = req.headers['x-user-id'];
    const { faculty, text, password } = req.body;

    // Admin authentication check (if password is provided in body)
    if (password && password === ADMIN_PASSWORD) {
        const trimmedFaculty = faculty.trim();
        const trimmedText = text.trim();

        db.get("SELECT COUNT(*) AS count FROM hints WHERE faculty = ? AND text COLLATE NOCASE = ?", [trimmedFaculty, trimmedText], (err, row_hint_check) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (row_hint_check.count > 0) {
                return res.status(409).json({ success: false, error: `คำใบ้ '${trimmedFaculty} : ${trimmedText}' มีอยู่ในระบบแล้ว` });
            }

            db.run("INSERT INTO hints (faculty, text) VALUES (?, ?)", [trimmedFaculty, trimmedText], function(insertErr) {
                if (insertErr) {
                    return res.status(500).json({ success: false, error: insertErr.message });
                }
                const hintId = this.lastID;
                // บันทึกในประวัติว่ามีการเพิ่มคำใบ้นี้โดย user_id นี้
                db.run('INSERT INTO random_pick_history (user_id, hint_id, hint_text, activity_type, hint_owner_user_id) VALUES (?, ?, ?, ?, ?)',
                    [userId, hintId, trimmedText, 'add_hint', userId], // user_id (ผู้กระทำ) และ hint_owner_user_id (ผู้สร้างคำใบ้) เป็นคนเดียวกัน
                    (historyErr) => {
                        if (historyErr) {
                            console.error('Error inserting add hint history for admin:', historyErr.message);
                        }
                    }
                );
                res.status(201).json({
                    success: true,
                    message: 'เพิ่มคำใบ้สำเร็จแล้ว (Admin)',
                    id: hintId,
                    faculty: trimmedFaculty,
                    text: trimmedText
                });
            });
        });
        return;
    }

    // Normal user adding a hint
    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required.' });
    }
    if (!faculty || typeof faculty !== 'string' || faculty.trim() === '') {
        return res.status(400).json({ success: false, error: 'ต้องเลือกคณะ' });
    }
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ success: false, error: 'ต้องมีข้อความคำใบ้' });
    }

    const trimmedFaculty = faculty.trim();
    const trimmedText = text.trim();

    const MAX_ADDS_PER_COOLDOWN = 3;
    const COOLDOWN_HOURS_ADD = 6;
    const COOLDOWN_MS_ADD = COOLDOWN_HOURS_ADD * 60 * 60 * 1000;

    db.get('SELECT current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Error fetching user add data:', err.message);
            return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
        }

        let currentAdds = row ? row.current_add_count : 0;
        let lastAddTime = row ? row.last_add_timestamp : 0;
        const currentTime = Date.now();

        if (lastAddTime > 0 && (currentTime - lastAddTime >= COOLDOWN_MS_ADD)) {
            currentAdds = 0;
            lastAddTime = 0;
        }

        if (currentAdds >= MAX_ADDS_PER_COOLDOWN) {
            const timeLeftMs = COOLDOWN_MS_ADD - (currentTime - lastAddTime);
            const timeLeftHours = Math.ceil(timeLeftMs / (1000 * 60 * 60));
            const cooldownEndTime = lastAddTime + COOLDOWN_MS_ADD;
            return res.status(429).json({
                success: false,
                error: `คุณเพิ่มคำใบ้ครบ ${MAX_ADDS_PER_COOLDOWN} ครั้งแล้ว กรุณารออีกประมาณ ${timeLeftHours} ชั่วโมง`,
                cooldown_end_timestamp: cooldownEndTime,
                adds_left: 0,
                cooldown_active: true
            });
        }

        db.get("SELECT COUNT(*) AS count FROM hints WHERE faculty = ? AND text COLLATE NOCASE = ?", [trimmedFaculty, trimmedText], (err, row_hint_check) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (row_hint_check.count > 0) {
                return res.status(409).json({ success: false, error: `คำใบ้ '${trimmedFaculty} : ${trimmedText}' มีอยู่ในระบบแล้ว` });
            }

            currentAdds++;

            let newLastAddTime = lastAddTime;
            if (currentAdds === 1 && lastAddTime === 0) {
                newLastAddTime = currentTime;
            } else if (currentAdds === MAX_ADDS_PER_COOLDOWN) {
                newLastAddTime = currentTime;
            }

            const existingSpinCount = row ? row.current_spins_count : 0;
            const existingSpinTime = row ? row.last_spin_timestamp : 0;

            db.run(`INSERT OR REPLACE INTO users (user_id, current_spins_count, last_spin_timestamp, current_add_count, last_add_timestamp) VALUES (?, ?, ?, ?, ?)`,
                [userId, existingSpinCount, existingSpinTime, currentAdds, newLastAddTime],
                (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating user add data:', updateErr.message);
                    }
                }
            );

            db.run("INSERT INTO hints (faculty, text) VALUES (?, ?)", [trimmedFaculty, trimmedText], function(insertErr) {
                if (insertErr) {
                    return res.status(500).json({ success: false, error: insertErr.message });
                }
                const hintId = this.lastID;
                // บันทึกในประวัติว่ามีการเพิ่มคำใบ้นี้โดย user_id นี้
                db.run('INSERT INTO random_pick_history (user_id, hint_id, hint_text, activity_type, hint_owner_user_id) VALUES (?, ?, ?, ?, ?)',
                    [userId, hintId, trimmedText, 'add_hint', userId], // user_id (ผู้กระทำ) และ hint_owner_user_id (ผู้สร้างคำใบ้) เป็นคนเดียวกัน
                    (historyErr) => {
                        if (historyErr) {
                            console.error('Error inserting add hint history for user:', historyErr.message);
                        }
                    }
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
        });
    });
});

// 3. POST /api/admin/hints/all: ดึงคำใบ้ทั้งหมด (พร้อม ID) - ต้องตรวจสอบรหัสผ่าน
app.post('/api/admin/hints/all', authenticateAdmin, (req, res) => {
    db.all("SELECT id, faculty, text FROM hints ORDER BY faculty, text", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, hints: rows });
    });
});

// 4. DELETE /api/admin/hints/:id: ลบคำใบ้ตาม ID - ต้องตรวจสอบรหัสผ่าน
app.delete('/api/admin/hints/:id', authenticateAdmin, (req, res) => {
    const id = req.params.id;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID ไม่ถูกต้อง' });
    }

    db.run("DELETE FROM hints WHERE id = ?", id, function(err) {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบคำใบ้ที่ต้องการลบ' });
        }
        // เมื่อลบคำใบ้ ต้องลบประวัติที่เกี่ยวข้องด้วย
        db.run("DELETE FROM random_pick_history WHERE hint_id = ?", id, (historyErr) => {
            if (historyErr) {
                console.error('Error deleting history for hint_id:', id, historyErr.message);
            }
        });
        res.json({ success: true, message: `ลบคำใบ้ ID: ${id} สำเร็จแล้ว` });
    });
});

// 5. PUT /api/admin/hints/:id: แก้ไขคำใบ้ตาม ID - ต้องตรวจสอบรหัสผ่าน
app.put('/api/admin/hints/:id', authenticateAdmin, (req, res) => {
    const id = req.params.id;
    const { faculty, text } = req.body;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID ไม่ถูกต้อง' });
    }

    if (!faculty || typeof faculty !== 'string' || faculty.trim() === '') {
        return res.status(400).json({ success: false, error: 'ต้องเลือกคณะ' });
    }
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ success: false, error: 'ต้องมีข้อความคำใบ้' });
    }

    const trimmedFaculty = faculty.trim();
    const trimmedText = text.trim();

    db.get("SELECT COUNT(*) AS count FROM hints WHERE faculty = ? AND text COLLATE NOCASE = ? AND id != ?", [trimmedFaculty, trimmedText, id], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (row.count > 0) {
            return res.status(409).json({ success: false, error: `คำใบ้ '${trimmedFaculty} : ${trimmedText}' มีอยู่ในระบบแล้ว (ซ้ำกับรายการอื่น)` });
        }

        db.run("UPDATE hints SET faculty = ?, text = ? WHERE id = ?", [trimmedFaculty, trimmedText, id], function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, error: 'ไม่พบคำใบ้ที่ต้องการแก้ไข หรือไม่มีการเปลี่ยนแปลงข้อมูล' });
            }
            // อัปเดตประวัติการสุ่มด้วยถ้าคำใบ้ถูกแก้ไข
            db.run("UPDATE random_pick_history SET hint_text = ? WHERE hint_id = ?", [trimmedText, id], (historyErr) => {
                if (historyErr) {
                    console.error('Error updating history for hint_id on edit:', id, historyErr.message);
                }
            });
            res.status(200).json({ success: true, message: `แก้ไขคำใบ้ ID: ${id} สำเร็จแล้ว`, updatedHint: { id: parseInt(id), faculty: trimmedFaculty, text: trimmedText } });
        });
    });
});

// 6. GET /api/user/spin-history: ดึงประวัติการสุ่มของ User (สำหรับแสดงผล Cooldown)
app.get('/api/user/spin-history', (req, res) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    // ดึงประวัติการสุ่มทั้งหมดของ user_id นั้นๆ โดยเรียงจากเวลาล่าสุด
    // และ JOIN กับตาราง hints เพื่อดึงชื่อคณะ (faculty) มาด้วย
    db.all(`
        SELECT
            rph.hint_id,
            rph.hint_text,
            rph.timestamp,
            rph.activity_type,
            rph.hint_owner_user_id,
            h.faculty -- ดึงข้อมูล faculty จากตาราง hints
        FROM random_pick_history AS rph
        LEFT JOIN hints AS h ON rph.hint_id = h.id -- เชื่อม (JOIN) กับตาราง hints
        WHERE rph.user_id = ?
        ORDER BY rph.timestamp DESC
        LIMIT 20
    `, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching user spin history:', err.message);
            return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติการสุ่ม' });
        }
        res.json({ success: true, history: rows });
    });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`KBX Game server running on port ${PORT}`);
    console.log(`Access the game via the Webview panel in Replit.`);
    console.log(`For Admin panel, navigate to: /admin.html`);
});
