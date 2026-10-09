const paths: Record<string, string> = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  announcements: 'm3 10 15-5v14L3 14Zm2 4 2 7h4l-2-5M21 9v6',
  packages: 'm3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5M12 12v9M7 5l10 5',
  visitors: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-3 2 2 3-3',
  'access-logs': 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6',
  tickets: 'M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 4-4-4Z',
  providers: 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 7h18v14H3ZM3 12h18M10 12v3h4v-3',
  evidences: 'M4 6h4l2-3h4l2 3h4v15H4ZM16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0',
  'common-areas': 'M3 21V7l9-4 9 4v14M3 11h18M8 7v14M16 7v14',
  reservations: 'M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2',
  polls: 'M4 21V11h4v10M10 21V3h4v18M16 21V7h4v14',
  finance: 'M12 3v18M17 7h-7a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H6',
  categories: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  notifications: 'M6 9a6 6 0 0 1 12 0v6l3 3H3l3-3ZM10 21h4',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l4 2',
  profile: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2',
  users: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2',
};

export function ModuleIcon({ name }: { name: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name] ?? paths.home} />
  </svg>;
}
