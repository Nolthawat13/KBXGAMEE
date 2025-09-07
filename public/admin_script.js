// --- DOM Elements for Admin Panel ---
const adminLoginSection = document.getElementById('adminLoginSection');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminLoginButton = document.getElementById('adminLoginButton');
const adminLoginMessage = document.getElementById('adminLoginMessage');
const adminContent = document.getElementById('adminContent');

const refreshHintsButton = document.getElementById('refreshHintsButton');
const allHintsList = document.getElementById('allHintsList');
const manageHintMessage = document.getElementById('manageHintMessage');
const editHintModal = document.getElementById('editHintModal');
const editHintId = document.getElementById('editHintId');
const editFacultySelect = document.getElementById('editFacultySelect');
const editHintTextInput = document.getElementById('editHintTextInput');
const saveEditButton = document.getElementById('saveEditButton');
const cancelEditButton = document.getElementById('cancelEditButton');

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

// --- Admin Login Logic ---
adminLoginButton.addEventListener('click', async () => {
    const password = adminPasswordInput.value;
    if (!password) {
        showMessage(adminLoginMessage, "กรุณากรอกรหัสผ่าน", 'error');
        return;
    }

    try {
        // เราจะใช้ API การดึงข้อมูลทั้งหมดเป็นตัวทดสอบรหัสผ่าน
        // โดยส่งรหัสผ่านไปใน body ของ POST request
        const response = await fetch('/api/admin/hints/all', {
            method: 'POST', // ต้องเป็น POST
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password }) // ส่งรหัสผ่านใน body
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showMessage(adminLoginMessage, "เข้าสู่ระบบสำเร็จ!", 'success');
            adminLoginSection.classList.add('hidden'); // ซ่อนส่วน Login
            adminContent.classList.remove('hidden'); // แสดงส่วน Admin Content
            loadAllHints(); // โหลดคำใบ้ทั้งหมดทันทีที่เข้าสู่ระบบ
        } else {
            showMessage(adminLoginMessage, data.error || 'รหัสผ่านไม่ถูกต้อง', 'error');
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        showMessage(adminLoginMessage, 'เกิดข้อผิดพลาดในการเชื่อมต่อ Server', 'error');
    }
});

// --- Core Admin Functions ---

