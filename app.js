// app.js

// Firebase Configuration (***กรุณาเปลี่ยนเป็นของที่คุณใช้จริง***)
const firebaseConfig = {
    apiKey: "AIzaSyCi2dw_qpuyj-hkwNc-meqX8wamKN0MrWE", 
    authDomain: "file-management-system-5eadd.firebaseapp.com",
    projectId: "file-management-system-5eadd",
    storageBucket: "file-management-system-5eadd.firebasestorage.app",
    messagingSenderId: "905827184615",
    appId: "1:905827184615:web:a5d290c78ffc51a85b5742"
};

// Global variables
let currentEmployee = null; 
let isAdmin = false;       
let withdrawalData = []; 
let employeeData = []; 
let db = null;
let firebaseInitialized = false;

// Local Storage Keys
const LS_USER_KEY = 'currentEmployee';
const LS_ADMIN_KEY = 'isAdmin';

// DOM Elements
const loginPage = document.getElementById('loginPage');
const withdrawalPage = document.getElementById('withdrawalPage');
const adminPage = document.getElementById('adminPage');
const loginForm = document.getElementById('loginForm');
const successModal = document.getElementById('successModal');
const connectionStatus = document.getElementById('connectionStatus');
const notification = document.getElementById('notification');
const manageEmployeesModal = document.getElementById('manageEmployeesModal');
const employeeListTable = document.getElementById('employeeListTable');

// 🟢 DOM Elements สำหรับจัดการวันที่รอบเบิกเงิน
const currentWithdrawalDateSpan = document.getElementById('currentWithdrawalDate');
const displayCurrentWithdrawalDateSpan = document.getElementById('displayCurrentWithdrawalDate');
const editCurrentWithdrawalDateBtn = document.getElementById('editCurrentWithdrawalDateBtn');
const editDateModal = document.getElementById('editDateModal');
const closeDateModal = document.getElementById('closeDateModal');
const setDateForm = document.getElementById('setDateForm');
const newDateInput = document.getElementById('newDateInput');

// 🔴 DOM Elements สำหรับ Custom Confirmation Modal (ต้องมีใน HTML)
const confirmationModal = document.getElementById('confirmationModal'); 
const confirmMessage = document.getElementById('confirmMessage'); 
const confirmActionBtn = document.getElementById('confirmActionBtn'); 
const cancelActionBtn = document.getElementById('cancelActionBtn');


// --- State Management (Local Storage) ---

function saveLoginState(userType, employeeDetails = null) {
    if (userType === 'admin') {
        localStorage.setItem(LS_ADMIN_KEY, 'true');
        localStorage.removeItem(LS_USER_KEY);
        isAdmin = true;
        currentEmployee = null;
    } else if (userType === 'employee' && employeeDetails) {
        localStorage.setItem(LS_USER_KEY, JSON.stringify(employeeDetails));
        localStorage.removeItem(LS_ADMIN_KEY);
        isAdmin = false;
        currentEmployee = employeeDetails;
    }
}

function clearLoginState() {
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_ADMIN_KEY);
    isAdmin = false;
    currentEmployee = null;
}

function loadLoginState() {
    const adminState = localStorage.getItem(LS_ADMIN_KEY);
    const employeeState = localStorage.getItem(LS_USER_KEY);

    if (adminState === 'true') {
        isAdmin = true;
        currentEmployee = null;
        return 'admin';
    } else if (employeeState) {
        try {
            currentEmployee = JSON.parse(employeeState);
            isAdmin = false;
            return 'employee';
        } catch (e) {
            console.error("Error parsing employee state:", e);
            clearLoginState();
        }
    }
    return 'none';
}


// --- Notification Functions ---

function showNotification(message, type = 'info') {
    let bgColor, icon;
    if (type === 'success') {
        bgColor = 'bg-success-500';
        icon = '✅';
    } else if (type === 'error') {
        bgColor = 'bg-red-500';
        icon = '❌';
    } else {
        bgColor = 'bg-primary-500';
        icon = 'ℹ️';
    }

    notification.innerHTML = `
        <div class="${bgColor} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transform scale-100 opacity-100 transition-all duration-300">
          
        <span class="text-xl"></span>
            <span class="font-medium whitespace-nowrap">${message}</span>
        </div>
    `;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.querySelector('div').classList.replace('opacity-100', 'opacity-0');
        notification.querySelector('div').classList.replace('scale-100', 'scale-95');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 3000);
}

