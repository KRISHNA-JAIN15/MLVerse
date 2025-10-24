const express = require("express");
const mysql = require("mysql2");
const { Client } = require("ssh2");
const net = require("net");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const app = express();

// Security headers
app.use(helmet());
require("dotenv").config();

// Middleware
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

const sshConfig = {
  host: "ec2-13-204-61-172.ap-south-1.compute.amazonaws.com",
  port: 22,
  username: "ubuntu",
  privateKey: fs.readFileSync(path.join(__dirname, "server-cc-rds.pem")),
};

const dbConfig = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 60000,
};

const localPort = 3307;

let db;
let sshClient;

const startApp = async () => {
  try {
    sshClient = new Client();

    console.log("Starting SSH connection...");
    await new Promise((resolve, reject) => {
      sshClient
        .on("ready", () => {
          console.log("SSH connection established");
          resolve();
        })
        .on("error", (err) => {
          console.error("SSH connection error:", err);
          reject(err);
        })
        .connect(sshConfig);
    });

    console.log("Creating SSH tunnel to RDS...");
    await new Promise((resolve, reject) => {
      sshClient.forwardOut(
        "127.0.0.1",
        localPort,
        dbConfig.host,
        dbConfig.port,
        (err, stream) => {
          if (err) {
            console.error("SSH tunnel error:", err);
            return reject(err);
          }

          console.log("SSH tunnel established");

          const server = net.createServer((socket) => {
            socket.pipe(stream).pipe(socket);
          });

          server.listen(localPort, "127.0.0.1", () => {
            console.log(`Listening on localhost:${localPort}`);
            resolve(server);
          });

          server.on("error", (err) => {
            console.error("Forwarding server error:", err);
            reject(err);
          });
        }
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Connecting to database through SSH tunnel...");
    db = mysql.createConnection({
      host: "127.0.0.1",
      port: localPort,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectTimeout: dbConfig.connectTimeout,
    });

    db.connect((err) => {
      if (err) {
        console.error("Error connecting to the database:", err.message);
        console.error("Error details:", err);
        console.error("Connection config (without password):", {
          host: "127.0.0.1",
          port: localPort,
          user: dbConfig.user,
          database: dbConfig.database,
        });
      } else {
        console.log("Connected to the database");

        startServer();
      }
    });
  } catch (error) {
    console.error("Failed to start application:", error);

    if (sshClient && sshClient.end) {
      sshClient.end();
    }
  }
};

const dbRoutes = require("./routes/dbRoutes");
const authRoutes = require("./routes/authRoutes");
const userOperations = require("./models/userOperations");

const startServer = () => {
  // Initialize user operations with DB connection
  const userOps = userOperations(db);

  // Register routes with the DB connection
  app.use("/api", dbRoutes(db));
  app.use("/auth", authRoutes(userOps));

  app.get("/", (req, res) => {
    res.json({
      message: "RDS Connection API",
      dbEndpoints: [
        "/api/tables - List all tables in database",
        "/api/users/create-table - Create users table with proper schema",
      ],
    });
  });

  port = process.env.PORT || 6003;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
};

startApp();

process.on("SIGINT", () => {
  console.log("Shutting down application...");
  if (db) {
    db.end();
  }
  if (sshClient) {
    sshClient.end();
  }
  process.exit(0);
});
