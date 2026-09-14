/**
 * Shared error for the on-chain queue's fencing layer.
 *
 * Defined in its own module because it must cross the service boundary
 * intact: `blockchain-queue.service` throws it when a fenced post-claim
 * write matches no row (the lock was reclaimed by another worker), and
 * `web3.service` — which invokes the queue's journal through the
 * `onReplacement` callback — must recognise it and let it pass through its
 * error mapper. Importing it from the queue module into web3.service would
 * be a circular import, and mapping it to a generic "Blockchain error"
 * would make a lost lock look like a send failure to retry.
 */
export class LockLostError extends Error {
  constructor(recordId: number) {
    super(`Queue record ${recordId}: lock reclaimed by another worker`);
    this.name = 'LockLostError';
  }
}