export const PLAYER_IDENTITY_STATES = Object.freeze({ UNAVAILABLE: 'UNAVAILABLE', BOUND: 'BOUND', REVOKED: 'REVOKED' });
export const claimPlayerBinding = async () => { throw new Error('Identity pilot is disabled in the official player'); };
export const revokeOwnPlayerBinding = async () => { throw new Error('Identity pilot is disabled in the official player'); };
export const classifyPlayerIdentityFailure = () => PLAYER_IDENTITY_STATES.UNAVAILABLE;
