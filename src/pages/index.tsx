/**
 * Landing page — a STATIC page (no DeepSpace providers), prerendered for crawlers.
 * Visitors are sent straight to the feed (/home) in the browser; the text and link below
 * are what crawlers and no-JavaScript visitors see.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

export default function Landing() {
  // Runs only in the browser (never during prerender), so the static HTML stays intact.
  useEffect(() => {
    window.location.replace('/home')
  }, [])

  return (
    <>
      <Seo {...seo} path="/" />
      <div
        data-testid="static-landing"
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">{APP_NAME}</p>
        <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          The social network for life beyond Earth
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Post from Mars, message the Moon with real light-delay, and trade notes on your planet's forum.
        </p>
        <Link
          to="/home"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open the colony feed
        </Link>
      </div>
    </>
  )
}
