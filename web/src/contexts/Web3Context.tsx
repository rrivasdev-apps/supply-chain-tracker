"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { ethers } from "ethers"
import { getContract, getUserInfo, isAdmin as checkIsAdmin, UserInfo } from "@/services/Web3Service"
import { ANVIL_CHAIN_ID } from "@/contracts/config"

interface Web3ContextType {
  account: string | null
  isConnected: boolean
  role: string | null
  isAdmin: boolean
  userStatus: number | null
  userLoading: boolean
  userInfo: UserInfo | null
  contract: ethers.Contract | null
  provider: ethers.BrowserProvider | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  refreshUser: () => Promise<void>
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  isConnected: false,
  role: null,
  isAdmin: false,
  userStatus: null,
  userLoading: false,
  userInfo: null,
  contract: null,
  provider: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshUser: async () => {},
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [adminFlag, setAdminFlag] = useState(false)
  const [userLoading, setUserLoading] = useState(false)

  const loadUser = useCallback(async (addr: string, ctr: ethers.Contract) => {
    setUserLoading(true)
    try {
      const [info, admin] = await Promise.all([getUserInfo(ctr, addr), checkIsAdmin(ctr, addr)])
      setUserInfo(info)
      setAdminFlag(admin)
    } finally {
      setUserLoading(false)
    }
  }, [])

  const connectWallet = useCallback(async () => {
    const ethereum = (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum
    if (!ethereum) {
      alert("MetaMask no está instalado")
      return
    }

    const p = new ethers.BrowserProvider(ethereum)
    const accounts = await p.send("eth_requestAccounts", [])
    const network = await p.getNetwork()

    if (Number(network.chainId) !== ANVIL_CHAIN_ID) {
      try {
        await p.send("wallet_switchEthereumChain", [
          { chainId: `0x${ANVIL_CHAIN_ID.toString(16)}` },
        ])
      } catch {
        alert(`Por favor cambia MetaMask a la red Anvil (chainId ${ANVIL_CHAIN_ID})`)
        return
      }
    }

    const signer = await p.getSigner()
    const ctr = getContract(signer)

    setProvider(p)
    setAccount(accounts[0])
    setContract(ctr)

    await loadUser(accounts[0], ctr)
  }, [loadUser])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setContract(null)
    setProvider(null)
    setUserInfo(null)
    setAdminFlag(false)
    setUserLoading(false)
  }, [])

  const refreshUser = useCallback(async () => {
    if (account && contract) {
      await loadUser(account, contract)
    }
  }, [account, contract, loadUser])

  useEffect(() => {
    const ethereum = (window as Window & { ethereum?: { on: (e: string, cb: (a: string[]) => void) => void; removeListener: (e: string, cb: (a: string[]) => void) => void } }).ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
        return
      }
      if (provider) {
        // Clear stale user data immediately so pages don't show old account's info
        setUserInfo(null)
        setAdminFlag(false)

        provider.getSigner().then((signer) => {
          const newContract = getContract(signer)
          setAccount(accounts[0])
          setContract(newContract)
          loadUser(accounts[0], newContract)
        })
      }
    }

    ethereum.on("accountsChanged", handleAccountsChanged)
    return () => ethereum.removeListener("accountsChanged", handleAccountsChanged)
  }, [provider, disconnectWallet, loadUser])

  return (
    <Web3Context.Provider
      value={{
        account,
        isConnected: !!account,
        role: userInfo?.role ?? null,
        isAdmin: adminFlag,
        userStatus: userInfo ? Number(userInfo.status) : null,
        userLoading,
        userInfo,
        contract,
        provider,
        connectWallet,
        disconnectWallet,
        refreshUser,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  return useContext(Web3Context)
}
