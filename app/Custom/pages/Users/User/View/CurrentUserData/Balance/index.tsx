import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Interface, parseUnits, toUtf8Bytes, hexlify } from 'ethers'
import {
  MeUserFragment,
  useRequestTopUpMutation,
  useTopUpBalanceMutation,
  type TopUpBalanceInput,
} from 'app/gql/generated'
import {
  BalanceStyled,
  BalanceAmountStyled,
  BalanceFormStyled,
  BalanceInputStyled,
  BalanceAddressStyled,
  BalanceStatusStyled,
} from './styles'
import { Button } from 'app/Custom/components/Button'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { transactionsRefreshQueriesList } from '../Transactions/interfaces'
import { MetaMaskAuth } from 'app/Custom/components/Auth/MetaMaskAuth'

export const Balance: React.FC<{ currentUser: MeUserFragment }> = ({
  currentUser,
}) => {
  const ethAccount = currentUser.EthAccount
  const { addMessage } = useSnackbar() ?? {}
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [payment, setPayment] = useState<TopUpBalanceInput | null>(null)
  const busy = useRef(false)
  const storageKey = `pendingTopUp:${currentUser.id}`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const saved: unknown = raw ? JSON.parse(raw) : null
      if (
        saved &&
        typeof saved === 'object' &&
        'txHash' in saved &&
        typeof saved.txHash === 'string' &&
        'message' in saved &&
        typeof saved.message === 'string' &&
        'signature' in saved &&
        typeof saved.signature === 'string'
      ) {
        setPayment({
          txHash: saved.txHash,
          message: saved.message,
          signature: saved.signature,
        })
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Не удалось восстановить платёж',
      )
    }
  }, [storageKey])
  const [requestTopUp] = useRequestTopUpMutation()
  const [topUpBalance] = useTopUpBalanceMutation({
    refetchQueries: transactionsRefreshQueriesList,
  })
  const handleTopUp = useCallback(async (): Promise<void> => {
    if (busy.current) {
      return
    }
    busy.current = true
    setLoading(true)
    try {
      let data = payment
      {
        const provider = window.ethereum
        if (!provider?.isMetaMask) {
          throw new Error('MetaMask is not installed')
        }
        if (
          !data &&
          (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0)
        ) {
          throw new Error('Enter a valid amount')
        }
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        })
        if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
          throw new Error('No accounts found')
        }
        const userAddress = accounts[0]
        if (userAddress.toLowerCase() !== ethAccount?.address?.toLowerCase()) {
          throw new Error('Connected wallet does not match your account')
        }
        const result = await requestTopUp()
        const offer = result.data?.requestTopUp
        if (!offer) {
          throw new Error('Failed to get top-up request')
        }
        const chain = await provider.request({ method: 'eth_chainId' })
        if (!data && Number(chain) !== offer.chainId) {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${offer.chainId.toString(16)}` }],
          })
        }
        const signature = await provider.request({
          method: 'personal_sign',
          params: [hexlify(toUtf8Bytes(offer.message)), userAddress],
        })
        if (typeof signature !== 'string') {
          throw new Error('Invalid signature')
        }
        const abi = new Interface([
          'function transfer(address to, uint256 amount) returns (bool)',
        ])
        const txHash =
          data?.txHash ??
          (await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: userAddress,
                to: offer.usdtContractAddress,
                data: abi.encodeFunctionData('transfer', [
                  offer.recipientAddress,
                  parseUnits(amount, 6),
                ]),
              },
            ],
          }))
        if (typeof txHash !== 'string') {
          throw new Error('Invalid transaction hash')
        }
        data = { txHash, message: offer.message, signature }
        setPayment(data)
        localStorage.setItem(storageKey, JSON.stringify(data))
      }
      setStatus(`Проверяем платёж ${data.txHash}`)
      const result = await topUpBalance({ variables: { data } })
      if (!result.data?.topUpBalance) {
        throw new Error('Top-up failed')
      }
      localStorage.removeItem(storageKey)
      setPayment(null)
      setAmount('')
      setStatus('Balance successfully topped up!')
      addMessage?.('Balance successfully topped up!', { variant: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Top-up failed'
      setStatus(message)
      addMessage?.(message, { variant: 'error' })
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [
    amount,
    ethAccount?.address,
    payment,
    requestTopUp,
    topUpBalance,
    addMessage,
    storageKey,
  ])
  const onChangeAmount = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setAmount(event.target.value),
    [],
  )
  return process.env.NEXT_PUBLIC_CRYPTO_ENABLED === 'true' ? (
    <BalanceStyled>
      {ethAccount && (
        <BalanceAddressStyled>{ethAccount.address}</BalanceAddressStyled>
      )}
      <BalanceAmountStyled>
        Your balance: {currentUser.Balance?.amount ?? 0} Coins
      </BalanceAmountStyled>
      {ethAccount ? (
        <BalanceFormStyled>
          <BalanceInputStyled
            type="number"
            aria-label="USDT amount"
            placeholder="USDT amount"
            value={amount}
            onChange={onChangeAmount}
            disabled={loading || Boolean(payment)}
            min="0.000001"
            step="0.000001"
          />
          <Button
            type="button"
            onClick={handleTopUp}
            disabled={loading || (!amount && !payment)}
          >
            {loading
              ? 'Processing...'
              : payment
                ? 'Повторить проверку'
                : 'Top up'}
          </Button>
        </BalanceFormStyled>
      ) : (
        <>
          <p>Connect MetaMask to be able to top up your balance</p>
          <MetaMaskAuth mode="link" referrerToken={null} />
        </>
      )}
      {payment && (
        <BalanceAddressStyled>
          Платёж отправлен: {payment.txHash}
        </BalanceAddressStyled>
      )}
      {status && (
        <BalanceStatusStyled role="status">{status}</BalanceStatusStyled>
      )}
    </BalanceStyled>
  ) : null
}
