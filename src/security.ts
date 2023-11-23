import {UnauthorizedError} from './errors';
import jwt, {Secret} from 'jsonwebtoken';
import bcrypt from 'bcrypt';


// TODO(roman): implement these
// external libraries can be used
// you can even ignore them and use your own preferred method

const jwtSecret = process.env['JWT_SECRET'] as Secret;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return  await bcrypt.hash(password, salt);}

export function generateToken(data: TokenData): string {
  return jwt.sign(data, jwtSecret, {expiresIn: '30d'});
}

export function isValidToken(token: string): boolean {
  const valid = jwt.verify(token, jwtSecret);
  if (valid){
    return true;
  }
  throw new UnauthorizedError('AUTH_TOKEN_INVALID');
}

// NOTE(roman): assuming that `isValidToken` will be called before
export function extraDataFromToken(token: string): TokenData {
  isValidToken(token);
  const decoded = jwt.decode(token);

  return decoded as TokenData;}

export interface TokenData {
  id: number;
}