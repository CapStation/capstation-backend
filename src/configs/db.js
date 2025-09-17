const mongoose = require('mongoose');

module.exports = function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('MongoDB Connected ✅');
  }).catch(err => {
    console.error('MongoDB Connection Error ❌:', err);
    process.exit(1);
  });
};
