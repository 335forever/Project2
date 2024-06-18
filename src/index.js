const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('./services/mqttService');
const db = require('./utils/db');
const deviceRoutes = require('./routes/deviceRoutes');
const dataRoutes = require('./routes/dataRoutes');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(cors({   
  origin: '*',   
  methods: ['GET', 'POST', 'PUT', 'DELETE'],   
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
app.use('/api/devices', deviceRoutes);
app.use('/api/data', dataRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
