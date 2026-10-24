// "/chat" became "/messages". Kept so old links still work.
import { Navigate } from 'react-router-dom'

export default function ChatRedirect() {
  return <Navigate to="/messages" replace />
}
