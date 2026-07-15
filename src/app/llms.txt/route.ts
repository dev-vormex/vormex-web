import { SITE_URL } from '@/lib/seo';

export function GET(): Response {
  const body = `# Vormex

> Vormex is a public people-discovery and collaboration network for students, learners, creators, mentors, and builders.

## Canonical website
- ${SITE_URL}/

## Public collections
- People directory: ${SITE_URL}/people
- Skill pages: ${SITE_URL}/skills/{skill}
- Interest pages: ${SITE_URL}/interests/{interest}
- Public member profiles: ${SITE_URL}/people/{username}

## Live AI discovery
- MCP endpoint: https://vormex-backend.onrender.com/mcp
- OpenAPI document: https://vormex-backend.onrender.com/api/public/discovery/openapi.json

Only public, eligible profile fields are returned. Private messages, contact data, email addresses, phone numbers, precise location, and private activity are never part of public discovery.
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
