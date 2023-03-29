import bcrypt from 'bcrypt';

export const hashPassword = async (password, salt = 10) => {
  return await bcrypt.hash(password, salt);
}

export const comparePasswords = async (password, hash) => {
    return await bcrypt.compare(password, hash);
}
