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
  // Optional: a direct URL for standalone games that live elsewhere in /static/
  href?: string;
  screenshot?: string;
}

// Games are built from ./games/ directory via `node build-games.mjs`
// and output to site/static/arcade/games/<slug>/
const GAMES: GameCard[] = [
  {
    title: 'Bean Quiz',
    author: 'Pink Horse of Whimsy',
    description: 'A bouncy quiz show for 1-5 players, hosted by The Bean (a mohawked chihuahua-terrier) and her sly sidekick Tiger the cat — with real voices and a fabulous 80s box-art splash! Get a silly name like "Goopy Pine", then pick from a growing pile of topics: brand-new 80s Arcade, Pink Horse Whimsy, and Space Odyssey packs plus Minecraft, rockets, Lego, robots, trick math, jokes, and more. Tap-friendly — perfect for long car trips.',
    type: '2D',
    slug: 'bean-quiz',
    href: '/bean-quiz/',
  },
  {
    title: 'Worm',
    author: 'Pink Horse of Whimsy',
    description: 'Burrow through the earth as a 6-segment worm, gobbling treasure across an endless tunnelling world. Dodge the giant birds! Touch-friendly — great on a tablet or car display.',
    type: '2D',
    slug: 'worm',
    href: '/worm/',
  },
  {
    title: 'The Alien from Mars',
    author: 'Pink Horse of Whimsy',
    description: 'Pilot a Martian saucer over an endless countryside: beam up cows, chickens, sheep and pigs and mutate them into a rampaging entourage — two-headed fire-breathing steaks, karate pigs, lightning clouds and worse. Outrun the army, and don\'t over-feed your mutants or they blow up into lava!',
    type: '2D',
    slug: 'alien-from-mars',
  },
  {
    title: 'Pinball',
    author: 'Pink Horse of Whimsy',
    description: 'A physics pinball table built with three.js — flippers, ramps, bumpers and a tilted dot-matrix scoreboard. Insert a coin and rack up a million-point bonus.',
    type: '3D',
    slug: 'pinball',
    href: '/pinball/',
  },
  {
    title: 'Indigo Kart',
    author: 'Pink Horse of Whimsy',
    description: 'A pint-sized 3D kart racer with a classic box-art splash. Drift around the track, grab items, and chase the best lap — touch and gamepad friendly.',
    type: '3D',
    slug: 'indigokart',
    href: '/indigokart/',
  },
  {
    title: 'Indigo Kart v2',
    author: 'Pink Horse of Whimsy',
    description: 'A ground-up rebuild of the kart racer in Three.js — seven circuits including Candy Canyon’s gumdrop gorge, a sunset island, neon night city, orbital rainbow ring, present-day and 1892 Grass Valley, and a kangaroo-lined outback highway. Four karts (including Sugar Pop), turbo and repair pickups, sprung four-wheel physics, and a soundtrack per track. Touch and gamepad friendly.',
    type: '3D',
    slug: 'indigokart2',
    href: '/indigokart2/',
  },
  {
    title: 'Bean Simulator',
    author: 'Pink Horse of Whimsy',
    description: 'A first-person romp as "Little Bean", a small fluffy dog exploring a cozy house — now with a warm box-art splash before you dive in. Built with Babylon.js; works in the browser and on WebXR headsets. Touch + gamepad friendly.',
    type: '3D',
    slug: 'bean-simulator',
    href: '/bean-simulator/',
  },
  {
    title: 'Chickencraft',
    author: 'Pink Horse of Whimsy',
    description: 'A Minecraft-inspired voxel building world with a heroic chicken splash screen. Mine, place blocks, and build whatever you like. Made with TypeScript and Babylon.js — on-screen controls for tablet play.',
    type: '3D',
    slug: 'chickencraft',
    href: '/chickencraft/',
  },
  {
    title: 'Vibekart',
    author: 'Pink Horse of Whimsy',
    description: 'A synthwave 3D kart racer with procedurally generated tracks and a neon vaporwave splash — every race is a brand-new circuit. Touch and gamepad ready.',
    type: '3D',
    slug: 'vibekart',
    href: '/vibekart/',
  },
  {
    title: 'Space Bean',
    author: 'Pink Horse of Whimsy',
    description: 'A cinematic 3D rail shooter — a Star Fox–style adventure starring Space Bean, defender of the Galactic Bean-O-Phone. Four missions culminating in “Bean There, Done That”: crash TigerTron’s asteroid carnival and defeat a giant evil coffee grinder. Cutscenes, voice-over, and bloom-lit space combat. Drag or point to steer, tap or press Space to fire.',
    type: '3D',
    slug: 'space-bean',
    href: '/space-bean/',
  },
  {
    title: 'Coin Collector',
    author: 'Pink Horse of Whimsy',
    description: 'Jump, climb, and loot across 3 vertical levels. Grab keys, unlock doors, hunt secret gems, and race the flag — touch-friendly platforming with score popups and chiptune vibes.',
    type: '2D',
    slug: 'coin-collector',
  },
  {
    title: 'Platform Runner',
    author: 'Pink Horse of Whimsy',
    description: 'Dash through 3 action stages: stomp slimes, dodge bats and spike pits, ride moving platforms, and take down a boss slime. Lives, checkpoints, and controller/touch support.',
    type: '2D',
    slug: 'platform-runner',
  },
  {
    title: 'Maze Explorer',
    author: 'Pink Horse of Whimsy',
    description:
      'Wolfenstein-style dungeon FPS — blast beholders and gargoyles, loot gems, unlock doors. Touch FIRE supported.',
    type: '3D',
    slug: 'maze-explorer',
  },
];

function GameCardComponent({ game }: { game: GameCard }) {
  const screenshotUrl = useBaseUrl(game.screenshot || '');
  const playUrl = useBaseUrl(game.href || `/arcade/games/${game.slug}/`);
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
    <Layout title="Pink Horse Arcade" description="Play games made at Pink Horse of Whimsy!">
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <img
          src={useBaseUrl('/img/arcade-header.png')}
          alt="The Pink Horse Arcade"
          style={{ width: '100%', borderRadius: '12px', marginBottom: '1.5rem' }}
        />
        <h1>The Pink Horse Arcade</h1>
        <p style={{ fontSize: '1.2rem' }}>
          Welcome to the Pink Horse Arcade! A growing collection of homemade browser games.
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
