import crypto from "crypto"

const algorithm = "aes-256-gcm";
const ivLength = 12;

function getKey(): Buffer {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex) throw new Error('ENCRYPTION_KEY is not set in .env.local');

    const key = Buffer.from(hex, 'hex'); // a 64 karakteres hexadecimalis szoveget atalakitja 32 bajtos binaris adatta
    if (key.length !== 32) throw new Error('ENCRYPTION_KEY length should be 32 bytes');

    return key;
}

export function encrypt(plainText: string): string {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(':');
}

export function decrypt(payload: string): string {
    const [ivHex, authTagHex, encryptedHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);

    return decrypted.toString('utf8');
}