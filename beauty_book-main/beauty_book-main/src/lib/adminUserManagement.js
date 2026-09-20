// Legacy components remain importable, but cannot perform privileged actions in the public app.
const dedicatedAdmin = async () => { throw new Error('Cette opération nécessite le panneau d’administration sécurisé.'); };
export const deleteAccountCompletely = dedicatedAdmin;
export const banUserPermanently = dedicatedAdmin;
export const unbanUser = dedicatedAdmin;
