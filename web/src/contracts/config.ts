const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
if (!addr) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS no está definida en .env.local")
export const CONTRACT_ADDRESS: string = addr

export const ANVIL_CHAIN_ID = 11155111  // Sepolia

export const ANVIL_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.infura.io/v3/243c56f0553c417e97e7845c955e9073"

// Materias primas se almacenan ×100 on-chain para soportar 2 decimales
// Ej: el usuario crea 100 láminas → on-chain 10000; consume 1.5 → on-chain 150
export const SCALE_FACTOR = 100

export function fmtRaw(onChain: bigint): string {
  const n = Number(onChain) / SCALE_FACTOR
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}
