import React, { useCallback, useState } from 'react'
import {
  GetReferrerTokenRowStyled,
  GetReferrerTokenStyled,
  GetReferrerTokenTextStyled,
} from './styles'
import { Button } from 'app/Custom/components/Button'
import { useCreateReferrerTokenMutation } from 'app/gql/generated'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { useCopy } from 'app/Custom/hooks/useCopy'
import { GET_PARAM_REFERRERTOKEN_NAME } from 'app/Custom/components/Auth/SignUpForm/interfaces'

export const GetReferrerToken: React.FC = () => {
  const { addMessage } = useSnackbar() || {}

  const [token, tokenSetter] = useState<string>()

  const [mutation, { loading }] = useCreateReferrerTokenMutation()

  const onClickGetToken = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()

      mutation()
        .then((r) => {
          if (r.data?.createReferrerToken) {
            tokenSetter(r.data?.createReferrerToken)
          } else {
            addMessage?.('Can not get token', {
              variant: 'error',
            })
          }
        })
        .catch((error: Error) => {
          addMessage?.(error.message || 'Unknown error', {
            variant: 'error',
          })
        })
    },
    [addMessage, mutation],
  )

  const { onClickCopy } = useCopy()

  return (
    <GetReferrerTokenStyled>
      <h2>Приглашения</h2>
      <p className="section-description">
        Создайте ссылку, чтобы пригласить нового участника.
      </p>
      <div>
        <Button onClick={onClickGetToken} disabled={loading}>
          Создать приглашение
        </Button>
      </div>

      {token && (
        <GetReferrerTokenRowStyled>
          <GetReferrerTokenTextStyled>{token}</GetReferrerTokenTextStyled>
          <Button variant="secondary" onClick={onClickCopy} value={token}>
            Скопировать токен
          </Button>
          <Button
            variant="secondary"
            onClick={onClickCopy}
            value={`${window.location.origin}/signup?${GET_PARAM_REFERRERTOKEN_NAME}=${token}`}
          >
            Скопировать ссылку
          </Button>
        </GetReferrerTokenRowStyled>
      )}
    </GetReferrerTokenStyled>
  )
}
