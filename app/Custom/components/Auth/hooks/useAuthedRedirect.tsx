import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAppContext } from '../../../hooks/useAppContext'

export function useAuthedRedirect(redirectTo?: string): void {
  const navigate = useNavigate()
  const { user, userLoading = true } = useAppContext() ?? {}

  useEffect(() => {
    if (redirectTo && user && !userLoading) {
      void navigate(redirectTo, { replace: true })
    }
  }, [user, userLoading, navigate, redirectTo])
}
