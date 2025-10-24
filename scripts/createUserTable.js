const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const createTableSQL = `
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    api_key VARCHAR(255) UNIQUE,
    credits INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const createTable = () => {
  return new Promise((resolve, reject) => {
    db.query(createTableSQL, (err, results) => {
      if (err) {
        console.error("Error creating table:", err);
        reject(err);
      } else {
        console.log("Table created successfully");
        resolve(results);
      }
    });
  });
};

const init = async () => {
  try {
    await createTable();
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

init();
