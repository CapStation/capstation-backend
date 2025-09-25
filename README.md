# CapStation-Backend

## 📌 Deskripsi Aplikasi
CapStation adalah aplikasi sistem manajemen dokumen capstone untuk mahasiswa Departemen Teknik Elektro dan Teknologi Informasi (DTETI) Universitas Gadjah Mada. Aolikasi ini memungkinkan mahasiswa dan dosen untuk mengelola proyek capstone secara terintegrasi. CapStation memfasilitasi stakeholder untuk:
- Melakukan login dan registrasi ke aplikasi CapStation. 
- Mengelola dokumen capstone seperti mengunggah, menghapus, dan ...
- Melihat dashboard informasi untuk memantau pengumuman dan aktivitas capstone.
- 

## ✨ Nama Kelompok dan Daftar Anggota
### Kelompok 7 
- Fahmi Irfan Faiz (23/520563/TK/57396)
- Nevrita Natasya Putriana (23/514635/TK/56500)
- Benjamin Sigit (23/514737/TK/56513)
- Moses Saidasdo (23/523274/TK/57854)
- Hayunitya Edadwi Pratita (23/518670/TK/57134)

## 📂 Struktur Folder
capstation-backend/  
├── src/  
│   ├── configs/  
│   │   ├── db.js  
│   │   ├── passport.js  
│   │   └── themes.js  
│   │  
│   ├── controllers/  
│   │   ├── DocumentController.js  
│   │   ├── ProjectController.js  
│   │   ├── announcementController.js  
│   │   ├── authController.js  
│   │   ├── capstoneController.js  
│   │   ├── dashboardController.js  
│   │   ├── groupController.js  
│   │   └── oauthController.js  
│   │  
│   ├── middlewares/  
│   │   ├── authMiddleware.js  
│   │   ├── authValidator.js  
│   │   ├── documentValidation.js  
│   │   ├── fileValidation.js  
│   │   ├── roleMiddleware.js  
│   │   └── upload.js  
│   │  
│   ├── models/  
│   │   ├── Document.js  
│   │   ├── Project.js  
│   │   ├── announcementModel.js  
│   │   ├── capstoneModel.js  
│   │   ├── groupModel.js  
│   │   ├── projectModel.js  
│   │   └── userModel.js  
│   │  
│   ├── routes/  
│   │   ├── adminRoutes.js  
│   │   ├── announcementRoutes.js  
│   │   ├── auth.js  
│   │   ├── authRoutes.js  
│   │   ├── capstoneRoutes.js  
│   │   ├── dashboardRoutes.js  
│   │   ├── document.js  
│   │   ├── groupRoutes.js    
│   │   ├── oauthRoutes.js  
│   │   ├── projectRoutes.js  
│   │   └── projects.js  
│   │  
│   ├── services/  
│   │   ├── Base64FileService.js  
│   │   ├── DocumentService.js  
│   │   ├── GridFSService.js  
│   │   ├── ProjectService.js  
│   │   └── mailService.js  
│   │  
│   ├── utils/  
│   │   ├── FileValidationManager.js  
│   │   └── responseFormatter.js  
│   │  
│   ├── app.js  
│   └── server.js  
│  
├── .gitignore  
├── LICENSE  
├── package-lock.json  
└── package.json    

## 💡 Fitur Aplikasi

## ⚙️ Teknologi yang Digunakan
Dalam pengembangan CapStation, teknologi utama yang digunakan meliputi:
- Backend:
  - Node.js dengan Express.js sebagai framework utama.
  - Mongoose untuk Object Data Modeling (ODM) MongoDB.
- Database:
  - MongoDB untuk penyimpanan data. 
- Deployment dan Version Control:
  - Git/GitHub untuk kolaborasi dan kontrol.
  - File .gitignore untuk manajemen file sensitif

## 🔗 URL Gdrive Laporan

## ⚒️ Instalasi

## 🔑 Environment Variables

## 📡 API Endpoints
