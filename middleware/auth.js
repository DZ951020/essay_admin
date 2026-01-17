const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: '需要认证令牌 (No token provided)' });
  }
  
  // Format: "Bearer <token>"
  const tokenParts = token.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({ error: '无效的令牌格式 (Invalid token format)' });
  }

  try {
    const decoded = jwt.verify(tokenParts[1], process.env.JWT_SECRET || 'your_jwt_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效或过期的令牌 (Invalid or expired token)' });
  }
};

module.exports = verifyToken;
