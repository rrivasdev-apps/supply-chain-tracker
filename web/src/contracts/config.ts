export const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

export const ANVIL_CHAIN_ID = 31337

export const ANVIL_RPC_URL = "http://localhost:8545"

// Materias primas se almacenan ×100 on-chain para soportar 2 decimales
// Ej: el usuario crea 100 láminas → on-chain 10000; consume 1.5 → on-chain 150
export const SCALE_FACTOR = 100

export function fmtRaw(onChain: bigint): string {
  const n = Number(onChain) / SCALE_FACTOR
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}
