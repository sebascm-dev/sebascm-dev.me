import { NextResponse } from 'next/server';
import { buildDailyPoints, heroHistoryWindow, heroWindow } from '@/lib/github/hero';
import { fetchHeroCommits } from '@/lib/github/queries';

export const revalidate = 3600;

/**
 * Daily rolling 30-day real-commit activity for the public hero graph.
 * Includes private repo names on purpose: the owner wants every repo labelled.
 */
export async function GET() {
  try {
    const window = heroWindow();
    const { commits, repoCreations } = await fetchHeroCommits(heroHistoryWindow(window));
    return NextResponse.json({ points: buildDailyPoints(commits, repoCreations, window) });
  } catch (error) {
    console.error('GitHub hero activity error:', error);
    return NextResponse.json({ points: [] }, { status: 500 });
  }
}
