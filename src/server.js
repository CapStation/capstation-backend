const express = require('express')
const projectRoutes = require('./routes/projectRoutes');

const app = express()
const port = 3000

// Routes utama
app.use('/api/projects', projectRoutes);

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
