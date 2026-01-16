CREATE DATABASE IF NOT EXISTS essays_db;

USE essays_db;

CREATE TABLE IF NOT EXISTS essays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO essays (title, content) VALUES
('我的第一篇随笔', '这是我的第一篇测试随笔内容。'),
('学习 Node.js', '今天开始学习 Node.js，感觉很有趣！');
