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
# 💸 ระบบเบิกเงินพนักงาน (Frontend)

## หน้าสำหรับพนักงาน (Employee View)

หน้าตาที่พนักงานใช้ในการยื่นคำขอเบิกเงิน:
![หน้าจอการเบิกเงินของพนักงาน (มีวันที่รอบเบิกเงิน)](./assets/image_0affcb.png)

## หน้าจอผู้ดูแล (Admin View)

หน้าจอจัดการข้อมูลพนักงาน (สามารถเพิ่มและลบได้):
![หน้าจอจัดการข้อมูลพนักงานใน Modal](./assets/image_0b780d.png)
