import { ethers } from "ethers"
import SupplyChainJSON from "@/contracts/SupplyChain.json"
import { CONTRACT_ADDRESS } from "@/contracts/config"

const ABI = SupplyChainJSON.abi

export type UserStatus = 0 | 1 | 2 | 3
export type TransferStatus = 0 | 1 | 2

export interface UserInfo {
  id: bigint
  addr: string
  name: string        // nombre o razón social
  role: string
  status: UserStatus
}

export interface Token {
  id: bigint
  creator: string
  name: string
  totalSupply: bigint
  features: string
  parentId: bigint
  dateCreated: bigint
  burned: boolean
  certified: boolean  // solo aplica a bobinas (parentId === 0n)
}

export interface Transfer {
  id: bigint
  from: string
  to: string
  tokenId: bigint
  dateCreated: bigint
  amount: bigint
  status: TransferStatus
}

export function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signerOrProvider)
}

// ─── USER ─────────────────────────────────────────────────────────────────────

export async function getUserInfo(contract: ethers.Contract, address: string): Promise<UserInfo | null> {
  try {
    const result = await contract.getUserInfo(address)
    return {
      id:     result[0],
      addr:   result[1],
      name:   result[2],
      role:   result[3],
      status: Number(result[4]) as UserStatus,
    }
  } catch {
    return null
  }
}

export async function isAdmin(contract: ethers.Contract, address: string): Promise<boolean> {
  try {
    return await contract.isAdmin(address)
  } catch {
    return false
  }
}

export async function requestUserRole(
  contract: ethers.Contract,
  name: string,
  role: string
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.requestUserRole(name, role)
  return tx.wait()
}

export async function changeStatusUser(
  contract: ethers.Contract,
  address: string,
  status: UserStatus
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.changeStatusUser(address, status)
  return tx.wait()
}

// ─── TOKEN ────────────────────────────────────────────────────────────────────

export async function getToken(contract: ethers.Contract, tokenId: bigint): Promise<Token> {
  const result = await contract.getToken(tokenId)
  return {
    id:          result[0],
    creator:     result[1],
    name:        result[2],
    totalSupply: result[3],
    features:    result[4],
    parentId:    result[5],
    dateCreated: result[6],
    burned:      result[7],
    certified:   result[8],
  }
}

export async function getTokenBalance(
  contract: ethers.Contract,
  tokenId: bigint,
  address: string
): Promise<bigint> {
  return contract.getTokenBalance(tokenId, address)
}

export async function createToken(
  contract: ethers.Contract,
  name: string,
  totalSupply: number,
  features: string,
  parentId: number
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.createToken(name, totalSupply, features, parentId)
  return tx.wait()
}

export async function updateToken(
  contract: ethers.Contract,
  tokenId: bigint,
  name: string,
  features: string
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.updateToken(tokenId, name, features)
  return tx.wait()
}

export async function burnToken(
  contract: ethers.Contract,
  tokenId: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.burnToken(tokenId)
  return tx.wait()
}

export async function redeemProduct(
  contract: ethers.Contract,
  tokenId: bigint,
  amount: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.redeemProduct(tokenId, amount)
  return tx.wait()
}

export interface Redemption {
  consumer: string
  consumerName: string
  amount: bigint
  timestamp: Date
  txHash: string
}

export async function getRedemptions(
  contract: ethers.Contract,
  tokenId: bigint,
  consumer: string
): Promise<Redemption[]> {
  const filter = contract.filters.ProductRedeemed(tokenId, consumer)
  const events = await contract.queryFilter(filter)
  return Promise.all(
    events.map(async (ev) => {
      const log = ev as ethers.EventLog
      const consumer: string = log.args[1]
      const amount: bigint = log.args[2]
      const block = await ev.getBlock()
      const info = await getUserInfo(contract, consumer)
      return {
        consumer,
        consumerName: info?.name ?? consumer,
        amount,
        timestamp: new Date(block.timestamp * 1000),
        txHash: ev.transactionHash,
      }
    })
  )
}

