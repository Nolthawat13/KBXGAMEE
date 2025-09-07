// --- DOM Elements ---
const randomHintDisplay = document.getElementById('randomHintDisplay');
const randomizeButton = document.getElementById('randomizeButton');
const facultySelect = document.getElementById('facultySelect');
const addHintInput = document.getElementById('addHintInput');
const addHintButton = document.getElementById('addHintButton');
const addHintMessage = document.getElementById('addHintMessage');
const toggleRandomizedHistoryButton = document.getElementById('toggleRandomizedHistoryButton');
const randomizedHistoryList = document.getElementById('randomizedHistoryList');
const statusMessage = document.getElementById('statusMessage');
const countdownDisplay = document.getElementById('countdownDisplay');
const addHintCountdownDisplay = document.getElementById('addHintCountdownDisplay');

// --- Global State ---
// เก็บ ID ของคำใบ้ที่เพิ่งสุ่มไปล่าสุด เพื่อป้องกันการสุ่มเจอซ้ำติดกันทันที (Client-side optimization)
let lastPickedHintId = null; 

// --- Helper Function: Show Message ---
function showMessage(element, msg, type = '') {
    element.textContent = msg;
    element.className = `message ${type} show`;
    setTimeout(() => {
        element.className = `message ${type}`;
        setTimeout(() => {
            element.textContent = '';
        }, 500);
    }, 3000);
}

// --- Helper Function: สร้าง/ดึง User ID จาก localStorage ---
function getOrCreateUserId() {
    let userId = localStorage.getItem('kbx_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('kbx_user_id', userId);
        console.log('DEBUG: New User ID generated:', userId);
    } else {
        console.log('DEBUG: Existing User ID retrieved:', userId);
    }
    return userId;
}

