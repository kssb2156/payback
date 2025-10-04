// Firebase Configuration (***กรุณาเปลี่ยนเป็นของที่คุณใช้จริง***)
const firebaseConfig = {
    apiKey: "AIzaSyCi2dw_qpuyj-hkwNc-meqX8wamKN0MrWE", 
    authDomain: "file-management-system-5eadd.firebaseapp.com",
    projectId: "file-management-system-5eadd",
    storageBucket: "file-management-system-5eadd.firebasestorage.app",
    messagingSenderId: "905827184615",
    appId: "1:905827184615:web:a5d290c78ffc51a85b5742"
};


------------------------------------------
// Firestore Database/Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตให้ผู้ที่ล็อกอินแล้วเท่านั้น
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

------------------------------------------
// Firestore Database/Data
# Start a collection ในส่วนจัดการ Id พนักงาน
- employees
Document ID 
- 001
Field
- ID
- string
- 001
Name
- string
- ชื่อพนักงาน
phone
- string
เบอร์โทร
# Start a collection ตั้งค่าระบบ วันที่รอบเบิกเงิน
- system
Document ID
- settings
Field
- currentWithdrawalDate
- string
- 08/01/2568 (ตัวอย่าง)
enabled
- boolean
- true 
lastModified
-timestamp
lastUpdated
- timestamp

# Start a collection วันที่เบิกเงินพนักงาน เลือกแค่ withdrawals ระบบจะรันให้เอง
withdrawals

