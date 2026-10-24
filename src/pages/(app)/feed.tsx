// "/feed" moved to "/home". Kept so old links still work.
import { Navigate } from 'react-router-dom'

export default function FeedRedirect() {
  return <Navigate to="/home" replace />
}
