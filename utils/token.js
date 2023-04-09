import jwt from 'jsonwebtoken';

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, 'accessSecret', { expiresIn: '15m' });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, 'refreshSecret', { expiresIn: '30d' });
};

export { generateAccessToken, generateRefreshToken };
