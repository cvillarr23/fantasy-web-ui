/** A team's logo, or its initials when ESPN has none. Decorative: the name is always beside it. */
export function TeamLogo({ name, url }: { name: string; url: string }) {
  if (url) return <img src={url} alt="" width={40} height={40} className="matchup-team-logo" />
  const initials = name.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  return <span className="matchup-team-logo matchup-team-logo-fallback" aria-hidden="true">{initials}</span>
}
