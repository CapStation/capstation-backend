const mongoose = require('mongoose');
const Competency = require('../models/competencyModel');
const User = require('../models/userModel');

// Data kompetensi awal
const initialCompetencies = [
  // Programming Languages
  {
    name: 'JavaScript',
    category: 'Programming Languages',
    description: 'Bahasa pemrograman untuk web development'
  },
  {
    name: 'Python',
    category: 'Programming Languages', 
    description: 'Bahasa pemrograman serbaguna untuk berbagai aplikasi'
  },
  {
    name: 'Java',
    category: 'Programming Languages',
    description: 'Bahasa pemrograman berorientasi objek'
  },
  {
    name: 'TypeScript',
    category: 'Programming Languages',
    description: 'JavaScript dengan static typing'
  },
  {
    name: 'PHP',
    category: 'Programming Languages',
    description: 'Server-side scripting language'
  },
  {
    name: 'C++',
    category: 'Programming Languages',
    description: 'Bahasa pemrograman tingkat menengah'
  },
  {
    name: 'Go',
    category: 'Programming Languages',
    description: 'Bahasa pemrograman modern dari Google'
  },

  // Web Development
  {
    name: 'React.js',
    category: 'Web Development',
    description: 'JavaScript library untuk membuat UI'
  },
  {
    name: 'Vue.js',
    category: 'Web Development',
    description: 'Progressive JavaScript framework'
  },
  {
    name: 'Angular',
    category: 'Web Development',
    description: 'TypeScript-based web application framework'
  },
  {
    name: 'Node.js',
    category: 'Web Development',
    description: 'JavaScript runtime untuk server-side'
  },
  {
    name: 'Express.js',
    category: 'Web Development',
    description: 'Web framework untuk Node.js'
  },
  {
    name: 'Next.js',
    category: 'Web Development',
    description: 'React framework dengan SSR'
  },
  {
    name: 'Laravel',
    category: 'Web Development',
    description: 'PHP web application framework'
  },
  {
    name: 'Django',
    category: 'Web Development',
    description: 'Python web framework'
  },

  // Mobile Development
  {
    name: 'React Native',
    category: 'Mobile Development',
    description: 'Framework untuk mobile app dengan React'
  },
  {
    name: 'Flutter',
    category: 'Mobile Development',
    description: 'Google UI toolkit untuk mobile, web, dan desktop'
  },
  {
    name: 'Swift',
    category: 'Mobile Development',
    description: 'Bahasa pemrograman untuk iOS development'
  },
  {
    name: 'Kotlin',
    category: 'Mobile Development',
    description: 'Modern programming language untuk Android'
  },
  {
    name: 'Ionic',
    category: 'Mobile Development',
    description: 'Cross-platform mobile app development'
  },

  // Database
  {
    name: 'MySQL',
    category: 'Database',
    description: 'Relational database management system'
  },
  {
    name: 'PostgreSQL',
    category: 'Database',
    description: 'Advanced open source relational database'
  },
  {
    name: 'MongoDB',
    category: 'Database',
    description: 'NoSQL document database'
  },
  {
    name: 'Redis',
    category: 'Database',
    description: 'In-memory data structure store'
  },

  // Data Science
  {
    name: 'Machine Learning',
    category: 'Data Science',
    description: 'Algoritma pembelajaran mesin'
  },
  {
    name: 'Data Analytics',
    category: 'Data Science',
    description: 'Analisis dan interpretasi data'
  },
  {
    name: 'TensorFlow',
    category: 'Data Science',
    description: 'Machine learning framework'
  },
  {
    name: 'Pandas',
    category: 'Data Science',
    description: 'Python library untuk manipulasi data'
  },
  {
    name: 'Tableau',
    category: 'Data Science',
    description: 'Data visualization platform'
  },

  // UI/UX Design
  {
    name: 'UI Design',
    category: 'UI/UX Design',
    description: 'User Interface Design'
  },
  {
    name: 'UX Research',
    category: 'UI/UX Design',
    description: 'User Experience Research'
  },
  {
    name: 'Figma',
    category: 'UI/UX Design',
    description: 'Collaborative interface design tool'
  },
  {
    name: 'Adobe XD',
    category: 'UI/UX Design',
    description: 'Vector-based user experience design tool'
  },
  {
    name: 'Prototyping',
    category: 'UI/UX Design',
    description: 'Creating interactive prototypes'
  },

  // DevOps
  {
    name: 'Docker',
    category: 'DevOps',
    description: 'Containerization platform'
  },
  {
    name: 'Kubernetes',
    category: 'DevOps',
    description: 'Container orchestration system'
  },
  {
    name: 'CI/CD',
    category: 'DevOps',
    description: 'Continuous Integration/Continuous Deployment'
  },
  {
    name: 'Jenkins',
    category: 'DevOps',
    description: 'Automation server for CI/CD'
  },

  // Cloud Computing
  {
    name: 'AWS',
    category: 'Cloud Computing',
    description: 'Amazon Web Services cloud platform'
  },
  {
    name: 'Google Cloud',
    category: 'Cloud Computing',
    description: 'Google Cloud Platform services'
  },
  {
    name: 'Microsoft Azure',
    category: 'Cloud Computing',
    description: 'Microsoft cloud computing platform'
  },

  // Soft Skills
  {
    name: 'Team Leadership',
    category: 'Soft Skills',
    description: 'Kemampuan memimpin tim'
  },
  {
    name: 'Communication',
    category: 'Soft Skills',
    description: 'Kemampuan komunikasi yang baik'
  },
  {
    name: 'Problem Solving',
    category: 'Soft Skills',
    description: 'Kemampuan memecahkan masalah'
  },
  {
    name: 'Critical Thinking',
    category: 'Soft Skills',
    description: 'Kemampuan berpikir kritis'
  }
];

// Fungsi untuk seed data kompetensi
exports.seedCompetencies = async (adminUserId = null) => {
  try {
    console.log('🌱 Starting competency seeding...');

    // Cari admin user untuk createdBy field
    let adminUser;
    if (adminUserId) {
      adminUser = await User.findById(adminUserId);
    } else {
      adminUser = await User.findOne({ role: 'admin' });
    }

    if (!adminUser) {
      console.log('⚠️  No admin user found. Creating competencies without createdBy...');
    }

    // Hapus semua kompetensi yang ada (optional, untuk development)
    // await Competency.deleteMany({});
    // console.log('🗑️  Existing competencies cleared');

    // Insert kompetensi baru
    const competencyPromises = initialCompetencies.map(async (compData) => {
      const existing = await Competency.findOne({ 
        name: { $regex: `^${compData.name}$`, $options: 'i' } 
      });

      if (!existing) {
        const competency = new Competency({
          ...compData,
          createdBy: adminUser ? adminUser._id : new mongoose.Types.ObjectId()
        });
        await competency.save();
        console.log(`✅ Added: ${compData.name}`);
        return competency;
      } else {
        console.log(`⏭️  Skipped (exists): ${compData.name}`);
        return existing;
      }
    });

    const results = await Promise.all(competencyPromises);
    const newCount = results.filter(Boolean).length;

    console.log(`🎉 Competency seeding completed! ${newCount} competencies processed`);
    return results;

  } catch (error) {
    console.error('❌ Error seeding competencies:', error);
    throw error;
  }
};

// Fungsi untuk menjalankan seeder secara standalone
exports.runSeeder = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('📦 Connected to MongoDB');

    await exports.seedCompetencies();
    
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  }
};

// Jalankan seeder jika file ini dieksekusi langsung
if (require.main === module) {
  exports.runSeeder();
}
