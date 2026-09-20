export type TokenErrorCode = 
    | "NO_TOKEN"
    | "NO_REFRESH_TOKEN"
    | "REAUTH_REQUIRED"
    | "REFRESH_FAILED";

export class TokenError extends Error {
    code: TokenErrorCode;
    status: number;

    constructor(code: TokenErrorCode, message: string, status: number) {
        super(message);
        this.name = "TokenError";
        this.code = code;
        this.status = status;
    }
}