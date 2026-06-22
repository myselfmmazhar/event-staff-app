// Server wrapper: render on-demand instead of statically prerendering at build.
// The page is fully client-driven and auth-gated, so static generation provides
// no benefit and triggers a React prerender crash in Amplify's Linux build
// environment. force-dynamic skips build-time static generation.
export const dynamic = 'force-dynamic';

import CatalogRequirementsPage from './requirements-client';

export default function Page() {
  return <CatalogRequirementsPage />;
}
