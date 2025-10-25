const bcrypt = require("bcryptjs");

const userOperations = (db) => ({
  createUser: async (userData) => {
    const { name, email, password, phone = "" } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (name, email, password, phone, email_verified, credits) 
        VALUES (?, ?, ?, ?, false, 0)
      `;

      db.query(query, [name, email, hashedPassword, phone], (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            reject(new Error("Email already exists"));
          } else {
            reject(err);
          }
        } else {
          resolve({ id: result.insertId, name, email, phone });
        }
      });
    });
  },

  verifyUser: async (email, password) => {
    return new Promise(async (resolve, reject) => {
      const query = "SELECT * FROM users WHERE email = ?";
      db.query(query, [email], async (err, results) => {
        if (err) {
          reject(err);
        } else {
          const user = results[0];
          if (!user) {
            reject(new Error("User not found"));
          } else {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
              resolve(user);
            } else {
              reject(new Error("Invalid password"));
            }
          }
        }
      });
    });
  },

  createOrUpdateUser: async (cognitoUser) => {
    return new Promise((resolve, reject) => {
      const query = `
                INSERT INTO users (
                    cognito_id,
                    name,
                    email,
                    phone,
                    email_verified,
                    last_login
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    email = VALUES(email),
                    phone = VALUES(phone),
                    email_verified = VALUES(email_verified),
                    last_login = CURRENT_TIMESTAMP
            `;

      const values = [
        cognitoUser.sub,
        cognitoUser.name || "",
        cognitoUser.email || "",
        cognitoUser.phone_number || "",
        cognitoUser.email_verified || false,
      ];

      db.query(query, values, (err, result) => {
        if (err) {
          console.error("Database error creating/updating user:", err);
          reject(err);
        } else {
          db.query(
            "SELECT * FROM users WHERE cognito_id = ?",
            [cognitoUser.sub],
            (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results[0]);
              }
            }
          );
        }
      });
    });
  },

  getUserByCognitoId: async (cognitoId) => {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM users WHERE cognito_id = ?";
      db.query(query, [cognitoId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0] || null);
        }
      });
    });
  },

  getUserByEmail: async (email) => {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM users WHERE email = ?";
      db.query(query, [email], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0] || null);
        }
      });
    });
  },

  getUserById: async (userId) => {
    return new Promise((resolve, reject) => {
      const query = "SELECT * FROM users WHERE id = ?";
      db.query(query, [userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0] || null);
        }
      });
    });
  },

  regenerateApiKey: async (cognitoId) => {
    return new Promise((resolve, reject) => {
      const query = `
                UPDATE users 
                SET api_key = SHA2(UUID(), 256)
                WHERE cognito_id = ?
            `;
      db.query(query, [cognitoId], (err, result) => {
        if (err) {
          reject(err);
        } else {
          db.query(
            "SELECT api_key FROM users WHERE cognito_id = ?",
            [cognitoId],
            (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results[0]?.api_key);
              }
            }
          );
        }
      });
    });
  },

  updateCredits: async (cognitoId, amount) => {
    return new Promise((resolve, reject) => {
      const query = `
                UPDATE users 
                SET credits = credits + ?
                WHERE cognito_id = ?
            `;
      db.query(query, [amount, cognitoId], (err, result) => {
        if (err) {
          reject(err);
        } else {
          db.query(
            "SELECT credits FROM users WHERE cognito_id = ?",
            [cognitoId],
            (err, results) => {
              if (err) {
                reject(err);
              } else {
                resolve(results[0]?.credits);
              }
            }
          );
        }
      });
    });
  },

  // Update user profile
  updateUser: async (userData) => {
    const { id, name, email, phone, api_key } = userData;

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE users 
        SET name = ?, email = ?, phone = ? ${api_key ? ", api_key = ?" : ""}
        WHERE id = ?
      `;

      const params = api_key
        ? [name, email, phone, api_key, id]
        : [name, email, phone, id];
      db.query(query, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Fetch updated user data
          db.query("SELECT * FROM users WHERE id = ?", [id], (err, results) => {
            if (err) {
              reject(err);
            } else {
              resolve(results[0]);
            }
          });
        }
      });
    });
  },
});

module.exports = userOperations;
