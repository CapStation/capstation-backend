# CapStation-Backend

## 📌 Deskripsi Aplikasi
CapStation adalah sebuah web application yang dirancang untuk mendukung manajemen capstone bagi mahasiswa Departemen Teknik Elektro dan Teknologi Informasi (DTETI) Universitas Gadjah Mada. Aplikasi ini dikembangkan untuk mengintegrasikan seluruh proses capstone, mulai dari pengajuan, pembentukan kelompok, bimbingan, hingga dokumentasi akhir.

CapStation hadir sebagai solusi atas permasalahan umum dalam pengelolaan capstone, seperti kesulitan melanjutkan proyek dari periode sebelumnya, kurangnya dokumentasi terstruktur, serta keterbatasan komunikasi antar stakeholder. Dengan CapStation, mahasiswa, dosen pembimbing, dan pihak departemen dapat berkolaborasi secara lebih efisien, transparan, dan berkelanjutan.

Fitur utama meliputi manajemen proyek, manajemen kelompok, manajemen pengumuman, dokumentasi digital, serta autentikasi dan otorisasi modern (verifikasi email, reset password, login Google OAuth2, dan RBAC). Melalui fitur-fitur ini, CapStation memungkinkan pengajuan proyek baru, pelanjutan proyek terdahulu, pemantauan status, serta penyebaran informasi yang lebih efektif. Dengan demikian, CapStation tidak hanya mempermudah mahasiswa dalam melaksanakan capstone, tetapi juga membantu dosen dan pihak departemen dalam pembimbingan, monitoring, serta pengambilan keputusan, sehingga keseluruhan proses capstone menjadi lebih terstruktur, terdokumentasi, dan berkelanjutan.

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
    │   │   ├── announcementController.js
    │   │   ├── authController.js
    │   │   ├── capstoneBrowseController.js
    │   │   ├── capstoneController.js
    │   │   ├── competencyController.js
    │   │   ├── dashboardController.js
    │   │   ├── DocumentController.js
    │   │   ├── groupController.js
    │   │   ├── oauthController.js
    │   │   ├── ProjectController.js
    │   │   ├── requestDecisionController.js
    │   │   └── userController.js
    │   │
    │   ├── middlewares/
    │   │   ├── authMiddleware.js
    │   │   ├── authValidator.js
    │   │   ├── capstoneValidator.js
    │   │   ├── documentAuth.js
    │   │   ├── documentValidation.js
    │   │   ├── fileValidation.js
    │   │   ├── roleMiddleware.js
    │   │   └── upload.js
    │   │
    │   ├── models/
    │   │   ├── announcementModel.js
    │   │   ├── competencyModel.js
    │   │   ├── Document.js
    │   │   ├── groupModel.js
    │   │   ├── myRequestModel.js
    │   │   ├── Project.js
    │   │   └── userModel.js
    │   │
    │   ├── routes/
    │   │   ├── adminRoutes.js
    │   │   ├── announcementRoutes.js
    │   │   ├── auth.js
    │   │   ├── authRoutes.js
    │   │   ├── capstoneBrowseRoutes.js
    │   │   ├── capstoneRoutes.js
    │   │   ├── competencyRoutes.js
    │   │   ├── dashboardRoutes.js
    │   │   ├── documents.js
    │   │   ├── groupRoutes.js
    │   │   ├── index.js
    │   │   ├── oauthRoutes.js
    │   │   ├── projects.js
    │   │   ├── requestDecisionRoutes.js
    │   │   └── userRoutes.js
    │   │   └── Seeder/
    │   │
    │   ├── services/
    │   │   ├── Base64FileService.js
    │   │   ├── DocumentService.js
    │   │   ├── GridFSService.js
    │   │   ├── mailService.js
    │   │   └── ProjectService.js
    │   │
    │   └── utils/
    │       ├── FileValidationManager.js
    │       └── responseFormatter.js
    │
    ├── app.js
    ├── server.js
    ├── .env
    ├── .gitignore
    ├── LICENSE
    ├── package.json
    ├── package-lock.json
    ├── README.md
    └── Documentation Ben.md    

