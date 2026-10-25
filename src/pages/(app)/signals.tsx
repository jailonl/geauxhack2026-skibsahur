// "/signals" — the Signal map now lives only on the welcome page, so this old address sends you there.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SignalsPage() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/#delays', { replace: true })
  }, [navigate])
  return null
}
