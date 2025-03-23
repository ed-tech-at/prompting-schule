import bcrypt from 'bcrypt';
import { env } from '$env/dynamic/private';

export async function hashPassword(password: string) {
  const salt = env.SERVER_PW_SALT;
  console.log('Salt:', salt);
  return await bcrypt.hash(password + salt, 10);
}
export async function comparePassword(password: string, hashedPassword: string) {
  const salt = env.SERVER_PW_SALT;
  console.log('Salt:', salt);
  return await bcrypt.compare(password + salt, hashedPassword);
}