// 🔴 Custom Confirmation Modal Logic (New)
/**
 * แสดง Modal สำหรับยืนยันการดำเนินการ
 * @param {string} message - ข้อความที่จะแสดงใน Modal
 * @param {function} onConfirm - ฟังก์ชันที่จะถูกเรียกเมื่อผู้ใช้กดยืนยัน (true/false)
 */
function showCustomConfirm(message, onConfirm) {
    if (!confirmationModal) {
        // Fallback หากไม่มี Modal ใน HTML (ไม่ควรเกิดขึ้นหากเพิ่ม HTML แล้ว)
        console.error("Confirmation modal DOM elements not found. Falling back to native confirm.");
        const result = window.confirm(message);
        onConfirm(result);
        return;
    }

    // เพื่อให้ Modal ปรากฏอย่างถูกต้อง
    confirmMessage.textContent = message;
    confirmationModal.classList.remove('hidden');
    
    // ใส่ Animation เข้าไปอีกนิด
    const modalContent = document.getElementById('confirmModalContent');
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');


    // สร้างฟังก์ชัน Handler ที่จะถูกลบหลังจากใช้งาน
    const handleConfirm = () => {
        // ล้าง Event Listeners ก่อนซ่อน Modal
        confirmActionBtn.removeEventListener('click', handleConfirm);
        cancelActionBtn.removeEventListener('click', handleCancel);

        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            confirmationModal.classList.add('hidden');
            onConfirm(true); // ยืนยัน
        }, 300); // รอ animation จบ
    };

    const handleCancel = () => {
        // ล้าง Event Listeners ก่อนซ่อน Modal
        confirmActionBtn.removeEventListener('click', handleConfirm);
        cancelActionBtn.removeEventListener('click', handleCancel);

        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            confirmationModal.classList.add('hidden');
            onConfirm(false); // ยกเลิก
        }, 300); // รอ animation จบ
    };

    // เพิ่ม Event Listeners ใหม่
    confirmActionBtn.addEventListener('click', handleConfirm);
    cancelActionBtn.addEventListener('click', handleCancel);
}


// --- Firebase Initialization ---

async function initializeFirebase() {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        firebaseInitialized = true;
        updateConnectionStatus('connected');
        
        await initializeSampleData();
        await restoreSession(); 
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        updateConnectionStatus('error', error.message);
        showNotification('❌ ข้อผิดพลาด: ไม่สามารถเชื่อมต่อ Firebase ได้', 'error');
    }
}

function updateConnectionStatus(status, message = '') {
    const statusDiv = connectionStatus.querySelector('div');
    
    if (status === 'connected') {
        statusDiv.className = 'bg-success-500 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm';
        statusDiv.innerHTML = '✅ เชื่อมต่อ สำเร็จ';
        setTimeout(() => {
            connectionStatus.classList.add('opacity-0');
            setTimeout(() => connectionStatus.style.display = 'none', 300);
        }, 3000);
    } else if (status === 'error') {
        statusDiv.className = 'bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm';
        statusDiv.innerHTML = '❌ เชื่อมต่อ ไม่สำเร็จ';
        connectionStatus.classList.remove('opacity-0');
        connectionStatus.style.display = 'block';
    }
}

