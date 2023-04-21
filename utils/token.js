import jwt from 'jsonwebtoken';

const generateAccessToken = async (userId, secret) => {
  return jwt.sign({ userId }, secret, { expiresIn: '15m' });
};

const generateRefreshToken = async (userId, secret) => {
  return jwt.sign({ userId }, secret, { expiresIn: '14d' });
};

export { generateAccessToken, generateRefreshToken };
