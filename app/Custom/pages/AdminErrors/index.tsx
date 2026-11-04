import type React from 'react'
import { Link } from 'react-router'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { AdminErrorsStyled } from './styles'
import { ErrorList } from './ErrorList'

export const AdminErrorsPage: React.FC = () => {
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <AdminErrorsStyled>
      <h1 tabIndex={-1}>Page errors</h1>
      {userLoading ? (
        <p role="status">Checking access…</p>
      ) : user?.sudo === true ? (
        <>
          <nav>
            <Link to="/admin-panel">← Admin</Link>
          </nav>
          <ErrorList />
        </>
      ) : (
        <p>
          Administrator access required.{' '}
          {!user && <Link to="/signin">Sign in</Link>}
        </p>
      )}
    </AdminErrorsStyled>
  )
}