async function initializeSampleData() {
    try {
        // ตรวจสอบข้อมูลพนักงาน (ถ้าว่างให้สร้างตัวอย่าง)
        const employeesSnapshot = await db.collection('employees').limit(1).get();
        if (employeesSnapshot.empty) {
             const sampleEmployees = [
                 { id: '001', name: 'สมชาย ใจดี', phone: '0929604003' },
                 { id: '002', name: 'สมหญิง รักงาน', phone: '0812345678' },
                 { id: '003', name: 'วิชัย ขยันทำงาน', phone: '0987654321' }
             ];

             const batch = db.batch();
             sampleEmployees.forEach(emp => {
                 batch.set(db.collection('employees').doc(emp.id), emp);
             });
             await batch.commit();
        }
        
        // 🟢 ตรวจสอบและสร้างรอบเบิกเงินปัจจุบันเริ่มต้น
        const settingsDoc = await db.collection('system').doc('settings').get();
        if (!settingsDoc.exists || !settingsDoc.data().currentWithdrawalDate) {
            // ใช้ค่าเริ่มต้นเป็นวันที่ 10 ของเดือนหน้าในรูปแบบ DD/MM/YYYY (พ.ศ.)
            const today = new Date();
            let year = today.getFullYear();
            let month = today.getMonth() + 1; // เดือนถัดไป (0-11 -> 1-12)
            
            if (month > 11) {
                month = 0; // มกราคม
                year += 1; // ปีถัดไป
            }
            
            const targetDate = new Date(year, month, 10);
            const yearBE = targetDate.getFullYear() + 543; // แปลงเป็น พ.ศ.
            // ดึง month และ day จาก targetDate (ซึ่ง month จะเป็น 0-11)
            const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0'); // แก้เป็น +1
            const dayStr = String(targetDate.getDate()).padStart(2, '0');
            
            // Format เป็น DD/MM/YYYY (พ.ศ.)
            const initialDateString = `${dayStr}/${monthStr}/${yearBE}`; 

            await db.collection('system').doc('settings').set({
                enabled: true,
                currentWithdrawalDate: initialDateString 
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

async function restoreSession() {
    const userType = loadLoginState();
    
    if (userType === 'admin') {
        await showAdminPage();
    } else if (userType === 'employee') {
        await showWithdrawalPage();
    } else {
        loginPage.classList.remove('hidden');
        withdrawalPage.classList.add('hidden');
        adminPage.classList.add('hidden');
    }
}


// --- Utility Functions ---

/**
 * 🟢 ดึงวันที่รอบเบิกเงินปัจจุบันจาก Firestore
 * @returns {string} วันที่ในรูปแบบ DD/MM/YYYY (พ.ศ.) หรือข้อความไม่ระบุ
 */
async function loadCurrentWithdrawalDate() {
    try {
        const settingsDoc = await db.collection('system').doc('settings').get();
        const date = settingsDoc.exists ? settingsDoc.data().currentWithdrawalDate : null;
        
        const displayDate = date || 'ไม่ระบุ';
        
        // อัปเดตบนหน้าพนักงาน
        if (currentWithdrawalDateSpan) {
            currentWithdrawalDateSpan.textContent = displayDate;
        }
        
        // อัปเดตบนหน้าแอดมิน
        if (displayCurrentWithdrawalDateSpan) {
            displayCurrentWithdrawalDateSpan.textContent = displayDate;
        }
        
        return date;

    } catch (error) {
        console.error('Error loading current withdrawal date:', error);
        if (currentWithdrawalDateSpan) currentWithdrawalDateSpan.textContent = 'ข้อผิดพลาด!';
        if (displayCurrentWithdrawalDateSpan) displayCurrentWithdrawalDateSpan.textContent = 'ข้อผิดพลาด!';
        return null;
    }
}


// --- Navigation and Logout ---

function logout() {
    clearLoginState();
    currentEmployee = null;
    isAdmin = false;
    withdrawalData = [];
    
    // Reset forms and view
    loginForm.reset();
    if (document.getElementById('withdrawAmount')) {
         document.getElementById('withdrawAmount').value = '';
    }
    
    loginPage.classList.remove('hidden');
    withdrawalPage.classList.add('hidden');
    adminPage.classList.add('hidden');
    
    document.getElementById('withdrawalForm').classList.remove('hidden');
    document.getElementById('alreadyWithdrawn').classList.add('hidden');
    showNotification('ออกจากระบบเรียบร้อย', 'info');
}

// --- Employee/Admin Pages ---

async function showWithdrawalPage() {
    loginPage.classList.add('hidden');
    adminPage.classList.add('hidden');
    withdrawalPage.classList.remove('hidden');
    
    // 🟢 แสดงชื่อพนักงาน
    if (currentEmployee) {
        document.getElementById('employeeName').textContent = `สวัสดีคุณ, ${currentEmployee.name}`;
    }
    
    // 🟢 โหลดและแสดงวันที่รอบเบิกเงิน
    await loadCurrentWithdrawalDate(); 
    
    // Check if already withdrawn
    try {
        if (!currentEmployee) return; // ป้องกันกรณีหลุดเข้ามาโดยไม่มีพนักงาน
        
        const withdrawalDoc = await db.collection('withdrawals').doc(currentEmployee.id).get();
        
        if (withdrawalDoc.exists) {
            const data = withdrawalDoc.data();
            
            document.getElementById('withdrawalForm').classList.add('hidden');
            document.getElementById('alreadyWithdrawn').classList.remove('hidden');
            document.getElementById('withdrawnAmount').textContent = `${data.amount.toLocaleString()} บาท`;
            
            const dateText = currentWithdrawalDateSpan.textContent !== 'ไม่ระบุ' ? 
                             ` (สำหรับรอบวันที่ ${currentWithdrawalDateSpan.textContent})` : 
                             '';
            document.getElementById('alreadyWithdrawn').querySelector('p').textContent = 
                `คำขอเบิกเงินของคุณได้รับการบันทึกแล้ว${dateText}`;
            
        } else {
            document.getElementById('withdrawalForm').classList.remove('hidden');
            document.getElementById('alreadyWithdrawn').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking withdrawal status:', error);
        showNotification('ข้อผิดพลาดในการตรวจสอบสถานะเบิกเงิน', 'error');
    }
}

async function refreshAdminData() {
    if (!isAdmin) return;
    
    await loadCurrentWithdrawalDate(); 
    await loadWithdrawalData();
    await loadSystemStatus();
    await loadEmployees();
    // showNotification('🔄 Refresh สำเร็จ', 'info');
}

async function showAdminPage() {
    loginPage.classList.add('hidden');
    withdrawalPage.classList.add('hidden');
    adminPage.classList.remove('hidden');
    
    await refreshAdminData(); 
}

// --- Login Logic ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!firebaseInitialized) {
        showNotification('กรุณารอให้ระบบเชื่อมต่อ Firebase เสร็จก่อน', 'info');
        return;
    }
    
    const employeeId = document.getElementById('employeeId').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    
    const loginButton = document.getElementById('loginButton');
    loginButton.disabled = true;
    loginButton.textContent = 'กำลังตรวจสอบ...';
    
    try {
        // Admin check
        if (employeeId === 'admin' && phoneNumber === 'admin123') { // 💡 รหัสแอดมิน
            saveLoginState('admin'); 
            showAdminPage();
            showNotification('เข้าสู่ระบบผู้ดูแลเรียบร้อย', 'success');
            return;
        }

        // System status check for employees
        const systemDoc = await db.collection('system').doc('settings').get();
        if (systemDoc.exists && !systemDoc.data().enabled) {
            showNotification('ระบบเบิกเงินปิดให้บริการชั่วคราว 🛑', 'error');
            return;
        }

        // Employee check
        const employeeDoc = await db.collection('employees').doc(employeeId).get();
        
        if (employeeDoc.exists) {
            const employeeData = employeeDoc.data();
            
            if (employeeData.phone === phoneNumber) {
                const employeeDetails = { id: employeeId, ...employeeData };
                saveLoginState('employee', employeeDetails); 
                showWithdrawalPage();
                showNotification(`ยินดีต้อนรับ, ${employeeDetails.name}`, 'success');
            } else {
                showNotification('เบอร์โทรศัพท์ไม่ถูกต้อง', 'error');
            }
        } else {
            showNotification(`ไม่พบรหัสพนักงาน "${employeeId}" ในระบบ`, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'เข้าสู่ระบบ';
    }
});

// --- Employee Withdrawal Logic ---

document.getElementById('submitWithdrawal').addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    
    if (!amount || amount <= 0) {
        showNotification('กรุณากรอก\nจำนวนเงินที่ถูกต้อง', 'error');
        return;
    }
    
    // 🟢 ดึงวันที่รอบเบิกเงินปัจจุบันที่แสดงบนหน้าจอ
    const currentWithdrawalDate = currentWithdrawalDateSpan.textContent; 

    document.getElementById('submitWithdrawal').disabled = true;
    document.getElementById('submitWithdrawal').textContent = 'กำลังส่งคำขอ...';

    try {
        const withdrawalDoc = await db.collection('withdrawals').doc(currentEmployee.id).get();
        if (withdrawalDoc.exists) {
            showNotification('คุณได้ทำการเบิกเงินไปแล้ว', 'error');
            document.getElementById('submitWithdrawal').disabled = false;
            document.getElementById('submitWithdrawal').textContent = 'ส่งคำขอเบิกเงิน';
            return; 
        }
        
        // Save withdrawal data
        await db.collection('withdrawals').doc(currentEmployee.id).set({
            employeeId: currentEmployee.id,
            employeeName: currentEmployee.name,
            amount: amount,
            // 🟢 บันทึกวันที่รอบเบิกเงินปัจจุบันที่ใช้ในการยื่นคำขอ
            withdrawalDate: currentWithdrawalDate, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            displayDate: new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            }) 
        });
        
        document.getElementById('submitWithdrawal').disabled = false;
        document.getElementById('submitWithdrawal').textContent = 'ส่งคำขอเบิกเงิน';

        successModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        document.getElementById('submitWithdrawal').disabled = false;
        document.getElementById('submitWithdrawal').textContent = 'ส่งคำขอเบิกเงิน';
    }
});

document.getElementById('closeModal').addEventListener('click', () => {
    successModal.classList.add('hidden');
    showWithdrawalPage(); // Refresh to show "already withdrawn" state
});


// --- Admin Logic: System Controls ---

async function loadSystemStatus() {
    try {
        const systemDoc = await db.collection('system').doc('settings').get();
        const isEnabled = systemDoc.exists ? systemDoc.data().enabled : true;
        
        const statusElement = document.getElementById('systemStatus');
        const toggleButton = document.getElementById('toggleSystem');
        
        if (isEnabled) {
            statusElement.textContent = '🟢 เปิดระบบ';
            statusElement.className = 'text-lg font-bold text-success-600';
            toggleButton.textContent = 'ON'; // เปลี่ยนข้อความเป็น 'ปิดระบบ' เมื่อสถานะคือ 'เปิด'
            toggleButton.className = 'px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md bg-success-500 text-white hover:bg-red-600';
        } else {
            statusElement.textContent = '🔴 ปิดระบบ';
            statusElement.className = 'text-lg font-bold text-red-600';
            toggleButton.textContent = 'OFF'; // เปลี่ยนข้อความเป็น 'เปิดระบบ' เมื่อสถานะคือ 'ปิด'
            toggleButton.className = 'px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md bg-red-500 text-white hover:bg-success-600';
        }
    } catch (error) {
        console.error('Error loading system status:', error);
    }
}

document.getElementById('toggleSystem').addEventListener('click', async () => {
    try {
        const systemDoc = await db.collection('system').doc('settings').get();
        const currentStatus = systemDoc.exists ? systemDoc.data().enabled : true;
        const newStatus = !currentStatus;
        
        await db.collection('system').doc('settings').set({
            enabled: newStatus,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        await loadSystemStatus();
        
        const message = newStatus ? 'เปิดระบบเบิกเงินแล้ว' : 'ปิดระบบเบิกเงินแล้ว';
        showNotification(message, 'success');
    } catch (error) {
        console.error('Error toggling system status:', error);
        showNotification('เกิดข้อผิดพลาดในการเปลี่ยนสถานะระบบ', 'error');
    }
});

document.getElementById('resetWithdrawals').addEventListener('click', async () => {
    // 🔴 แทนที่ confirm ด้วย Custom Modal
    const message = '⚠️ ยืนยัน: รีเซ็ตข้อมูลการเบิกเงินทั้งหมดหรือไม่? (ข้อมูลที่บันทึกไว้จะถูกลบออกทั้งหมดเพื่อให้พนักงานสามารถยื่นคำขอเบิกเงินใหม่ได้)';

    showCustomConfirm(message, async (confirmed) => {
        if (!confirmed) {
            showNotification('การรีเซ็ตข้อมูลถูกยกเลิก', 'info');
            return;
        }
        
        try {
            const withdrawalsSnapshot = await db.collection('withdrawals').get();
            const batch = db.batch();
            withdrawalsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            await loadWithdrawalData();
            showNotification('✅ รีเซ็ตข้อมูลการเบิกเงินเรียบร้อยแล้ว', 'success');
        } catch (error) {
            console.error('Error resetting withdrawals:', error);
            showNotification('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล', 'error');
        }
    });
});


// --- Admin Logic: Withdrawal Data & Delete ---

async function loadWithdrawalData() {
    const tableBody = document.getElementById('withdrawalTable');
    tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">กำลังโหลดข้อมูล...</td></tr>`; 

    try {
        const withdrawalsSnapshot = await db.collection('withdrawals').orderBy('timestamp', 'desc').get();
        withdrawalData = [];
        let totalAmount = 0;
        let tableHTML = '';
        
        withdrawalsSnapshot.forEach(doc => {
            const data = doc.data();
            const docId = doc.id;
            withdrawalData.push(data);
            totalAmount += data.amount;
            
            const displayWithdrawalDate = data.withdrawalDate || 'ไม่ระบุ';
            const displaySubmissionDate = data.displayDate || 'ไม่ระบุ'; 
            
            tableHTML += `
                <tr class="hover:bg-gray-50" data-id="${docId}">
                    <td class="px-4 py-3">${data.employeeId}</td>
                    <td class="px-4 py-3">${data.employeeName}</td>
                    <td class="px-4 py-3 text-right font-mono text-lg text-success-700">${data.amount.toLocaleString()}</td>
                    
                    <td class="px-4 py-3 text-sm font-semibold text-primary-600">${displayWithdrawalDate}</td> 
                    
                    <td class="px-4 py-3 text-sm text-gray-600">${displaySubmissionDate}</td>
                    
                    <td class="px-4 py-3 text-center">
                        <button class="delete-withdrawal-btn text-red-500 hover:text-red-700 font-medium" data-id="${docId}">ลบ</button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHTML || `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    ยังไม่มีข้อมูลการเบิกเงิน
                </td>
            </tr>
        `;
        
        document.getElementById('totalAmount').textContent = `ยอดรวมทั้งหมด: ${totalAmount.toLocaleString()} บาท`;
        document.getElementById('withdrawnCount').textContent = withdrawalData.length.toString();
        document.getElementById('totalAmountSummary').textContent = `${totalAmount.toLocaleString()} ฿`;

    } catch (error) {
        console.error('Error loading withdrawal data:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">❌ เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
        showNotification('ข้อผิดพลาดในการโหลดข้อมูลการเบิกเงิน', 'error');
    }
}

// Event listener for Delete button on Admin Withdrawal Table
document.getElementById('withdrawalTable').addEventListener('click', async (e) => {
    const docId = e.target.dataset.id;
    if (!docId) return;
    
    // 🔴 ฟังก์ชันลบ - แทนที่ confirm
    if (e.target.classList.contains('delete-withdrawal-btn')) {
        
        showCustomConfirm(`คุณต้องการยืนยันการลบข้อมูลการเบิกเงินของพนักงาน ID: ${docId} นี้หรือไม่?`, async (confirmed) => {
            if (!confirmed) {
                showNotification('การดำเนินการถูกยกเลิก', 'info');
                return;
            }
            
            try {
                await db.collection('withdrawals').doc(docId).delete();
                await loadWithdrawalData();
                showNotification(`🗑️ ลบข้อมูลการเบิกเงินของ ID: ${docId} เรียบร้อย`, 'success');
                
                // หากพนักงานคนปัจจุบันถูกลบข้อมูลเบิกเงิน จะรีเฟรชหน้าพนักงาน
                if (currentEmployee && currentEmployee.id === docId) {
                    showWithdrawalPage(); 
                }
            } catch (error) {
                console.error('Error deleting withdrawal:', error);
                showNotification('ข้อผิดพลาดในการลบข้อมูลการเบิกเงิน', 'error');
            }
        });
    }
});


// --- 🟢 Admin Logic: Set Current Withdrawal Date ---

editCurrentWithdrawalDateBtn.addEventListener('click', async () => {
    const currentDate = await loadCurrentWithdrawalDate();
    
    // แปลง DD/MM/YYYY (พ.ศ.) เป็น YYYY-MM-DD (ค.ศ.) เพื่อใส่ใน input type="date"
    let isoDate = '';
    if (currentDate && currentDate !== 'ไม่ระบุ') {
        const parts = currentDate.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            // ต้องแปลง พ.ศ. เป็น ค.ศ.
            const yearAD = parseInt(year) < 2500 ? parseInt(year) : parseInt(year) - 543; 
            isoDate = `${yearAD}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    newDateInput.value = isoDate;
    editDateModal.classList.remove('hidden');
    // Animation
    setTimeout(() => {
        document.getElementById('dateModalContent').classList.replace('scale-95', 'scale-100');
        document.getElementById('dateModalContent').classList.replace('opacity-0', 'opacity-100');
    }, 50);
});

closeDateModal.addEventListener('click', () => {
    document.getElementById('dateModalContent').classList.replace('scale-100', 'scale-95');
    document.getElementById('dateModalContent').classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => {
        editDateModal.classList.add('hidden');
    }, 300);
});

setDateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isoDate = newDateInput.value; // YYYY-MM-DD (ค.ศ.)
    
    if (!isoDate) {
        return showNotification('กรุณาเลือกวันที่', 'error');
    }
    
    // แปลง YYYY-MM-DD (ค.ศ.) เป็น DD/MM/YYYY (พ.ศ.)
    const [year, month, day] = isoDate.split('-');
    const yearBE = parseInt(year) + 543;
    const formattedDate = `${day}/${month}/${yearBE}`;

    try {
        await db.collection('system').doc('settings').update({
            currentWithdrawalDate: formattedDate,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeDateModal.click(); // ปิด Modal
        showNotification(`✅ กำหนดรอบเบิกเงินเป็น ${formattedDate} เรียบร้อย`, 'success');
        
        // รีโหลดข้อมูล
        if (currentEmployee) {
             await showWithdrawalPage(); 
        } else {
             await loadCurrentWithdrawalDate();
        }

    } catch (error) {
        console.error('Error setting withdrawal date:', error);
        showNotification('ข้อผิดพลาดในการบันทึกวันที่', 'error');
    }
});


// --- Admin Logic: Employee Management & Excel Download (แก้ไขการใช้ confirm/prompt) ---

async function loadEmployees() {
    employeeListTable.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</td></tr>`;
    try {
        const employeesSnapshot = await db.collection('employees').orderBy('id').get();
        employeeData = [];
        let tableHTML = '';
        
        employeesSnapshot.forEach(doc => {
            const emp = { id: doc.id, ...doc.data() };
            employeeData.push(emp);
            
            tableHTML += `
                <tr class="hover:bg-gray-50 transition-colors" data-id="${emp.id}">
                    <td class="px-4 py-3 text-sm font-semibold">${emp.id}</td>
                    <td class="px-4 py-3">${emp.name}</td>
                    <td class="px-4 py-3">${emp.phone}</td>
                    <td class="px-4 py-3 text-center">
                        <button class="delete-btn text-red-500 hover:text-red-700 font-medium" data-id="${emp.id}">ลบ</button>
                    </td>
                </tr>
            `;
        });

        employeeListTable.innerHTML = tableHTML || `<tr><td colspan="4" class="text-center py-4 text-gray-500">ยังไม่มีข้อมูลพนักงาน</td></tr>`;
        
    } catch (error) {
        console.error('Error loading employees:', error);
        showNotification('ข้อผิดพลาดในการโหลดข้อมูลพนักงาน', 'error');
    }
}

document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('newEmpId').value.trim();
    const name = document.getElementById('newEmpName').value.trim();
    const phone = document.getElementById('newEmpPhone').value.trim();

    if (!id || !name || !phone) return showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');

    try {
        const docRef = db.collection('employees').doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
            return showNotification(`ไม่สามารถเพิ่มพนักงานได้: รหัสพนักงาน ${id} มีอยู่แล้ว`, 'error');
        }

        await docRef.set({ id, name, phone });
        
        document.getElementById('addEmployeeForm').reset();
        await loadEmployees(); 
        showNotification(`✅ เพิ่มพนักงาน ${name} (ID: ${id}) เรียบร้อย`, 'success');

    } catch (error) {
        console.error('Error adding employee:', error);
        showNotification('ข้อผิดพลาดในการเพิ่มพนักงาน', 'error');
    }
});

employeeListTable.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    
    if (e.target.classList.contains('delete-btn')) {
        // 🔴 ใช้ Custom Modal สำหรับยืนยันการลบ
        const message = `คุณต้องการยืนยันการลบพนักงาน ID: ${id} นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`;

        showCustomConfirm(message, async (confirmed) => {
            if (!confirmed) {
                showNotification('การดำเนินการถูกยกเลิก', 'info');
                return;
            }

            try {
                await db.collection('employees').doc(id).delete();
                await loadEmployees();
                showNotification(`🗑️ ลบพนักงาน ID: ${id} เรียบร้อย`, 'success');
            } catch (error) {
                console.error('Error deleting employee:', error);
                showNotification('ข้อผิดพลาดในการลบพนักงาน', 'error');
            }
        });

    } 
    
    else if (e.target.classList.contains('edit-btn')) {
        const emp = employeeData.find(e => e.id === id);
        if (!emp) return;

        // ใช้ prompt() สำหรับการรับข้อมูลใหม่ (ไม่ใช่การยืนยัน)
        const newName = prompt(`แก้ไขชื่อพนักงาน ID ${id}:`, emp.name);
        if (newName === null) return showNotification('ยกเลิกการแก้ไข', 'info'); 
        
        const newPhone = prompt(`แก้ไขเบอร์โทรศัพท์ ID ${id}:`, emp.phone);
        if (newPhone === null) return showNotification('ยกเลิกการแก้ไข', 'info'); 

        if (newName.trim() === '' || newPhone.trim() === '') {
            return showNotification('ชื่อหรือเบอร์โทรศัพท์ไม่ถูกต้อง', 'error');
        }

        try {
            await db.collection('employees').doc(id).update({ name: newName.trim(), phone: newPhone.trim() });
            await loadEmployees();
            showNotification(`✏️ แก้ไขข้อมูลพนักงาน ID: ${id} เรียบร้อย`, 'success');
        } catch (error) {
            console.error('Error editing employee:', error);
            showNotification('ข้อผิดพลาดในการแก้ไขพนักงาน', 'error');
        }
    }
});

document.getElementById('manageEmployeesBtn').addEventListener('click', () => {
    loadEmployees(); 
    manageEmployeesModal.classList.remove('hidden');
});

document.getElementById('closeManageEmployeesModal').addEventListener('click', () => {
    manageEmployeesModal.classList.add('hidden');
});

document.getElementById('downloadExcel').addEventListener('click', () => {
    if (withdrawalData.length === 0) {
        showNotification('ไม่มีข้อมูลสำหรับดาวน์โหลด', 'info');
        return;
    }
    
    const excelData = withdrawalData.map(withdrawal => ({
        'รหัสพนักงาน': withdrawal.employeeId,
        'ชื่อพนักงาน': withdrawal.employeeName,
        'จำนวนเงิน': withdrawal.amount,
        'วันที่เบิก (รอบ)': withdrawal.withdrawalDate || 'ไม่ระบุ',
        'เวลายื่นคำขอ': withdrawal.displayDate || 'ไม่ระบุ'
    }));
    
    // Check for XLSX library existence (must be included in HTML)
    if (typeof XLSX === 'undefined') {
        showNotification('❌ ไม่พบไลบรารี XLSX (SheetJS)', 'error');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลการเบิกเงิน');
    
    const fileName = `ข้อมูลการเบิกเงิน_${new Date().toLocaleDateString('th-TH').replace(/[/]/g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showNotification('📊 เริ่มการดาวน์โหลดไฟล์ Excel', 'info');
});


// --- Event Listeners Setup ---

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('adminLogout').addEventListener('click', logout);

if (document.getElementById('refreshAdminData')) {
    document.getElementById('refreshAdminData').addEventListener('click', refreshAdminData);
}


// --- Initialize App ---
initializeFirebase();