export async function certifyToken(
  contract: ethers.Contract,
  tokenId: bigint,
  certNumber: string
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.certifyToken(tokenId, certNumber)
  return tx.wait()
}

export interface CertificationInfo {
  certifier: string
  certifierName: string
  certNumber: string
  timestamp: Date
}

export async function getCertificationInfo(
  contract: ethers.Contract,
  tokenId: bigint
): Promise<CertificationInfo | null> {
  const filter = contract.filters.TokenCertified(tokenId)
  const events = await contract.queryFilter(filter)
  if (events.length === 0) return null
  const ev = events[0] as ethers.EventLog
  const certifier: string = ev.args[1]
  const certNumber: string = ev.args[2]
  const block = await ev.getBlock()
  const info = await getUserInfo(contract, certifier)
  return {
    certifier,
    certifierName: info?.name ?? certifier,
    certNumber,
    timestamp: new Date(block.timestamp * 1000),
  }
}

export async function consumeRawMaterial(
  contract: ethers.Contract,
  tokenId: bigint,
  amount: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.consumeRawMaterial(tokenId, amount)
  return tx.wait()
}

// ─── TRANSFER ─────────────────────────────────────────────────────────────────

export async function transfer(
  contract: ethers.Contract,
  to: string,
  tokenId: bigint,
  amount: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.transfer(to, tokenId, amount)
  return tx.wait()
}

export async function acceptTransfer(
  contract: ethers.Contract,
  transferId: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.acceptTransfer(transferId)
  return tx.wait()
}

export async function rejectTransfer(
  contract: ethers.Contract,
  transferId: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.rejectTransfer(transferId)
  return tx.wait()
}

export async function getTransfer(contract: ethers.Contract, transferId: bigint): Promise<Transfer> {
  const result = await contract.getTransfer(transferId)
  return {
    id:          result[0],
    from:        result[1],
    to:          result[2],
    tokenId:     result[3],
    dateCreated: result[4],
    amount:      result[5],
    status:      Number(result[6]) as TransferStatus,
  }
}

// ─── INDEX QUERIES ────────────────────────────────────────────────────────────

export async function getUserTokenIds(contract: ethers.Contract, address: string): Promise<bigint[]> {
  return contract.getUserTokenIds(address)
}

export async function getAllTokenIds(contract: ethers.Contract): Promise<bigint[]> {
  return contract.getAllTokenIds()
}

export async function getUserTransfers(contract: ethers.Contract, address: string): Promise<bigint[]> {
  return contract.getUserTransfers(address)
}

export async function getAllUserIds(contract: ethers.Contract): Promise<bigint[]> {
  return contract.getAllUserIds()
}

export async function getUserAddressesByRole(
  contract: ethers.Contract,
  role: string
): Promise<string[]> {
  return contract.getUserAddressesByRole(role)
}

// ─── BATCH HELPERS ────────────────────────────────────────────────────────────

export async function getUserTokens(
  contract: ethers.Contract,
  address: string
): Promise<Token[]> {
  const ids: bigint[] = await getUserTokenIds(contract, address)
  return Promise.all(ids.map((id) => getToken(contract, id)))
}

export async function getAllUserTransfers(
  contract: ethers.Contract,
  address: string
): Promise<Transfer[]> {
  const ids: bigint[] = await getUserTransfers(contract, address)
  return Promise.all(ids.map((id) => getTransfer(contract, id)))
}

export async function getAllTokens(contract: ethers.Contract): Promise<Token[]> {
  const ids: bigint[] = await getAllTokenIds(contract)
  return Promise.all(ids.map((id) => getToken(contract, id)))
}

export async function getAllUsers(contract: ethers.Contract): Promise<UserInfo[]> {
  const ids: bigint[] = await getAllUserIds(contract)
  const users = await Promise.all(
    ids.map(async (id) => {
      try {
        const u = await contract.users(id)
        return await getUserInfo(contract, u.userAddress)
      } catch {
        return null
      }
    })
  )
  return users.filter((u): u is UserInfo => u !== null)
}