// --- Helper Function: Format time remaining (ไม่มีหน่วยวินาที) ---
function formatTimeRemaining(timeLeftMs) {
    if (timeLeftMs <= 0) {
        return "00 ชั่วโมง 00 นาที"; 
    }
    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, '0')} ชั่วโมง ${minutes.toString().padStart(2, '0')} นาที`; 
}

// --- ฟังก์ชันนับถอยหลังสำหรับการสุ่มคำใบ้ (Main button cooldown) ---
let countdownInterval;

function startCountdown(endTimeMs) {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    randomizeButton.disabled = true;
    randomizeButton.textContent = 'รอสักครู่นะ...'; // เปลี่ยนข้อความปุ่ม

    countdownInterval = setInterval(() => {
        const now = Date.now();
        const timeLeftMs = endTimeMs - now;

        if (timeLeftMs <= 0) {
            clearInterval(countdownInterval);
            countdownDisplay.textContent = '';
            randomizeButton.disabled = false;
            randomizeButton.textContent = 'เริ่มสุ่ม'; // เปลี่ยนข้อความปุ่ม
            statusMessage.textContent = 'พร้อมสุ่มคำใบ้แล้ว!'; // เปลี่ยนข้อความสถานะ
            statusMessage.style.color = 'green';
            // เมื่อ Cooldown หมดแล้ว อาจจะ Fetch สถานะล่าสุดอีกครั้งเพื่อความแน่ใจ
            checkInitialCooldownStatus();
            return;
        }

        countdownDisplay.textContent = `เวลาที่เหลือ: ${formatTimeRemaining(timeLeftMs)}`; // เปลี่ยนข้อความ
        countdownDisplay.style.color = 'orange'; // เปลี่ยนสี
    }, 1000);
}

// --- ฟังก์ชันนับถอยหลังสำหรับการเพิ่มคำใบ้ (Add button cooldown) ---
let addCountdownInterval;

function startAddCountdown(endTimeMs) {
    if (addCountdownInterval) {
        clearInterval(addCountdownInterval);
    }
    addHintButton.disabled = true;
    addHintButton.textContent = 'รอสักครู่...'; // เปลี่ยนข้อความปุ่ม

    addCountdownInterval = setInterval(() => {
        const now = Date.now();
        const timeLeftMs = endTimeMs - now;

        if (timeLeftMs <= 0) {
            clearInterval(addCountdownInterval);
            addHintCountdownDisplay.textContent = '';
            addHintButton.disabled = false;
            addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
            addHintMessage.textContent = 'พร้อมเพิ่มคำใบ้แล้ว!'; // เปลี่ยนข้อความสถานะ
            addHintMessage.style.color = 'green';
            // เมื่อ Cooldown หมดแล้ว อาจจะ Fetch สถานะล่าสุดอีกครั้งเพื่อความแน่ใจ
            checkInitialCooldownStatus();
            return;
        }

        addHintCountdownDisplay.textContent = `เวลาที่เหลือ (เพิ่มคำ): ${formatTimeRemaining(timeLeftMs)}`; // เปลี่ยนข้อความ
        addHintCountdownDisplay.style.color = 'orange'; // เปลี่ยนสี
    }, 1000);
}

// --- Core Functions ---

// 1. สุ่มคำใบ้
randomizeButton.addEventListener('click', async () => {
    randomHintDisplay.textContent = "กำลังสุ่ม...";
    statusMessage.textContent = '';
    countdownDisplay.textContent = '';
    randomizeButton.disabled = true;
    randomizeButton.textContent = 'กำลังสุ่ม...';
    const userId = getOrCreateUserId();

    let requestUrl = '/api/random-hint';
    if (lastPickedHintId) { // ส่ง ID ของคำที่เพิ่งสุ่มไป เพื่อให้ Backend ไม่สุ่มซ้ำทันที
        requestUrl += `?exclude_id=${lastPickedHintId}`;
    }

    try {
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            randomHintDisplay.textContent = `${data.hint.faculty} : ${data.hint.text}`;
            lastPickedHintId = data.hint.id; // เก็บ ID ของคำที่สุ่มได้ล่าสุด

            displayRandomizedHistory(); 

            // Update spin status and manage cooldown
            if (data.cooldown_active && data.cooldown_end_timestamp) {
                statusMessage.textContent = data.error || `คุณสุ่มครบโควต้าแล้ว!`; // เปลี่ยนข้อความสถานะ
                statusMessage.style.color = 'red';
                startCountdown(data.cooldown_end_timestamp);
            } else {
                statusMessage.textContent = `คุณสุ่มได้อีก ${data.spins_left} ครั้งในรอบนี้`;
                statusMessage.style.color = 'green';
                randomizeButton.disabled = false;
                randomizeButton.textContent = 'เริ่มสุ่ม'; // เปลี่ยนข้อความปุ่ม
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownDisplay.textContent = '';
                }
            }

        } else {
            randomHintDisplay.textContent = '';
            statusMessage.textContent = data.error || 'ไม่สามารถสุ่มคำใบ้ได้';
            statusMessage.style.color = 'red';

            // หากเป็น Error ที่ไม่เกี่ยวกับ Cooldown แต่มี Cooldown Timestamp ก็ยังแสดง Cooldown
            if (data.cooldown_end_timestamp) {
                startCountdown(data.cooldown_end_timestamp);
            } else {
                randomizeButton.disabled = false;
                randomizeButton.textContent = 'เริ่มสุ่ม'; // เปลี่ยนข้อความปุ่ม
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownDisplay.textContent = '';
                }
            }
        }
    } catch (error) {
        console.error('Error fetching random hint:', error);
        randomHintDisplay.textContent = '';
        statusMessage.textContent = "เกิดข้อผิดพลาดในการเชื่อมต่อ Server";
        statusMessage.style.color = 'red';
        randomizeButton.disabled = false;
        randomizeButton.textContent = 'เริ่มสุ่ม'; // เปลี่ยนข้อความปุ่ม
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownDisplay.textContent = '';
        }
    }
});

// 2. เพิ่มคำใบ้ใหม่
addHintButton.addEventListener('click', async () => {
    const selectedFaculty = facultySelect.value;
    const newHintText = addHintInput.value.trim();
    const userId = getOrCreateUserId();

    addHintMessage.textContent = '';
    addHintCountdownDisplay.textContent = '';
    addHintButton.disabled = true;
    addHintButton.textContent = 'กำลังเพิ่ม...';

    if (!selectedFaculty) {
        showMessage(addHintMessage, "กรุณาเลือกคณะก่อน!", 'error');
        addHintButton.disabled = false;
        addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
        return;
    }
    if (!newHintText) {
        showMessage(addHintMessage, "กรุณาพิมพ์คำใบ้ก่อน!", 'error');
        addHintButton.disabled = false;
        addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
        return;
    }

    try {
        const response = await fetch('/api/hints', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({ faculty: selectedFaculty, text: newHintText })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showMessage(addHintMessage, data.message, 'success');
            addHintInput.value = '';
            facultySelect.value = '';

            displayRandomizedHistory(); 

            if (data.cooldown_active && data.cooldown_end_timestamp) {
                addHintMessage.textContent = data.error || `คุณเพิ่มคำครบโควต้าแล้ว!`; // เปลี่ยนข้อความสถานะ
            } else {
                addHintMessage.textContent = `คุณเพิ่มคำใบ้ได้อีก ${data.adds_left} ครั้งในรอบนี้`;
            }
            addHintMessage.style.color = 'green';
            addHintButton.disabled = false;
            addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม

            if (data.cooldown_active && data.cooldown_end_timestamp) {
                startAddCountdown(data.cooldown_end_timestamp);
            } else {
                 if (addCountdownInterval) {
                    clearInterval(addCountdownInterval);
                    addHintCountdownDisplay.textContent = '';
                }
            }


        } else {
            showMessage(addHintMessage, data.error || 'เกิดข้อผิดพลาดในการเพิ่มคำใบ้', 'error');

            if (data.cooldown_end_timestamp) {
                startAddCountdown(data.cooldown_end_timestamp);
            } else {
                addHintButton.disabled = false;
                addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
                if (addCountdownInterval) {
                    clearInterval(addCountdownInterval);
                    addHintCountdownDisplay.textContent = '';
                }
            }
        }
    }
    catch (error) {
        console.error('Error adding hint:', error);
        showMessage(addHintMessage, 'เกิดข้อผิดพลาดในการเชื่อมต่อ Server', 'error');
        addHintButton.disabled = false;
        addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
        if (addCountdownInterval) {
            clearInterval(addCountdownInterval);
        }
        addHintCountdownDisplay.textContent = '';
    }
});

// 3. แสดงประวัติคำใบ้ที่สุ่มได้ (ดึงข้อมูลจาก Server เพื่อให้เวลาที่เหลือถูกต้องและสอดคล้องกัน)
async function displayRandomizedHistory() {
    randomizedHistoryList.innerHTML = '';
    const userId = getOrCreateUserId();

    try {
        const response = await fetch('/api/user/spin-history', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            }
        });
        const data = await response.json();

        if (response.ok && data.success && data.history.length > 0) {
            const COOLDOWN_HOURS_SERVER = 6; 
            const COOLDOWN_MS_SERVER = COOLDOWN_HOURS_SERVER * 60 * 60 * 1000;
            const currentTime = Date.now();

            data.history.forEach((hintItem) => {
                const li = document.createElement('li');
                // แสดงทั้งคณะและข้อความคำใบ้
                li.textContent = `${hintItem.faculty || 'ไม่ระบุคณะ'} : ${hintItem.hint_text}`; 

                const timeStatusSpan = document.createElement('span');
                timeStatusSpan.className = 'history-time-status';

                // ตรวจสอบว่าคำนั้นถูกสุ่ม (random_pick) หรือถูกเพิ่มโดยผู้ใช้ปัจจุบัน (add_hint)
                // เพื่อแสดง Cooldown ที่เหมาะสม
                if (hintItem.activity_type === 'random_pick' || (hintItem.activity_type === 'add_hint' && hintItem.hint_owner_user_id === userId)) {
                    const expiryTimeForThisItem = hintItem.timestamp + COOLDOWN_MS_SERVER; 
                    const timeLeftForHistoryItem = expiryTimeForThisItem - currentTime;

                    if (timeLeftForHistoryItem <= 0) {
                        timeStatusSpan.textContent = ` (หายไปจากประวัติแล้ว)`; 
                        timeStatusSpan.style.color = 'green';
                    } else {
                        const hours = Math.floor(timeLeftForHistoryItem / (1000 * 60 * 60));
                        const minutes = Math.floor((timeLeftForHistoryItem % (1000 * 60 * 60)) / (1000 * 60));
                        timeStatusSpan.textContent = ` (จะหายใน ${hours.toString().padStart(2, '0')} ชม. ${minutes.toString().padStart(2, '0')} นาที)`; // ตัดวินาทีออก
                        timeStatusSpan.style.color = 'blue'; 
                    }
                }
                // สำหรับ 'add_hint' ที่ผู้ใช้อื่นเพิ่ม จะไม่แสดง Cooldown

                li.appendChild(timeStatusSpan);

                // เพิ่มสถานะ "คำที่คุณเพิ่ม" หรือ "คำที่ผู้ใช้อื่นเพิ่ม"
                if (hintItem.activity_type === 'add_hint' && hintItem.hint_owner_user_id === userId) {
                    const typeSpan = document.createElement('span');
                    typeSpan.textContent = ` (คำที่คุณเพิ่ม)`;
                    typeSpan.style.fontWeight = 'bold';
                    typeSpan.style.color = '#8A2BE2'; // สีม่วง
                    li.appendChild(typeSpan);
                } else if (hintItem.activity_type === 'add_hint') { // คำที่ผู้ใช้อื่นเพิ่ม (หรือ Admin)
                     const typeSpan = document.createElement('span');
                    typeSpan.textContent = ` (คำที่ผู้ใช้อื่นเพิ่ม)`;
                    typeSpan.style.color = '#777'; 
                    li.appendChild(typeSpan);
                }
                // ถ้าเป็น 'random_pick' ไม่ต้องแสดงอะไรเป็นพิเศษ

                randomizedHistoryList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = "ยังไม่มีประวัติการสุ่ม";
            randomizedHistoryList.appendChild(li);
        }
    } catch (error) {
        console.error('Error fetching randomized history:', error);
        const li = document.createElement('li');
        li.textContent = "ไม่สามารถโหลดประวัติได้";
        randomizedHistoryList.appendChild(li);
    }
}

// 4. ฟังก์ชันล้างประวัติที่หมดอายุ (Client-side expiration) - ไม่ได้ใช้งานโดยตรงแล้ว
// เนื่องจากประวัติและ Cooldown ทั้งหมดถูกจัดการที่ Server
function clearExpiredHistoryClientSide() {
    console.log("Client-side local history cleanup is no longer directly used as history and cooldown are now managed by the server.");
}

// 5. ปุ่มสลับการแสดงประวัติ
toggleRandomizedHistoryButton.addEventListener('click', () => {
    randomizedHistoryList.classList.toggle('hidden');
    if (randomizedHistoryList.classList.contains('hidden')) {
        toggleRandomizedHistoryButton.textContent = 'แสดงประวัติคำที่สุ่มได้';
    } else {
        toggleRandomizedHistoryButton.textContent = 'ซ่อนประวัติคำที่สุ่มได้';
        displayRandomizedHistory(); // ตรวจสอบให้แน่ใจว่าประวัติเป็นข้อมูลล่าสุดเมื่อแสดง
    }
});

// ฟังก์ชันสำหรับตรวจสอบสถานะ Cooldown เริ่มต้นของทั้งสองฟังก์ชัน
async function checkInitialCooldownStatus() {
    const userId = getOrCreateUserId();
    console.log('DEBUG: Checking initial cooldown status for User ID:', userId);

    try {
        const response = await fetch('/api/user/status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            }
        });
        const data = await response.json();
        console.log('DEBUG: Initial Cooldown Status API Response:', data);

        // Update Spin Cooldown Status
        const spinStatus = data.spin_status;
        if (spinStatus.cooldownActive && spinStatus.cooldownEndTime) {
            statusMessage.textContent = `คุณสุ่มคำครบ 3 ครั้งแล้ว กรุณารออีกประมาณ ${Math.ceil((spinStatus.cooldownEndTime - Date.now()) / (1000 * 60 * 60))} ชั่วโมง`;
            statusMessage.style.color = 'red';
            startCountdown(spinStatus.cooldownEndTime);
        } else {
            statusMessage.textContent = `คุณสุ่มได้อีก ${spinStatus.spinsLeft} ครั้งในรอบนี้`;
            statusMessage.style.color = 'green';
            randomizeButton.disabled = false;
            randomizeButton.textContent = 'เริ่มสุ่ม'; // เปลี่ยนข้อความปุ่ม
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownDisplay.textContent = '';
            }
        }

        // Update Add Cooldown Status
        const addStatus = data.add_status;
        if (addStatus.cooldownActive && addStatus.cooldownEndTime) {
            addHintMessage.textContent = `คุณเพิ่มคำใบ้ครบ 3 ครั้งแล้ว กรุณารออีกประมาณ ${Math.ceil((addStatus.cooldownEndTime - Date.now()) / (1000 * 60 * 60))} ชั่วโมง`;
            addHintMessage.style.color = 'red';
            startAddCountdown(addStatus.cooldownEndTime);
        } else {
            addHintButton.disabled = false;
            addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
            addHintMessage.textContent = `คุณเพิ่มคำใบ้ได้อีก ${addStatus.addsLeft} ครั้งในรอบนี้`;
            addHintMessage.style.color = 'green';
            if (addCountdownInterval) {
                clearInterval(addCountdownInterval);
                addHintCountdownDisplay.textContent = '';
            }
        }

    } catch (error) {
        console.error('DEBUG: Error checking initial cooldown status:', error);
        statusMessage.textContent = "ไม่สามารถตรวจสอบสถานะ Cooldown ได้ในตอนนี้";
        statusMessage.style.color = 'orange';
        randomizeButton.disabled = false;
        randomizeButton.textContent = 'เริ่มสุ่ม'; // เปลี่ยนข้อความปุ่ม
        addHintMessage.textContent = "ไม่สามารถตรวจสอบสถานะ Cooldown การเพิ่มคำใบ้ได้ในตอนนี้";
        addHintMessage.style.color = 'orange';
        addHintButton.disabled = false;
        addHintButton.textContent = 'เพิ่มคำ'; // เปลี่ยนข้อความปุ่ม
    }
}


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    // Clear client-side history (no longer strictly necessary but good practice for cleanup)
    clearExpiredHistoryClientSide(); 

    // Check and display initial cooldown statuses for both spin and add
    await checkInitialCooldownStatus();

    // Display history from server on load
    displayRandomizedHistory(); 
});
