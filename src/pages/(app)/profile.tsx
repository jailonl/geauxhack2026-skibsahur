// "/profile" — create or edit your own profile.
import { Link } from 'react-router-dom'
import ProfileEditor from '../../features/social/ProfileEditor'
import { useMyProfile } from '../../features/social/profiles'
import { SignInPrompt } from '../../features/social/SignIn'

export default function ProfilePage() {
  const { profile, isSignedIn, loading } = useMyProfile()

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="font-display text-3xl">Your profile</h1>
      {!isSignedIn ? (
        <SignInPrompt action="create your profile" />
      ) : loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* key forces a fresh form once the profile loads */}
          <ProfileEditor key={profile?.recordId ?? 'new'} existing={profile} />
          {profile && (
            <Link to={`/u/${profile.username}`} className="text-sm text-primary hover:underline">
              View your public profile
            </Link>
          )}
        </>
      )}
    </div>
  )
}
