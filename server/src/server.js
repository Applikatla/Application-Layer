const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketManager');
const monitor = require('./middleware/monitor');
const enforcer = require('./middleware/enforcer');
const { protect } = require('./middleware/auth');

const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const adminRoutes = require('./routes/adminRoutes');
const securityRoutes = require('./routes/securityRoutes');
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for dashboard integration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

initSocket(io);

// Core Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Telemetry & Monitoring Pipeline
app.use(protect); // Populates req.user & req.token if Authorization header present
app.use(monitor); // Records internal state, runs analysis & detection, computes risk score
app.use(enforcer); // Enforces Allow / Warn / Block decisions

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Application-Layer Attack Detection Engine',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/simulation', simulationRoutes);

// Static client hosting (Vite build)
const path = require('path');
const fs = require('fs');
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Unhandled Error] ${err.stack}`);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛡️  ALAD Security Engine Server Running on Port ${PORT}`);
    console.log(`📡 WebSocket Gateway initialized for SOC Dashboard`);
    console.log(`=======================================================`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
