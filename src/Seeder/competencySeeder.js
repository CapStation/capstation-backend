require('dotenv').config();
const mongoose = require('mongoose');
const Competency = require('../models/competencyModel');
const User = require('../models/userModel');

const initialCompetencies = [
  // Programming Languages
  { name: 'JavaScript', category: 'Programming Languages', description: 'Bahasa pemrograman untuk web development' },
  { name: 'Python', category: 'Programming Languages', description: 'Bahasa pemrograman serbaguna untuk berbagai aplikasi' },
  { name: 'Java', category: 'Programming Languages', description: 'Bahasa pemrograman berorientasi objek' },
  { name: 'TypeScript', category: 'Programming Languages', description: 'JavaScript dengan static typing' },
  { name: 'PHP', category: 'Programming Languages', description: 'Server-side scripting language' },
  { name: 'C++', category: 'Programming Languages', description: 'Bahasa pemrograman tingkat menengah' },
  { name: 'Go', category: 'Programming Languages', description: 'Bahasa pemrograman modern dari Google' },

  // Web Development
  { name: 'React.js', category: 'Web Development', description: 'JavaScript library untuk membuat UI' },
  { name: 'Vue.js', category: 'Web Development', description: 'Progressive JavaScript framework' },
  { name: 'Angular', category: 'Web Development', description: 'TypeScript-based web application framework' },
  { name: 'Node.js', category: 'Web Development', description: 'JavaScript runtime untuk server-side' },
  { name: 'Express.js', category: 'Web Development', description: 'Web framework untuk Node.js' },
  { name: 'Next.js', category: 'Web Development', description: 'React framework dengan SSR' },
  { name: 'Laravel', category: 'Web Development', description: 'PHP web application framework' },
  { name: 'Django', category: 'Web Development', description: 'Python web framework' },

  // Mobile Development
  { name: 'React Native', category: 'Mobile Development', description: 'Framework untuk mobile app dengan React' },
  { name: 'Flutter', category: 'Mobile Development', description: 'Google UI toolkit untuk mobile, web, dan desktop' },
  { name: 'Swift', category: 'Mobile Development', description: 'Bahasa pemrograman untuk iOS development' },
  { name: 'Kotlin', category: 'Mobile Development', description: 'Bahasa modern untuk Android' },
  { name: 'Ionic', category: 'Mobile Development', description: 'Cross-platform mobile app development' },

  // Database
  { name: 'MySQL', category: 'Database', description: 'Relational database management system' },
  { name: 'PostgreSQL', category: 'Database', description: 'Advanced open source relational database' },
  { name: 'MongoDB', category: 'Database', description: 'NoSQL document database' },
  { name: 'Redis', category: 'Database', description: 'In-memory data structure store' },

  // Data Science
  { name: 'Machine Learning', category: 'Data Science', description: 'Algoritma pembelajaran mesin' },
  { name: 'Data Analytics', category: 'Data Science', description: 'Analisis dan interpretasi data' },
  { name: 'TensorFlow', category: 'Data Science', description: 'Machine learning framework' },
  { name: 'Pandas', category: 'Data Science', description: 'Python library untuk manipulasi data' },
  { name: 'Tableau', category: 'Data Science', description: 'Data visualization platform' },

  // UI/UX
  { name: 'UI Design', category: 'UI/UX Design', description: 'User Interface Design' },
  { name: 'UX Research', category: 'UI/UX Design', description: 'User Experience Research' },
  { name: 'Figma', category: 'UI/UX Design', description: 'Collaborative interface design tool' },
  { name: 'Adobe XD', category: 'UI/UX Design', description: 'Vector-based UX design tool' },
  { name: 'Prototyping', category: 'UI/UX Design', description: 'Creating interactive prototypes' },

  // DevOps
  { name: 'Docker', category: 'DevOps', description: 'Containerization platform' },
  { name: 'Kubernetes', category: 'DevOps', description: 'Container orchestration system' },
  { name: 'CI/CD', category: 'DevOps', description: 'Continuous Integration/Continuous Deployment' },
  { name: 'Jenkins', category: 'DevOps', description: 'Automation server for CI/CD' },

  // Cloud
  { name: 'AWS', category: 'Cloud Computing', description: 'Amazon Web Services cloud platform' },
  { name: 'Google Cloud', category: 'Cloud Computing', description: 'Google Cloud Platform services' },
  { name: 'Microsoft Azure', category: 'Cloud Computing', description: 'Microsoft cloud computing platform' },

  // Soft Skills
  { name: 'Team Leadership', category: 'Soft Skills', description: 'Kemampuan memimpin tim' },
  { name: 'Communication', category: 'Soft Skills', description: 'Kemampuan komunikasi yang baik' },
  { name: 'Problem Solving', category: 'Soft Skills', description: 'Kemampuan memecahkan masalah' },
  { name: 'Critical Thinking', category: 'Soft Skills', description: 'Kemampuan berpikir kritis' },
];

async function runSeeder() {
  try {
    console.log("📦 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI_ATLAS);
    console.log("Connected to:", mongoose.connection.name);


    console.log("🔍 Looking for admin user...");
    const adminUser = await User.findOne({ role: 'admin' });

    const adminId = adminUser
      ? adminUser._id
      : new mongoose.Types.ObjectId(); // fallback if no admin

    console.log("🗑️ Clearing existing competencies...");
    await Competency.deleteMany({});

    console.log("🌱 Seeding new competencies...");

    for (const comp of initialCompetencies) {
      try {
        await Competency.create({
          ...comp,
          createdBy: adminId
        });
        console.log("✅ Added:", comp.name);
      } catch (err) {
        if (err.code === 11000) {
          console.log("⏭️ Skipped duplicate:", comp.name);
        } else {
          throw err;
        }
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

// Run if executed directly
if (require.main === module) {
  runSeeder();
}

module.exports = runSeeder;
