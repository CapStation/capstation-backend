# 🚀 Panduan Deployment Vercel - CapStation Backend

## 📋 Penjelasan Arsitektur Deployment

### **Kenapa Perlu `api/index.js`?**

CapStation backend menggunakan **2 mode operasi berbeda**:

#### 1️⃣ **Local Development** (`src/server.js`)

```javascript
// Traditional Express server dengan app.listen()
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- Server berjalan terus-menerus (long-running)
- Cocok untuk development lokal
- Menggunakan: `npm run dev` atau `npm start`

#### 2️⃣ **Vercel Production** (`api/index.js`)

```javascript
// Serverless function handler
module.exports = app;
```

- Setiap request = function invocation baru
- Tidak ada `app.listen()` - Vercel yang handle
- Auto-scaling dan pay-per-use
- **WAJIB** untuk Vercel deployment

### **Perbedaan Fundamental:**

| Aspek       | Traditional Server   | Vercel Serverless          |
| ----------- | -------------------- | -------------------------- |
| Entry Point | `src/server.js`      | `api/index.js`             |
| Execution   | Long-running process | Function per request       |
| Scaling     | Manual (VPS/EC2)     | Automatic                  |
| Cost        | Fixed monthly        | Pay per invocation         |
| Cold Start  | Tidak ada            | Ada (~500ms first request) |

---

## ✅ File-file yang Dibuat

### 1. **`api/index.js`** - Serverless Entry Point

```javascript
const app = require("../src/app");
module.exports = app;
```

**Fungsi**: Handler untuk setiap HTTP request di Vercel

### 2. **`vercel.json`** - Deployment Configuration

```json
{
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.js" }]
}
```

**Fungsi**: Memberitahu Vercel cara build & route aplikasi

### 3. **`.vercelignore`** - Upload Optimization

**Fungsi**: Exclude file yang tidak perlu di-upload (menghemat bandwidth & waktu deploy)

---

## 🔧 Setup Environment Variables di Vercel

### **Via Vercel Dashboard:**

1. Buka project di [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project **CapStation Backend**
3. Masuk ke **Settings** → **Environment Variables**
4. Tambahkan satu per satu:

```bash
# Database
MONGO_URI = mongodb+srv://user:pass@cluster.mongodb.net/...

# JWT Secret
JWT_SECRET = your_super_secret_jwt_key_min_32_characters

# Google OAuth
GOOGLE_CLIENT_ID = 1083258498720-xxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-xxxxxxxx
GOOGLE_CALLBACK_URL = https://your-app.vercel.app/api/auth/google/callback

# Email SMTP
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-password

# Frontend URL (untuk CORS)
FRONTEND_URL = https://your-frontend.vercel.app

# Node Environment
NODE_ENV = production
```

### **Via Vercel CLI (Alternatif):**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Set environment variables
vercel env add MONGO_URI
vercel env add JWT_SECRET
# ... dst untuk semua variable
```

---

## 🚀 Cara Deploy

### **Method 1: Git-based Deployment (Recommended)**

1. **Push ke GitHub:**

   ```bash
   git add .
   git commit -m "feat: add Vercel serverless configuration"
   git push origin main
   ```

2. **Connect ke Vercel:**

   - Login ke [Vercel](https://vercel.com)
   - Click **"New Project"**
   - Import dari GitHub: `CapStation/capstation-backend`
   - Vercel otomatis detect `vercel.json`

3. **Configure & Deploy:**

   - Root Directory: `./` (default)
   - Build Command: (leave empty - tidak perlu build)
   - Output Directory: (leave empty)
   - Install Command: `npm install`
   - Click **"Deploy"**

4. **Setiap push ke `main` = auto-deploy** 🎉

### **Method 2: Vercel CLI (Manual)**

```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Login
vercel login

# Deploy (first time - follow prompts)
vercel

# Deploy to production
vercel --prod
```

---

## 🔍 Verifikasi Deployment

### **1. Cek Health Endpoint:**

```bash
curl https://your-app.vercel.app/health
```

**Expected Response:**

```json
{
  "ok": true,
  "time": "2025-01-15T10:30:00.000Z"
}
```

### **2. Test API Endpoint:**

```bash
curl https://your-app.vercel.app/api/health
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Capstone API is running",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### **3. Test Authentication:**

```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.com","password":"test123"}'
```

---

## ⚠️ Troubleshooting

### **Error 404 pada `/api/...`**

**Penyebab:** `api/index.js` tidak ada atau `vercel.json` salah
**Solusi:**

```bash
# Pastikan file ada
ls api/index.js

# Cek vercel.json
cat vercel.json | grep "api/index.js"
```

### **Error 500 - Database Connection Failed**

**Penyebab:** MongoDB URI tidak di-set di Vercel
**Solusi:**

1. Buka Vercel Dashboard → Settings → Environment Variables
2. Tambahkan `MONGO_URI` dengan nilai yang benar
3. Redeploy: `vercel --prod`

### **Error: Google OAuth Redirect Mismatch**

**Penyebab:** `GOOGLE_CALLBACK_URL` masih localhost
**Solusi:**

1. Update di Google Cloud Console:
   - Authorized redirect URIs: `https://your-app.vercel.app/api/auth/google/callback`
2. Update environment variable di Vercel:
   ```
   GOOGLE_CALLBACK_URL = https://your-app.vercel.app/api/auth/google/callback
   ```

### **Cold Start Lambat (>5 detik)**

**Penyebab:** First request setelah idle
**Solusi:**

- Gunakan Vercel Pro untuk faster cold starts
- Implementasi warming strategy (ping setiap 5 menit)
- Optimize dependencies di `package.json`

### **File Upload Error**

**Penyebab:** Vercel serverless functions punya limit 4.5MB body size
**Solusi:**

- Gunakan external storage (AWS S3, Cloudinary, dll) untuk file besar
- MongoDB GridFS tetap bisa digunakan, tapi perlu streaming approach

---

## 📊 Monitoring

### **Vercel Analytics:**

- Dashboard otomatis track: requests, errors, latency
- Lihat di: Vercel Dashboard → Analytics

### **Custom Logging:**

Tambahkan di `src/app.js`:

```javascript
// Production logging
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}
```

---

## 🎯 Checklist Pre-Deployment

- [ ] ✅ File `api/index.js` dibuat
- [ ] ✅ File `vercel.json` dikonfigurasi dengan benar
- [ ] ✅ File `.vercelignore` dibuat
- [ ] ✅ Semua environment variables di-set di Vercel Dashboard
- [ ] ✅ Google OAuth callback URL diupdate
- [ ] ✅ MongoDB whitelist IP Vercel (0.0.0.0/0 untuk allow all)
- [ ] ✅ SMTP credentials valid
- [ ] ✅ Frontend URL di-set untuk CORS
- [ ] ✅ Git push ke repository

---

## 📚 Resources

- [Vercel Node.js Documentation](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Express on Vercel Guide](https://vercel.com/guides/using-express-with-vercel)

---

## 🎉 Selamat!

Jika semua langkah diikuti dengan benar, backend CapStation Anda sudah **production-ready** di Vercel! 🚀

**Production URL:** `https://capstation-backend.vercel.app`

---

**Dibuat oleh:** Kelompok 7 - CapStation Team  
**Tanggal:** 11 November 2025
