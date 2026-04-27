import { ethers } from "ethers"
import SupplyChainJSON from "@/contracts/SupplyChain.json"
import { CONTRACT_ADDRESS } from "@/contracts/config"

const ABI = SupplyChainJSON.abi

export type UserStatus = 0 | 1 | 2 | 3
export type TransferStatus = 0 | 1 | 2

export interface UserInfo {
  id: bigint
  addr: string
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

export async function getUserInfo(contract: ethers.Contract, address: string): Promise<UserInfo | null> {
  try {
    const result = await contract.getUserInfo(address)
    return {
      id: result[0],
      addr: result[1],
      role: result[2],
      status: Number(result[3]) as UserStatus,
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

export async function requestUserRole(contract: ethers.Contract, role: string): Promise<ethers.TransactionReceipt> {
  const tx = await contract.requestUserRole(role)
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

export async function getToken(contract: ethers.Contract, tokenId: bigint): Promise<Token> {
  const result = await contract.getToken(tokenId)
  return {
    id: result[0],
    creator: result[1],
    name: result[2],
    totalSupply: result[3],
    features: result[4],
    parentId: result[5],
    dateCreated: result[6],
    burned: result[7],
  }
}

export async function getTokenBalance(
  contract: ethers.Contract,
  tokenId: bigint,
  address: string
): Promise<bigint> {
  return contract.getTokenBalance(tokenId, address)
}

export async function getUserTokens(contract: ethers.Contract, address: string): Promise<bigint[]> {
  return contract.getUserTokens(address)
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

export async function consumeRawMaterial(
  contract: ethers.Contract,
  tokenId: bigint,
  amount: bigint
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.consumeRawMaterial(tokenId, amount)
  return tx.wait()
}

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
    id: result[0],
    from: result[1],
    to: result[2],
    tokenId: result[3],
    dateCreated: result[4],
    amount: result[5],
    status: Number(result[6]) as TransferStatus,
  }
}

export async function getUserTransfers(contract: ethers.Contract, address: string): Promise<bigint[]> {
  return contract.getUserTransfers(address)
}

export async function getAllUserTokens(
  contract: ethers.Contract,
  address: string
): Promise<Token[]> {
  const ids: bigint[] = await getUserTokens(contract, address)
  return Promise.all(ids.map((id) => getToken(contract, id)))
}

export async function getAllUserTransfers(
  contract: ethers.Contract,
  address: string
): Promise<Transfer[]> {
  const ids: bigint[] = await getUserTransfers(contract, address)
  return Promise.all(ids.map((id) => getTransfer(contract, id)))
}
