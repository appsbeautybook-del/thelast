// Database changes are versioned migrations executed by an operator or deployment job.
// The browser never executes SQL or changes database structure.
export async function ensureReservationColumns() {
  throw new Error('La base doit être mise à jour par le processus de migration du backend.');
}
