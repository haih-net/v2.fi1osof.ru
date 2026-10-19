import React, { useCallback, useState, useRef, useId } from 'react'
import {
  MeUserFragment,
  UserFragment,
  useCreateTransferMutation,
} from 'app/gql/generated'
import {
  SendTransferStyled,
  SendTransferHeaderStyled,
  SendTransferFormStyled,
  SendTransferFieldStyled,
  SendTransferLabelStyled,
  SendTransferInputStyled,
  SendTransferActionsStyled,
  SendTransferErrorStyled,
  SendTransferSuccessStyled,
} from './styles'
import { Button } from 'app/Custom/components/Button'
import { Balance } from '../CurrentUserData/Balance'
import { transactionsRefreshQueriesList } from '../CurrentUserData/Transactions/interfaces'

type SendTransferProps = {
  currentUser: MeUserFragment
  recipient: UserFragment
}

export const SendTransfer: React.FC<SendTransferProps> = ({
  currentUser,
  recipient,
}) => {
  const pending = useRef(false)
  const id = useId()
  const balance = currentUser.Balance

  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [createTransfer, { loading }] = useCreateTransferMutation()

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault()
      if (pending.current) {
        return
      }
      setError(null)
      setSuccess(null)

      const amountNum = parseFloat(amount)
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        setError('Enter a valid amount')
        return
      }

      const currentBalance = currentUser?.Balance?.amount ?? 0
      if (amountNum > currentBalance) {
        setError('Insufficient funds')
        return
      }

      if (!recipient.id) {
        setError('Invalid recipient')
        return
      }

      const confirm = window.confirm(`Send transfer for ${amountNum} coins?`)

      if (!confirm) {
        return
      }

      pending.current = true
      try {
        const result = await createTransfer({
          variables: {
            data: {
              toUserId: recipient.id,
              amount: amountNum,
              title: title || null,
            },
          },
          refetchQueries: transactionsRefreshQueriesList,
        })

        if (result.data?.createTransfer) {
          setSuccess(`Successfully sent ${amountNum} Coins!`)
          setAmount('')
          setTitle('')
        }
      } catch (err) {
        setError((err as Error).message || 'Transfer failed')
      } finally {
        pending.current = false
      }
    },
    [amount, title, recipient.id, currentUser?.Balance?.amount, createTransfer],
  )

  const onChangeAmount = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value)
      setError(null)
      setSuccess(null)
    },
    [],
  )

  const onChangeTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value)
    },
    [],
  )

  const recipientName = recipient.fullname || recipient.username || 'User'

  return process.env.NEXT_PUBLIC_CRYPTO_ENABLED === 'true' && balance ? (
    <SendTransferStyled>
      <Balance currentUser={currentUser} />

      <SendTransferHeaderStyled>Send transfer to user</SendTransferHeaderStyled>

      <SendTransferFormStyled onSubmit={handleSubmit}>
        <SendTransferFieldStyled>
          <SendTransferLabelStyled htmlFor={`${id}-recipient`}>
            To
          </SendTransferLabelStyled>
          <SendTransferInputStyled
            id={`${id}-recipient`}
            type="text"
            value={recipientName}
            disabled
          />
        </SendTransferFieldStyled>

        <SendTransferFieldStyled>
          <SendTransferLabelStyled htmlFor={`${id}-amount`}>
            Amount (Coins)
          </SendTransferLabelStyled>
          <SendTransferInputStyled
            id={`${id}-amount`}
            type="number"
            placeholder="0"
            value={amount}
            onChange={onChangeAmount}
            disabled={loading}
            min="0"
            step="0.000001"
          />
        </SendTransferFieldStyled>

        <SendTransferFieldStyled>
          <SendTransferLabelStyled htmlFor={`${id}-title`}>
            Comment (optional)
          </SendTransferLabelStyled>
          <SendTransferInputStyled
            id={`${id}-title`}
            type="text"
            placeholder="What is this transfer for?"
            value={title}
            onChange={onChangeTitle}
            disabled={loading}
          />
        </SendTransferFieldStyled>

        {error && <SendTransferErrorStyled>{error}</SendTransferErrorStyled>}
        {success && (
          <SendTransferSuccessStyled>{success}</SendTransferSuccessStyled>
        )}

        <SendTransferActionsStyled>
          <Button type="submit" disabled={loading || !amount}>
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </SendTransferActionsStyled>
      </SendTransferFormStyled>
    </SendTransferStyled>
  ) : null
}
