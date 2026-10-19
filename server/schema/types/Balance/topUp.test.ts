import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Interface, Wallet } from 'ethers'
import {
  createTopUpOffer,
  verifyTopUpOffer,
  verifyUsdtTransaction,
} from './helpers/topUp'

const rpc = vi.hoisted(() => ({
  getNetwork: vi.fn(),
  waitForTransaction: vi.fn(),
  destroy: vi.fn(),
}))
vi.mock('ethers', async (original) => ({
  ...(await original<typeof import('ethers')>()),
  JsonRpcProvider: class {
    getNetwork = rpc.getNetwork
    waitForTransaction = rpc.waitForTransaction
    destroy = rpc.destroy
  },
}))
const sender = Wallet.createRandom()
const recipient = Wallet.createRandom().address
const contract = Wallet.createRandom().address
const abi = new Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
])
const txHash = `0x${'1'.repeat(64)}`
beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'top-up-tests')
  vi.stubEnv('CRYPTO_CHAIN_ID', '42161')
  vi.stubEnv('CRYPTO_RPC_URL', 'https://rpc.invalid')
  vi.stubEnv('PAYMENT_RECIPIENT_ADDRESS', recipient)
  vi.stubEnv('CRYPTO_USDT_CONTRACT_ADDRESS', contract)
  rpc.getNetwork.mockResolvedValue({ chainId: 42161n })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
it('binds the signed offer to the user and wallet', async () => {
  const message = createTopUpOffer('user')
  const signature = await sender.signMessage(message)
  expect(() =>
    verifyTopUpOffer(message, signature, sender.address, 'user'),
  ).not.toThrow()
  expect(() =>
    verifyTopUpOffer(message, signature, sender.address, 'other'),
  ).toThrow()
  expect(() =>
    verifyTopUpOffer(message + 'changed', signature, sender.address, 'user'),
  ).toThrow()
})
it('credits only matching token transfers from the linked wallet to the configured recipient', async () => {
  const event = abi.getEvent('Transfer')
  if (!event) {
    throw new Error('Missing transfer ABI')
  }
  const matching = abi.encodeEventLog(event, [
    sender.address,
    recipient,
    2500000n,
  ])
  const foreign = abi.encodeEventLog(event, [
    recipient,
    sender.address,
    99000000n,
  ])
  rpc.waitForTransaction.mockResolvedValue({
    status: 1,
    logs: [
      { address: contract, ...foreign },
      { address: contract, ...matching },
      { address: recipient, ...matching },
    ],
  })
  expect(await verifyUsdtTransaction(txHash, sender.address)).toBe(2.5)
  expect(rpc.waitForTransaction).toHaveBeenCalledWith(txHash, 2, 60000)
  expect(rpc.destroy).toHaveBeenCalledOnce()
})
it('rejects failed receipts and a mismatched RPC network', async () => {
  rpc.waitForTransaction.mockResolvedValue({ status: 0, logs: [] })
  await expect(verifyUsdtTransaction(txHash, sender.address)).rejects.toThrow()
  rpc.getNetwork.mockResolvedValue({ chainId: 1n })
  await expect(verifyUsdtTransaction(txHash, sender.address)).rejects.toThrow(
    'сеть',
  )
})
