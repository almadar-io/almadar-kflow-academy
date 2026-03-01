import { NextFunction, Request, Response } from 'express';
import { getFirebaseAuth } from '../config/firebaseAdmin';

const BEARER_PREFIX = 'Bearer ';

export async function authenticateFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;

    console.log('[Auth] Request to:', req.path);
    console.log('[Auth] Authorization header present:', !!authorization);

    if (!authorization || !authorization.startsWith(BEARER_PREFIX)) {
      console.log('[Auth] Missing or malformed Authorization header');
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authorization.slice(BEARER_PREFIX.length);
    console.log('[Auth] Token length:', token.length);
    console.log('[Auth] Token preview:', token.substring(0, 50) + '...');

    try {
      const decodedToken = await getFirebaseAuth().verifyIdToken(token);
      console.log('[Auth] Token verified, user:', decodedToken.uid);

      req.firebaseUser = decodedToken;
      res.locals.firebaseUser = decodedToken;

      return next();
    } catch (verifyError: any) {
      console.error('[Auth] Token verification failed:', verifyError.message);
      console.error('[Auth] Error code:', verifyError.code);
      return res.status(401).json({ error: 'Unauthorized', details: verifyError.message });
    }
  } catch (error) {
    console.error('[Auth] Firebase authentication failed:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export default authenticateFirebase;