// 1. โหลดและแสดงคำใบ้ทั้งหมดในส่วน Manage Hints
async function loadAllHints() {
    allHintsList.innerHTML = '<li>กำลังโหลดคำใบ้...</li>';
    const password = adminPasswordInput.value; // ดึงรหัสผ่านที่กรอกไปแล้ว

    try {
        const response = await fetch('/api/admin/hints/all', { // เรียก API Admin
            method: 'POST', // ต้องเป็น POST เพื่อส่ง password ใน body
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password }) // ส่งรหัสผ่าน
        });
        const data = await response.json();

        if (response.ok && data.success) {
            allHintsList.innerHTML = '';
            if (data.hints.length === 0) {
                allHintsList.innerHTML = '<li>ยังไม่มีคำใบ้ในระบบ</li>';
                return;
            }
            data.hints.forEach(hint => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="hint-text">${hint.faculty} : ${hint.text}</span>
                    <div class="action-buttons">
                        <button class="edit-button" data-id="${hint.id}" data-faculty="${hint.faculty}" data-text="${hint.text}">แก้ไข</button>
                        <button class="delete-button" data-id="${hint.id}">ลบ</button>
                    </div>
                `;
                allHintsList.appendChild(li);
            });
            addEventListenersToManageButtons(); // เพิ่ม Event Listener หลังจากสร้างปุ่มแล้ว
            showMessage(manageHintMessage, `โหลดคำใบ้ ${data.hints.length} รายการสำเร็จ`, 'success');
        } else {
            allHintsList.innerHTML = `<li>${data.error || 'เกิดข้อผิดพลาดในการโหลดคำใบ้'}</li>`;
            showMessage(manageHintMessage, data.error || 'การโหลดคำใบ้ล้มเหลว', 'error');
        }
    } catch (error) {
        console.error('Error fetching all hints:', error);
        showMessage(manageHintMessage, 'เกิดข้อผิดพลาดในการเชื่อมต่อ Server เพื่อโหลดคำใบ้', 'error');
    }
}

// 2. เพิ่ม Event Listener ให้กับปุ่มแก้ไขและลบ
function addEventListenersToManageButtons() {
    // Event Listener สำหรับปุ่มแก้ไข
    document.querySelectorAll('.edit-button').forEach(button => {
        button.onclick = (event) => {
            const id = event.target.dataset.id;
            const faculty = event.target.dataset.faculty;
            const text = event.target.dataset.text;

            editHintId.value = id;
            editFacultySelect.value = faculty;
            editHintTextInput.value = text;
            editHintModal.classList.add('show');
        };
    });

    // Event Listener สำหรับปุ่มลบ
    document.querySelectorAll('.delete-button').forEach(button => {
        button.onclick = async (event) => {
            const id = event.target.dataset.id;
            const password = adminPasswordInput.value; // ดึงรหัสผ่านที่กรอกไปแล้ว

            if (confirm(`คุณต้องการลบคำใบ้ ID: ${id} นี้จริงหรือไม่?`)) {
                try {
                    const response = await fetch(`/api/admin/hints/${id}`, { // เรียก API Admin
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ password: password }) // ส่งรหัสผ่าน
                    });
                    const data = await response.json();

                    if (response.ok && data.success) {
                        showMessage(manageHintMessage, data.message, 'success');
                        loadAllHints(); // โหลดรายการใหม่หลังจากลบ
                    } else {
                        showMessage(manageHintMessage, data.error || 'เกิดข้อผิดพลาดในการลบคำใบ้', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting hint:', error);
                    showMessage(manageHintMessage, 'เกิดข้อผิดพลาดในการเชื่อมต่อ Server', 'error');
                }
            }
        };
    });
}

// 3. Event Listener สำหรับปุ่ม "โหลดคำใบ้ทั้งหมด"
refreshHintsButton.addEventListener('click', loadAllHints);

// 4. Event Listener สำหรับปุ่ม "บันทึก" ใน Modal แก้ไข
saveEditButton.addEventListener('click', async () => {
    const id = editHintId.value;
    const faculty = editFacultySelect.value;
    const text = editHintTextInput.value.trim();
    const password = adminPasswordInput.value; // ดึงรหัสผ่านที่กรอกไปแล้ว

    if (!faculty) {
        showMessage(manageHintMessage, "กรุณาเลือกคณะ", 'error');
        return;
    }
    if (!text) {
        showMessage(manageHintMessage, "กรุณาพิมพ์คำใบ้", 'error');
        return;
    }

    try {
        const response = await fetch(`/api/admin/hints/${id}`, { // เรียก API Admin
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ faculty, text, password }) // ส่งทั้ง faculty, text, และ password
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showMessage(manageHintMessage, data.message, 'success');
            editHintModal.classList.remove('show'); // ปิด Modal
            loadAllHints(); // โหลดรายการใหม่หลังจากแก้ไข
        } else {
            showMessage(manageHintMessage, data.error || 'เกิดข้อผิดพลาดในการแก้ไขคำใบ้', 'error');
        }
    } catch (error) {
        console.error('Error updating hint:', error);
        showMessage(manageHintMessage, 'เกิดข้อผิดพลาดในการเชื่อมต่อ Server', 'error');
    }
});

// 5. Event Listener สำหรับปุ่ม "ยกเลิก" ใน Modal แก้ไข
cancelEditButton.addEventListener('click', () => {
    editHintModal.classList.remove('show');
});

// Initial setup: ไม่ต้องโหลดทันที รอ Admin ล็อกอิน
// document.addEventListener('DOMContentLoaded', () => {
//     loadAllHints();
// });
