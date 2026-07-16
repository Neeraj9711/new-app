import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const client = new OAuth2Client();

function getAudience() {
  const ids = [
    process.env.GOOGLE_CLIENT_ID_WEB,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
    process.env.GOOGLE_CLIENT_ID_IOS,
  ].filter(Boolean);

  if (!ids.length) {
    throw new Error('No Google client IDs configured (GOOGLE_CLIENT_ID_WEB / ANDROID / IOS)');
  }
  return ids;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
  );
}

export function verifyAppToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: getAudience(),
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new Error('Invalid Google token payload');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || '',
    photoUrl: payload.picture || null,
    emailVerified: Boolean(payload.email_verified),
  };
}

export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    photoUrl: user.photoUrl,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    language: user.language,
    needsPhone: !user.phone,
    createdAt: user.createdAt,
  };
}

export async function upsertGoogleUser(googleProfile, language = 'hi') {
  const lang = language === 'en' ? 'en' : 'hi';

  let user = await User.findOne({
    $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }],
  });

  if (user) {
    user.googleId = googleProfile.googleId;
    user.email = googleProfile.email;
    user.name = googleProfile.name || user.name;
    user.photoUrl = googleProfile.photoUrl || user.photoUrl;
    if (!user.language) user.language = lang;
    await user.save();
  } else {
    user = await User.create({
      googleId: googleProfile.googleId,
      email: googleProfile.email,
      name: googleProfile.name,
      photoUrl: googleProfile.photoUrl,
      language: lang,
    });
  }

  return user;
}
