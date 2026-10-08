import * as crypto from 'node:crypto';

/** Returns an object containing token, tokenHash, iss and exp */
export const createTokenObject = async (timeBeforeExpiry) => {

    const token = await crypto.randomBytes(32).toString('hex');
    // Faster than bcrypt, not worth 
    const tokenHash = await crypto.createHash('sha256').update(token).digest('hex');

    const iss = new Date();
    const exp = new Date(Date.now() + timeBeforeExpiry);
    return {
        token,
        tokenHash,
        iss,
        exp
    }
}