export async function getApprovedUsersByRole(
  contract: ethers.Contract,
  role: string
): Promise<UserInfo[]> {
  const addresses: string[] = await getUserAddressesByRole(contract, role)
  const users = await Promise.all(addresses.map((addr) => getUserInfo(contract, addr)))
  return users.filter((u): u is UserInfo => u !== null && u.status === 1)
}

// ── Fechas de registro y aprobación ──────────────────────────────────────────

export interface UserDates {
  registeredAt: Date | null
  approvedAt: Date | null
}

export async function getUserDates(
  contract: ethers.Contract,
  address: string
): Promise<UserDates> {
  const [regEvents, statusEvents] = await Promise.all([
    contract.queryFilter(contract.filters.UserRoleRequested(address)),
    contract.queryFilter(contract.filters.UserStatusChanged(address)),
  ])

  let registeredAt: Date | null = null
  if (regEvents.length > 0) {
    const block = await regEvents[0].getBlock()
    registeredAt = new Date(block.timestamp * 1000)
  }

  let approvedAt: Date | null = null
  for (const ev of statusEvents as ethers.EventLog[]) {
    if (Number(ev.args[1]) === 1) {
      const block = await ev.getBlock()
      approvedAt = new Date(block.timestamp * 1000)
      break
    }
  }

  return { registeredAt, approvedAt }
}

// ── KPIs globales o por usuario ───────────────────────────────────────────────

export interface AdminStats {
  totalRawMaterials: number
  totalProducts: number
  totalCertifications: number
  totalTransfers: number
  pendingTransfers: number
  totalRedemptions: number
  redeemedUnits: bigint
}

export async function getAdminStats(
  contract: ethers.Contract,
  address?: string          // undefined = global, string = filtrado por usuario
): Promise<AdminStats> {
  const [certEvents, transferEvents, redeemEvents, allTokens] = await Promise.all([
    contract.queryFilter(
      address
        ? contract.filters.TokenCertified(null, address)
        : contract.filters.TokenCertified()
    ),
    contract.queryFilter(
      address
        ? contract.filters.TransferRequested(null, address)
        : contract.filters.TransferRequested()
    ),
    contract.queryFilter(
      address
        ? contract.filters.ProductRedeemed(null, address)
        : contract.filters.ProductRedeemed()
    ),
    address ? getUserTokens(contract, address) : getAllTokens(contract),
  ])

  // Para transfers recibidas también si hay address
  let allTransferEvents = transferEvents
  if (address) {
    const incoming = await contract.queryFilter(
      contract.filters.TransferRequested(null, null, address)
    )
    allTransferEvents = [...new Map(
      [...transferEvents, ...incoming].map((e) => [e.transactionHash, e])
    ).values()]
  }

  const pendingTransfers = await Promise.all(
    allTransferEvents.map(async (ev) => {
      try {
        const log = ev as ethers.EventLog
        const t = await contract.getTransfer(log.args[0])
        return Number(t[5]) === 0 ? 1 : 0
      } catch { return 0 }
    })
  )

  const rawMaterials = allTokens.filter((t) => t.parentId === 0n && !t.burned)
  const products     = allTokens.filter((t) => t.parentId  > 0n && !t.burned)

  const redeemedUnits = (redeemEvents as ethers.EventLog[]).reduce(
    (sum, ev) => sum + BigInt(ev.args[2]),
    0n
  )

  return {
    totalRawMaterials:  rawMaterials.length,
    totalProducts:      products.length,
    totalCertifications: certEvents.length,
    totalTransfers:      allTransferEvents.length,
    pendingTransfers:    pendingTransfers.reduce((a: number, b: number) => a + b, 0),
    totalRedemptions:    redeemEvents.length,
    redeemedUnits,
  }
}
