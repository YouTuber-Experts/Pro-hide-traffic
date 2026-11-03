import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  workspaceUid?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      req.workspaceUid = decodedToken.uid;
      return next();
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  // Allow isolated demo workspace mode when explicitly requested by the preview client
  const demoHeader = req.headers['x-workspace-mode'];
  if (demoHeader === 'demo-workspace') {
    req.workspaceUid = 'demo-workspace';
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing token' });
};
