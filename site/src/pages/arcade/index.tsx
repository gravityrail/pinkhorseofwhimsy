import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

interface GameCard {
  title: string;
  author: string;
  description: string;
  type: '2D' | '3D';
  // Path to the game's index.html inside /static/arcade/games/<slug>/
  slug: string;
  screenshot?: string;
}

// Add student games here as they are exported from GDevelop.
// Place each game's web export in: site/static/arcade/games/<slug>/
// The game should have an index.html at its root.
const GAMES: GameCard[] = [
  // Example entry (uncomment and modify when games are ready):
  // {
  //   title: 'Super Jump Quest',
  //   author: 'Student Name',
  //   description: 'A fast-paced platformer where you collect stars and dodge enemies!',
  //   type: '2D',
  //   slug: 'super-jump-quest',
  //   screenshot: '/arcade/games/super-jump-quest/screenshot.png',
  // },
];

function GameCardComponent({ game }: { game: GameCard }) {
  const screenshotUrl = useBaseUrl(game.screenshot || '');
  const playUrl = useBaseUrl(`/arcade/games/${game.slug}/`);
  return (
    <div style={{
      border: '2px solid var(--ifm-color-primary)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      backgroundColor: 'var(--ifm-card-background-color)',
    }}>
      {game.screenshot && (
        <img
          src={screenshotUrl}
          alt={`Screenshot of ${game.title}`}
          style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }}
        />
      )}
      <h3 style={{ margin: '0 0 0.25rem 0' }}>{game.title}</h3>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.7 }}>
        by {game.author} | {game.type} Game
      </p>
      <p style={{ margin: '0 0 1rem 0' }}>{game.description}</p>
      <a
        href={playUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '0.5rem 1.5rem',
          backgroundColor: 'var(--ifm-color-primary)',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
        }}
      >
        Play Now
      </a>
    </div>
  );
}

export default function Arcade() {
  return (
    <Layout title="Grass Valley Arcade" description="Play games made by Grass Valley Charter School students!">
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <img
          src={useBaseUrl('/img/arcade-header.png')}
          alt="The Grass Valley Arcade"
          style={{ width: '100%', borderRadius: '12px', marginBottom: '1.5rem' }}
        />
        <h1>The Grass Valley Arcade</h1>
        <p style={{ fontSize: '1.2rem' }}>
          Welcome to the Grass Valley Charter Arcade! These games were designed, built, and
          published by students in the Game Design & Programming Club (Spring 2026).
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
          <Link
            to="/docs/curriculum/"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--ifm-color-primary)',
              textDecoration: 'none',
            }}
          >
            View Curriculum
          </Link>
          <Link
            to="/docs/worksheets/"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--ifm-color-primary)',
              textDecoration: 'none',
            }}
          >
            Download Worksheets
          </Link>
          <Link
            to="/docs/resources/"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--ifm-color-primary)',
              textDecoration: 'none',
            }}
          >
            Resources
          </Link>
        </div>

        {GAMES.length > 0 ? (
          <>
            <h2>2D Games</h2>
            {GAMES.filter(g => g.type === '2D').map(game => (
              <GameCardComponent key={game.slug} game={game} />
            ))}

            <h2>3D Games</h2>
            {GAMES.filter(g => g.type === '3D').map(game => (
              <GameCardComponent key={game.slug} game={game} />
            ))}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            border: '2px dashed var(--ifm-color-primary)',
            borderRadius: '12px',
            margin: '2rem 0',
          }}>
            <h2>Coming Soon!</h2>
            <p style={{ fontSize: '1.1rem' }}>
              Games will appear here as students export and publish them during Weeks 4, 7, and 8.
            </p>
            <p>
              To add a game, export it from GDevelop as a web build and place the files in{' '}
              <code>site/static/arcade/games/your-game-name/</code>
            </p>
          </div>
        )}

        <hr />

        <h2>How to Publish Your Game</h2>
        <ol>
          <li><strong>Export from GDevelop:</strong> File &rarr; Export &rarr; Web (upload online)</li>
          <li><strong>Download the build:</strong> Save the exported ZIP file</li>
          <li><strong>Unzip</strong> into <code>site/static/arcade/games/your-game-name/</code></li>
          <li><strong>Add your game</strong> to the GAMES array in <code>site/src/pages/arcade/index.tsx</code></li>
          <li><strong>Rebuild the site</strong> and your game appears in the Arcade!</li>
        </ol>
      </main>
    </Layout>
  );
}
