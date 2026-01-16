const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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
  password: process.env.DB_PASSWORD
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
    createTable();
  });
};

const createTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS essays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;
  db.query(sql, (err) => {
    if (err) {
      console.error('创建表失败:', err);
      return;
    }
    console.log('随笔表创建成功或已存在');
    insertSampleData();
  });
};

const insertSampleData = () => {
  const checkDataSql = 'SELECT COUNT(*) as count FROM essays';
  db.query(checkDataSql, (err, results) => {
    if (err) {
      console.error('检查数据失败:', err);
      return;
    }

    if (results[0].count === 0) {
      const insertSql = `
        INSERT INTO essays (title, content) VALUES
        ('我的第一篇随笔', '这是我的第一篇测试随笔内容。'),
        ('学习 Node.js', '今天开始学习 Node.js，感觉很有趣！');
      `;
      db.query(insertSql, (err) => {
        if (err) {
          console.error('插入测试数据失败:', err);
          return;
        }
        console.log('测试数据插入成功');
      });
    } else {
      console.log('表中已有数据，跳过插入测试数据');
    }
  });
};

createDatabase();

// 获取所有随笔（按创建时间倒序）
app.get('/api/essays', (req, res) => {
  const sql = 'SELECT * FROM essays ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('查询随笔列表失败:', err);
      res.status(500).json({ error: '查询随笔列表失败' });
      return;
    }
    res.json({ essays: results });
  });
});

// 创建新随笔
app.post('/api/essays', (req, res) => {
  const { title, content } = req.body;
  
  if (!title && !content) {
    return res.status(400).json({ error: '标题和内容不能同时为空' });
  }
  
  const sql = 'INSERT INTO essays (title, content) VALUES (?, ?)';
  db.query(sql, [title || '', content || ''], (err, results) => {
    if (err) {
      console.error('创建随笔失败:', err);
      res.status(500).json({ error: '创建随笔失败' });
      return;
    }
    
    // 获取刚创建的随笔
    const newSql = 'SELECT * FROM essays WHERE id = ?';
    db.query(newSql, [results.insertId], (err, newResults) => {
      if (err) {
        console.error('查询新创建的随笔失败:', err);
        res.status(500).json({ error: '查询新创建的随笔失败' });
        return;
      }
      res.status(201).json({ essay: newResults[0] });
    });
  });
});

// 获取单个随笔
app.get('/api/essays/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM essays WHERE id = ?';
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('查询随笔失败:', err);
      res.status(500).json({ error: '查询随笔失败' });
      return;
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: '随笔不存在' });
    }
    
    res.json({ essay: results[0] });
  });
});

// 更新随笔
app.put('/api/essays/:id', (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  
  if (!title && !content) {
    return res.status(400).json({ error: '标题和内容不能同时为空' });
  }
  
  const sql = 'UPDATE essays SET title = ?, content = ? WHERE id = ?';
  db.query(sql, [title || '', content || '', id], (err, results) => {
    if (err) {
      console.error('更新随笔失败:', err);
      res.status(500).json({ error: '更新随笔失败' });
      return;
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: '随笔不存在' });
    }
    
    // 获取更新后的随笔
    const newSql = 'SELECT * FROM essays WHERE id = ?';
    db.query(newSql, [id], (err, newResults) => {
      if (err) {
        console.error('查询更新后的随笔失败:', err);
        res.status(500).json({ error: '查询更新后的随笔失败' });
        return;
      }
      res.json({ essay: newResults[0] });
    });
  });
});

// 删除随笔
app.delete('/api/essays/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM essays WHERE id = ?';
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('删除随笔失败:', err);
      res.status(500).json({ error: '删除随笔失败' });
      return;
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: '随笔不存在' });
    }
    
    res.json({ message: '随笔删除成功' });
  });
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
