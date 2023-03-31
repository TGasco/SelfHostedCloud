import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const hashPassword = async (password, saltRounds = 10) => {
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
}

export const comparePasswords = async (password, hash) => {
    return await bcrypt.compare(password, hash);
}

export function isValidInput(username, password) {
  const minLength = 5;
  const maxLength = 30;
  const allowedChars = /^[A-Za-z0-9!@#£$%^&*_\-.]+$/;

  const isLengthValid = (input) => input.length >= minLength && input.length <= maxLength;
  const isCharSetValid = (input) => allowedChars.test(input);

  return isLengthValid(username) && isLengthValid(password) && isCharSetValid(username) && isCharSetValid(password);
}

export function generateJwtSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
