const listTables = (db) => async (req, res) => {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ?
  `;

  db.query(query, [process.env.DB_DATABASE], (err, results) => {
    if (err) {
      console.error("Error executing query:", err.message);
      return res.status(500).json({
        error: "Failed to fetch tables",
        details: err.message,
      });
    }

    const tables = results.map((row) => row.table_name || row.TABLE_NAME);
    res.json({
      database: process.env.DB_DATABASE,
      tables: tables,
    });
  });
};

// Create users table
const createUsersTable = (db) => async (req, res) => {
  const query = `
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
    );
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error executing query:", err.message);
      return res.status(500).json({
        error: "Failed to create users table",
        details: err.message,
      });
    }

    res.json({
      message: "Users table created successfully",
      schema: {
        id: "BIGINT PRIMARY KEY AUTO_INCREMENT",
        name: "VARCHAR(255)",
        email: "VARCHAR(255) UNIQUE",
        phone: "VARCHAR(50)",
        password: "VARCHAR(255) NOT NULL",
        api_key: "VARCHAR(255) UNIQUE",
        credits: "INT DEFAULT 0",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      },
    });
  });
};

module.exports = (db) => ({
  listTables: listTables(db),
  createUsersTable: createUsersTable(db),
});
