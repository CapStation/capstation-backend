require('dotenv').config();
const mongoose = require('mongoose');
const Competency = require('../models/competencyModel');
const User = require('../models/userModel');

// ===========================
// FIXED COMPETENCY SEEDER
// ===========================

const initialCompetencies = [
  // =========================
  // 1. Software Development
  // =========================
  { category: 'Software Development', name: 'Backend Development', description: 'Pengembangan sisi server untuk aplikasi' },
  { category: 'Software Development', name: 'Frontend Development', description: 'Pengembangan antarmuka pengguna' },
  { category: 'Software Development', name: 'API Engineering', description: 'Perancangan dan implementasi REST/GraphQL API' },
  { category: 'Software Development', name: 'Software Architecture', description: 'Perancangan struktur aplikasi' },

  // =========================
  // 2. Web & Mobile Application
  // =========================
  { category: 'Web & Mobile Application', name: 'Fullstack Web Development', description: 'Pengembangan web end-to-end' },
  { category: 'Web & Mobile Application', name: 'SSR Web App', description: 'Server-side rendering web app' },
  { category: 'Web & Mobile Application', name: 'Mobile App Development', description: 'Pengembangan aplikasi mobile multiplatform' },

  // =========================
  // 3. Embedded Systems
  // =========================
  { category: 'Embedded Systems', name: 'Microcontroller Programming', description: 'Pemrograman MCU seperti Arduino/STM32' },
  { category: 'Embedded Systems', name: 'Firmware Development', description: 'Pengembangan firmware perangkat keras' },

  // =========================
  // 4. IoT
  // =========================
  { category: 'IoT (Internet of Things)', name: 'Sensor & Actuator Integration', description: 'Integrasi sensor dalam sistem IoT' },
  { category: 'IoT (Internet of Things)', name: 'MQTT Communication', description: 'Protokol lightweight untuk IoT' },
  { category: 'IoT (Internet of Things)', name: 'IoT Cloud Integration', description: 'Integrasi IoT dengan platform cloud' },

  // =========================
  // 5. Robotics & Automation
  // =========================
  { category: 'Robotics & Automation', name: 'Robot Motion Control', description: 'Pengendalian motor dan aktuator robot' },
  { category: 'Robotics & Automation', name: 'Path Planning', description: 'Perencanaan jalur robot otonom' },

  // =========================
  // 6. Signal Processing
  // =========================
  { category: 'Signal Processing', name: 'Digital Signal Processing', description: 'Pemrosesan sinyal digital' },

  // =========================
  // 7. Computer Vision
  // =========================
  { category: 'Computer Vision', name: 'Object Detection', description: 'Deteksi objek menggunakan citra' },
  { category: 'Computer Vision', name: 'Image Classification', description: 'Klasifikasi citra otomatis' },

  // =========================
  // 8. Machine Learning / AI
  // =========================
  { category: 'Machine Learning / AI', name: 'Machine Learning Model', description: 'Pengembangan model ML' },
  { category: 'Machine Learning / AI', name: 'Deep Learning', description: 'Model neural network' },
  { category: 'Machine Learning / AI', name: 'Predictive Analytics', description: 'Analisis prediktif berbasis data' },

  // =========================
  // 9. Biomedical Devices
  // =========================
  { category: 'Biomedical Devices', name: 'Biomedical Sensor Integration', description: 'Integrasi sensor fisiologis' },
  { category: 'Biomedical Devices', name: 'Medical Device Prototyping', description: 'Prototyping alat kesehatan' },

  // =========================
  // 10. Health Informatics
  // =========================
  { category: 'Health Informatics', name: 'Medical Data Processing', description: 'Pengolahan dan analisis data medis' },
  { category: 'Health Informatics', name: 'Electronic Health Record System', description: 'Pembangunan sistem rekam medis elektronik' },

  // =========================
  // 11. Networking & Security
  // =========================
  { category: 'Networking & Security', name: 'Network Configuration', description: 'Konfigurasi infrastruktur jaringan' },
  { category: 'Networking & Security', name: 'Cybersecurity Essentials', description: 'Dasar-dasar keamanan siber' },

  // =========================
  // 12. Cloud & DevOps
  // =========================
  { category: 'Cloud & DevOps', name: 'Docker Containerization', description: 'Deployment menggunakan container' },
  { category: 'Cloud & DevOps', name: 'CI/CD Automation', description: 'Otomasi build dan deployment' },

  // =========================
  // 13. Data Engineering & Analytics
  // =========================
  { category: 'Data Engineering & Analytics', name: 'Data Pipeline Development', description: 'Pengembangan pipeline data' },
  { category: 'Data Engineering & Analytics', name: 'Data Visualization', description: 'Penyajian data dalam bentuk visual' },

  // =========================
  // 14. Human-Computer Interaction
  // =========================
  { category: 'Human-Computer Interaction', name: 'UI/UX Design', description: 'Desain interaksi dan antarmuka pengguna' },

  // =========================
  // 15. Control Systems
  // =========================
  { category: 'Control Systems', name: 'PID Control', description: 'Pengendalian sistem dinamis' },

  // =========================
  // 16. Energy & Power Systems
  // =========================
  { category: 'Energy & Power Systems', name: 'Renewable Energy Integration', description: 'Integrasi energi terbarukan' },

  // =========================
  // 17. Research & Simulation
  // =========================
  { category: 'Research & Simulation', name: 'MATLAB Simulation', description: 'Simulasi menggunakan MATLAB/Simulink' },
];

async function runSeeder() {
  try {
    console.log("📦 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI_ATLAS);
    console.log("Connected to:", mongoose.connection.name);

    console.log("🔍 Looking for admin user...");
    const adminUser = await User.findOne({ role: 'admin' });
    const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    console.log("🗑️ Clearing existing competencies...");
    await Competency.deleteMany({});

    console.log("🌱 Seeding new competencies (insertMany)...");
    const docs = initialCompetencies.map(c => ({ ...c, createdBy: adminId }));
    try {
      // Use ordered:false so insertion continues past duplicates
      const res = await Competency.insertMany(docs, { ordered: false });
      console.log(`✅ Inserted ${res.length} competencies`);
    } catch (err) {
      // insertMany with ordered:false will throw if some inserts failed (e.g., duplicates)
      if (err && err.writeErrors) {
        console.log(`⚠️ Some inserts failed: ${err.writeErrors.length} errors`);
        err.writeErrors.forEach(e => console.log(` - ${e.errmsg || e.err}`));
      } else {
        throw err;
      }
    }

    console.log("🎉 Seeding completed!");
  } catch (err) {
    console.error("❌ Seeder failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed");
  }
}

if (require.main === module) {
  runSeeder();
}

module.exports = runSeeder;
