import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAppContext } from '../../../hooks/useAppContext'

export function useAuthedRedirect(): void {
  const navigate = useNavigate()
  const { user, userLoading } = useAppContext()

  useEffect(() => {
    if (user && !userLoading) {
      void navigate('/', { replace: true })
    }
  }, [user, userLoading, navigate])
}
