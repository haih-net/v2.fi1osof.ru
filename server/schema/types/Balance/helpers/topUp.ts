import { getAddress, Interface, JsonRpcProvider, verifyMessage } from 'ethers'
import jwt from 'jsonwebtoken'
import { jwtSecret } from '../../User/helpers/auth'
import { validateAmount } from './upsertBalance'

interface PaymentConfig {
  chainId: number
  rpcUrl: string
  recipientAddress: string
  usdtContractAddress: string
}
export function getPaymentConfig(): PaymentConfig {
  const chainId = Number(process.env.CRYPTO_CHAIN_ID)
  const rpcUrl = process.env.CRYPTO_RPC_URL
  if (!Number.isSafeInteger(chainId) || chainId <= 0 || !rpcUrl) {
    throw new Error('Пополнение не настроено')
  }
  return {
    chainId,
    rpcUrl,
    recipientAddress: getAddress(process.env.PAYMENT_RECIPIENT_ADDRESS ?? ''),
    usdtContractAddress: getAddress(
      process.env.CRYPTO_USDT_CONTRACT_ADDRESS ?? '',
    ),
  }
}
export function createTopUpOffer(userId: string): string {
  const { chainId, recipientAddress, usdtContractAddress } = getPaymentConfig()
  const token = jwt.sign(
    { type: 'TopUp', userId, chainId, recipientAddress, usdtContractAddress },
    jwtSecret(),
    { algorithm: 'HS256', expiresIn: '24h' },
  )
  return `Balance Top-Up Agreement\n\nYou purchase internal Coins at a 1:1 USDT rate. Coins are non-refundable and can only be used within the platform.\nChain: ${chainId}\nRecipient: ${recipientAddress}\n\n${token}`
}
export function verifyTopUpOffer(
  message: string,
  signature: string,
  address: string,
  userId: string,
): void {
  const token = message.split('\n').at(-1) ?? ''
  const payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] })
  const config = getPaymentConfig()
  if (
    typeof payload === 'string' ||
    payload.type !== 'TopUp' ||
    payload.userId !== userId ||
    payload.chainId !== config.chainId ||
    payload.recipientAddress !== config.recipientAddress ||
    payload.usdtContractAddress !== config.usdtContractAddress ||
    message !==
      `Balance Top-Up Agreement\n\nYou purchase internal Coins at a 1:1 USDT rate. Coins are non-refundable and can only be used within the platform.\nChain: ${config.chainId}\nRecipient: ${config.recipientAddress}\n\n${token}` ||
    getAddress(verifyMessage(message, signature)) !== getAddress(address)
  ) {
    throw new Error('Недействительное соглашение или подпись')
  }
}
export async function verifyUsdtTransaction(
  txHash: string,
  sender: string,
): Promise<number> {
  if (!/^0x[0-9a-f]{64}$/i.test(txHash)) {
    throw new Error('Некорректный хеш транзакции')
  }
  const config = getPaymentConfig()
  const provider = new JsonRpcProvider(config.rpcUrl)
  try {
    if ((await provider.getNetwork()).chainId !== BigInt(config.chainId)) {
      throw new Error('Неверная сеть RPC')
    }
    const receipt = await provider.waitForTransaction(txHash, 2, 60_000)
    if (!receipt || receipt.status !== 1) {
      throw new Error(
        'Транзакция ещё не подтверждена или завершилась ошибкой. Повторите проверку позже.',
      )
    }
    const abi = new Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ])
    let units = 0n
    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() !== config.usdtContractAddress.toLowerCase()
      ) {
        continue
      }
      const transfer = abi.parseLog(log)
      if (
        transfer?.name === 'Transfer' &&
        String(transfer.args.from).toLowerCase() === sender.toLowerCase() &&
        String(transfer.args.to).toLowerCase() ===
          config.recipientAddress.toLowerCase()
      ) {
        units += BigInt(transfer.args.value)
      }
    }
    if (units > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('Слишком большая сумма')
    }
    const amount = Number(units) / 1e6
    validateAmount(amount)
    return amount
  } finally {
    provider.destroy()
  }
}