## 💡 Fitur Aplikasi
- Autentikasi & Autorisasi
  - Register akun baru dengan verifikasi email.
  - Login via email/password atau Google OAuth2.
  - Reset password melalui email.
  - Mendukung RBAC (Role-Based Access Control) untuk membatasi hak akses (Admin, Dosen, Mahasiswa).
- Dashboard Informasi
  - Ringkasan jumlah proyek capstone (total, per kategori, per status).
  - Statistik kelompok per kategori.
  - Aktivitas proyek terbaru.
  - Daftar pengumuman terbaru dari dosen/admin.
- Manajemen Pengumuman
  - Admin & dosen dapat membuat, mengedit, dan menghapus pengumuman.
  - Mahasiswa hanya dapat melihat daftar pengumuman.
- Manajemen Proyek Capstone
  - Mahasiswa dapat membuat, memperbarui, dan menghapus data proyek.
  - Dosen dapat memantau dan membimbing proyek.
  - Admin dapat mengelola seluruh data proyek.
- Manajemen Dokumen
  - Unggah dokumen capstone (proposal, laporan, dll).
  - Validasi format dan ukuran dokumen.
  - Penyimpanan file menggunakan GridFS.
  - Dosen & admin dapat mengakses dokumen untuk bimbingan/verifikasi.
- Manajemen Kelompok
  - Mahasiswa dapat membuat kelompok baru.
  - Admin dapat meninjau dan mengelola data kelompok.
  - Dosen dapat ditugaskan sebagai pembimbing kelompok.
- Notifikasi Email
  - Email verifikasi akun.
  - Reset password.
  - Notifikasi pengumuman penting.

## ⚙️ Teknologi yang Digunakan
Dalam pengembangan CapStation, teknologi utama yang digunakan meliputi:
- Backend:
  - Node.js dengan Express.js sebagai framework utama.
  - Mongoose untuk Object Data Modeling (ODM) MongoDB.
- Database:
  - MongoDB untuk penyimpanan data.
- Autentikasi dan Autorisasi:
  - Passport.js sebagai middleware autentikasi
  - JWT (JSON Web Token) untuk autorisasi dan manajemen sesi
  - Google OAuth2 untuk autentikasi menggunakan akun Google
- File Storage: GridFS sebagai penyimpanan file/dokumen proyek yang besar
- Email Service: Nodemailer (SMTP Gmail) untuk verifikasi akun saat registrasi dan reset password pengguna
- Deployment dan Version Control:
  - Git/GitHub untuk kolaborasi dan kontrol.
  - File .gitignore untuk manajemen file sensitif

## 🔗 URL Gdrive Laporan


## ⚒️ Instalasi
1. Clone repository   
   ```
   git clone https://github.com/CapStation/capstation-backend.git 
   cd capstation-backend
   ```
2. Install dependencies   
   ```npm install```

3. Buat file .env di root project (lihat bagian Environment Variables).

4. Jalankan server  
   ```npm run dev```

## 🔑 Environment Variables
```
# Server
PORT=5000

# Database
MONGODB_URI=mongodb+srv://<usn>:<pw>@capstation-cluster.qwzlcsx.mongodb.net/?retryWrites=true&w=majority&appName=capstation-cluster

# JWT
JWT_SECRET=your_jwt_secret

# OAuth2 (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 📡 API Endpoints
### POST
- /api/auth/register :	Register user baru
- /api/auth/login	: Login akun user
- /api/auth/forgot-password : Kirim email untuk reset password
- /api/auth/reset-password : Reset password menggunakan token dari email reset
- /api/announcements : Admin/Dosen membuat pengumuman
- /api/projects	: Menambahkan data capstone project

### GET
- /api/auth/verify?token=<token> : Verifikasi email user
- /api/auth/google : Redirect ke Google OAuth 2.0 login page untuk login
- /api/announcements : Semua role bisa melihat seluruh daftar pengumuman
- /api/dashboard : Melihat dashboard informasi
- /api/groups : Melihat detail grup Capstone
- /api/projects : Melihat data capstone project

### PUT
- /api/announcements/<id_announcement> : Admin/Dosen mengedit pengumuman
- /api/projects : Mengubah data capstone project

### DELETE
- /api/announcements/<id_announcement> : Admin/Dosen menghapus pengumuman sesuai ID
- /api/projects : Menghapus data capstone project

