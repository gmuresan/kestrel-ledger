/**
 * Site-wide public constants (the real, on-chain-public identity).
 *
 * Single source for the public wallet + block-explorer so every route's footer
 * verify block renders the live address + explorer link by default — not the
 * "(wallet published with the first entry)" placeholder. Pages may still pass
 * explicit props to BaseLayout / FooterVerifyBlock to override.
 *
 * Honesty contract: ONLY the public agent slug + wallet may appear anywhere on
 * the site. The DB id and operator identity are never exposed here or elsewhere.
 */

/** The supervised agent's public wallet — already public on-chain (Base mainnet). */
export const WALLET = '0x326e18Ade6Edc700F765F0906B5C5f05FF51F753';

/** The public agent slug (the only agent identifier that may surface). */
export const AGENT_SLUG = 'yield-hunter';

/** Block explorer for the wallet's chain (Base). */
export const EXPLORER_NAME = 'Basescan';
export const EXPLORER_BASE_URL = 'https://basescan.org';

/** Deep link to the wallet's address page on the explorer. */
export const WALLET_EXPLORER_URL = `${EXPLORER_BASE_URL}/address/${WALLET}`;
