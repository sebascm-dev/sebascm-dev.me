import { NextResponse } from 'next/server';

/** Formas parciales de la respuesta GraphQL de GitHub que realmente consumimos */
interface ContributionDay {
  date: string;
  contributionCount: number;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface RepositoryNode {
  name: string;
  createdAt: string;
  url: string;
  defaultBranchRef?: {
    target?: {
      history?: { totalCount?: number };
    };
  };
}

export const revalidate = 3600;

export async function GET() {
  const username = 'sebascm-dev';
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'No GITHUB_TOKEN configured' }, { status: 500 });
  }

  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // Traemos el calendario Y los repositorios creados en el último año
  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
        repositories(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            name
            createdAt
            url
            defaultBranchRef {
              target {
                ... on Commit {
                  history {
                    totalCount
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'sebascm-portfolio'
      },
      body: JSON.stringify({
        query,
        variables: { username, from, to }
      })
    });

    const result = await response.json();
    
    if (!result.data?.user) {
      console.error('GitHub GraphQL fatal error:', JSON.stringify(result.errors ?? result, null, 2));
      return NextResponse.json({ error: 'GitHub GraphQL error', details: result.errors }, { status: 500 });
    }
    // Errores parciales (ej. repos privados sin permiso) — los ignoramos, los datos siguen llegando

    const userData = result.data.user;
    
    const history = userData.contributionsCollection.contributionCalendar.weeks
      .flatMap((week: ContributionWeek) => week.contributionDays)
      .map((day: ContributionDay) => ({
        date: day.date,
        count: day.contributionCount
      }));

    const repos = userData.repositories.nodes
      .filter((repo: RepositoryNode) => new Date(repo.createdAt) >= new Date(from))
      .map((repo: RepositoryNode) => ({
        name: repo.name,
        createdAt: repo.createdAt,
        url: repo.url,
        totalCommits: repo.defaultBranchRef?.target?.history?.totalCount ?? 0,
      }));

    return NextResponse.json({ history, repos });
  } catch {
    return NextResponse.json({ history: [], repos: [] }, { status: 500 });
  }
}
