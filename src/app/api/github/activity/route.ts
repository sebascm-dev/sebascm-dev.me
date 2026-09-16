import { NextResponse } from 'next/server';
import { buildWeeklyPoints, heroWindow } from '@/lib/github/hero';
import { fetchHeroCommits } from '@/lib/github/queries';

export const revalidate = 3600;

/**
 * Weekly real-commit activity for the public hero graph.
 * Points are built on the server so private repo names never reach the browser.
 */
export async function GET() {
  try {
    const window = heroWindow();
    const { commits, repoCreations } = await fetchHeroCommits(window);
    return NextResponse.json({ points: buildWeeklyPoints(commits, repoCreations, window) });
  } catch (error) {
    console.error('GitHub hero activity error:', error);
    return NextResponse.json({ points: [] }, { status: 500 });
  }
}
