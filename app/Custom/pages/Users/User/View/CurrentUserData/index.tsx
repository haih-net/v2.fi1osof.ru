import type { MeUserFragment } from 'app/gql/generated'
import { Wallet, MessageCircle } from 'lucide-react'
import { CurrentUserDataRowStyled, CurrentUserDataStyled } from './styles'
import { MetaMaskAuth } from 'app/Custom/components/Auth/MetaMaskAuth'
import { TelegramAuthForm } from 'app/Custom/components/TelegramAuthForm'
import { Balance } from './Balance'
import { Transactions } from './Transactions'

export const CurrentUserData: React.FC<{ currentUser: MeUserFragment }> = ({
  currentUser,
}) => {
  const { EthAccount, TelegramAccount } = currentUser
  return (
    <CurrentUserDataStyled>
      <h2>Подключённые аккаунты</h2>
      <p className="section-description">
        Привяжите аккаунт для дополнительного способа входа.
      </p>
      <CurrentUserDataRowStyled>
        <span className="account-icon">
          <Wallet size={22} aria-hidden="true" />
        </span>
        <div className="account-copy">
          <strong>MetaMask</strong>
          <span>{EthAccount?.address || 'Кошелёк не привязан'}</span>
        </div>
        {EthAccount ? (
          <span className="connected">Подключён</span>
        ) : (
          <MetaMaskAuth mode="link" referrerToken={null} />
        )}
      </CurrentUserDataRowStyled>
      {process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME && (
        <CurrentUserDataRowStyled>
          <span className="account-icon">
            <MessageCircle size={22} aria-hidden="true" />
          </span>
          <div className="account-copy">
            <strong>Telegram</strong>
            <span>
              {TelegramAccount?.username
                ? `@${TelegramAccount.username}`
                : TelegramAccount
                  ? 'Аккаунт привязан'
                  : 'Аккаунт не привязан'}
            </span>
          </div>
          {TelegramAccount ? (
            <span className="connected">Подключён</span>
          ) : (
            <TelegramAuthForm buttonSize="small" referrerToken={null} />
          )}
        </CurrentUserDataRowStyled>
      )}
      <Balance currentUser={currentUser} />
      <Transactions />
    </CurrentUserDataStyled>
  )
}
