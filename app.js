const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/auth');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true // 允许执行多条SQL语句
};

let db;

const createDatabase = () => {
  const connection = mysql.createConnection(dbConfig);
  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
    connection.end();
    if (err) {
      console.error('创建数据库失败:', err);
      return;
    }
    console.log(`数据库 ${process.env.DB_NAME} 创建成功或已存在`);
    connectToDatabase();
  });
};

const connectToDatabase = () => {
  db = mysql.createConnection({
    ...dbConfig,
    database: process.env.DB_NAME
  });

  db.connect((err) => {
    if (err) {
      console.error('数据库连接失败:', err);
      return;
    }
    console.log('已成功连接到 MySQL 数据库');
    initTables();
  });
};

const initTables = () => {
  // 1. Create Users Table
  const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

  // 2. Create Essays Table (Original)
  const createEssaysTable = `
      CREATE TABLE IF NOT EXISTS essays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

  db.query(createUsersTable, (err) => {
    if (err) console.error("Error creating users table", err);
    else console.log("Users table ready");
  });

  db.query(createEssaysTable, (err) => {
    if (err) {
      console.error("Error creating essays table", err);
    } else {
      console.log("Essays table ready");

      // 3. Migrate Essays Table (Manual add columns)
      // REMOVED "IF NOT EXISTS" which is not supported in all MySQL versions for ADD COLUMN
      const addUserId = "ALTER TABLE essays ADD COLUMN user_id INT";
      const addIsPublic = "ALTER TABLE essays ADD COLUMN is_public BOOLEAN DEFAULT FALSE";

      db.query(addUserId, (err) => {
        // Ignore duplicate column error (1060)
        if (err && err.errno !== 1060) console.error("Error adding user_id:", err.message);
      });
      db.query(addIsPublic, (err) => {
        // Ignore duplicate column error (1060)
        if (err && err.errno !== 1060) console.error("Error adding is_public:", err.message);
      });
    }
  });
};

createDatabase();

// --- Auth Routes ---

// 注册
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(sql, [username, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '用户名已存在' });
        return res.status(500).json({ error: '注册失败' });
      }
      res.status(201).json({ message: '用户注册成功' });
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  const sql = 'SELECT * FROM users WHERE username = ?';
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: '登录失败' });
    if (results.length === 0) return res.status(401).json({ error: '用户名或密码错误' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ error: '用户名或密码错误' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  });
});


// --- Essays Routes ---

// 获取随笔列表 (支持过滤)
// GET /api/essays?type=my (需要认证)
// GET /api/essays?type=public (不需要认证，或认证后也只看public)
app.get('/api/essays', (req, res) => {
  const type = req.query.type || 'public'; // default to public plaza

  if (type === 'my') {
    // 需要验证 Token
    return verifyToken(req, res, () => {
      const sql = 'SELECT * FROM essays WHERE user_id = ? ORDER BY created_at DESC';
      db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: '查询失败' });
        res.json({ essays: results });
      });
    });
  } else {
    // 广场模式: 显示所有 is_public = true 的随笔
    const sql = 'SELECT * FROM essays WHERE is_public = TRUE ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ error: '查询失败' });
      res.json({ essays: results });
    });
  }
});

// 创建新随笔 (需要认证)
app.post('/api/essays', verifyToken, (req, res) => {
  const { title, content, is_public } = req.body;

  if (!title && !content) {
    return res.status(400).json({ error: '标题和内容不能同时为空' });
  }

  const sql = 'INSERT INTO essays (title, content, user_id, is_public) VALUES (?, ?, ?, ?)';
  db.query(sql, [title || '', content || '', req.user.id, matchesBoolean(is_public)], (err, results) => {
    if (err) {
      console.error('创建随笔失败:', err);
      res.status(500).json({ error: '创建随笔失败' });
      return;
    }

    const newSql = 'SELECT * FROM essays WHERE id = ?';
    db.query(newSql, [results.insertId], (err, newResults) => {
      if (err) res.status(500).json({ error: '查询新创建的随笔失败' });
      else res.status(201).json({ essay: newResults[0] });
    });
  });
});

// 获取单个随笔 (需要权限检查)
app.get('/api/essays/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM essays WHERE id = ?';

  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: '查询随笔失败' });
    if (results.length === 0) return res.status(404).json({ error: '随笔不存在' });

    const essay = results[0];
    // Check permission
    // If public, allow. If private, check token.
    if (essay.is_public) {
      return res.json({ essay });
    }

    // It's private, verify token
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: '无权访问此私密随笔' });

    // Verify token manually here since middleware is not applied globally
    try {
      const tokenParts = token.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') throw new Error();
      const decoded = jwt.verify(tokenParts[1], JWT_SECRET);

      if (decoded.id !== essay.user_id) {
        return res.status(403).json({ error: '无权访问此私密随笔' });
      }
      res.json({ essay });

    } catch (e) {
      return res.status(401).json({ error: '认证失败' });
    }
  });
});

// 更新随笔 (需要认证且是拥有者)
app.put('/api/essays/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, content, is_public } = req.body;

  // First check ownership
  db.query('SELECT user_id FROM essays WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: '随笔不存在' });

    if (results[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '没有权限修改此随笔' });
    }

    const sql = 'UPDATE essays SET title = ?, content = ?, is_public = ? WHERE id = ?';
    db.query(sql, [title || '', content || '', matchesBoolean(is_public), id], (err, results) => {
      if (err) {
        console.error('更新随笔失败:', err);
        res.status(500).json({ error: '更新随笔失败' });
        return;
      }

      const newSql = 'SELECT * FROM essays WHERE id = ?';
      db.query(newSql, [id], (err, newResults) => {
        if (err) res.status(500).json({ error: '查询更新后的随笔失败' });
        else res.json({ essay: newResults[0] });
      });
    });
  });
});

// 删除随笔 (需要认证且是拥有者)
app.delete('/api/essays/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  // First check ownership
  db.query('SELECT user_id FROM essays WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: '随笔不存在' });

    if (results[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '没有权限删除此随笔' });
    }

    const sql = 'DELETE FROM essays WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err) return res.status(500).json({ error: '删除随笔失败' });
      res.json({ message: '随笔删除成功' });
    });
  });
});

function matchesBoolean(val) {
  return val === true || val === 'true' || val === 1 || val === '1';
}

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
