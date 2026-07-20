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
  /** 1980s box-art splash under /arcade/splashes/ */
  cover?: string;
  /** Optional gameplay screenshot (side-by-side with cover when both set) */
  screenshot?: string;
}

// Games are built from ./games/ directory via `node build-games.mjs`
// and output to site/static/arcade/games/<slug>/
const GAMES: GameCard[] = [
  {
    title: 'Bean Quiz',
    author: 'Pink Horse of Whimsy',
    description:
      'A bouncy quiz show for 1–5 players, hosted by The Bean (mohawked chihuahua-terrier) and Tiger the cat — with real voices and 80s box-art splash. Silly names, brand-new 80s Arcade / Whimsy / Space Odyssey packs plus Minecraft, rockets, Lego, robots, trick math, and jokes. Perfect for car trips.',
    type: '2D',
    slug: 'bean-quiz',
    href: '/bean-quiz/',
    cover: '/arcade/splashes/bean-quiz.png',
  },
  {
    title: 'Worm',
    author: 'Pink Horse of Whimsy',
    description:
      'Burrow through dirt, clay, crystal caves, magma tunnels, and moon soil as a cheerful multi-segment worm. Gobble treasure, dodge dive-bombing birds, crack secret rune rooms, and chase combos across an endless tunnelling world. Touch-first — great on a tablet or car display.',
    type: '2D',
    slug: 'worm',
    href: '/worm/',
    cover: '/arcade/splashes/worm.png',
  },
  {
    title: 'The Alien from Mars',
    author: 'Pink Horse of Whimsy',
    description:
      'Pilot a Martian saucer over an endless countryside: beam up livestock, mutate them into a rampaging entourage (fire-steaks, karate pigs, disco cows, laser chickens…), complete silly mission tickers, and outrun the escalating army — helicopters, robot farmers, and worse. Don’t over-feed your mutants or they blow into lava!',
    type: '2D',
    slug: 'alien-from-mars',
    cover: '/arcade/splashes/alien-from-mars.png',
  },
  {
    title: 'Pinball',
    author: 'Pink Horse of Whimsy',
    description:
      'A physics pinball table with neon inserts, animated DMD, missions, multiball, and a surprise Pink Horse mode. Huge on-screen flippers and plunger for tablet play — insert a coin and chase the million-point bonus.',
    type: '3D',
    slug: 'pinball',
    href: '/pinball/',
    cover: '/arcade/splashes/pinball.png',
  },
  {
    title: 'Indigo Kart',
    author: 'Pink Horse of Whimsy',
    description:
      'A pint-sized 3D kart racer with classic box-art splash. Drift the loop, grab items, and chase the best lap — touch and gamepad friendly.',
    type: '3D',
    slug: 'indigokart',
    href: '/indigokart/',
    cover: '/arcade/splashes/indigokart.png',
  },
  {
    title: 'Indigo Kart v2',
    author: 'Pink Horse of Whimsy',
    description:
      'A ground-up Three.js rebuild — seven circuits including Candy Canyon, sunset island, neon night city, orbital rainbow ring, present-day and 1892 Grass Valley, and a kangaroo-lined outback highway. Four karts (including Sugar Pop), turbo and repair pickups, sprung four-wheel physics, and a soundtrack per track.',
    type: '3D',
    slug: 'indigokart2',
    href: '/indigokart2/',
    cover: '/arcade/splashes/indigokart2.png',
  },
  {
    title: 'Bean Simulator',
    author: 'Pink Horse of Whimsy',
    description:
      'A first-person romp as Little Bean, a small fluffy dog exploring a cozy house — warm box-art splash, then Babylon.js freedom (browser + WebXR). Touch and gamepad friendly.',
    type: '3D',
    slug: 'bean-simulator',
    href: '/bean-simulator/',
    cover: '/arcade/splashes/bean-simulator.png',
  },
  {
    title: 'Chickencraft',
    author: 'Pink Horse of Whimsy',
    description:
      'A Minecraft-inspired voxel world starring a heroic chicken. Mine, place blocks, and build whatever you like — on-screen controls for tablet play and a bold box-art splash.',
    type: '3D',
    slug: 'chickencraft',
    href: '/chickencraft/',
    cover: '/arcade/splashes/chickencraft.png',
  },
  {
    title: 'Vibekart',
    author: 'Pink Horse of Whimsy',
    description:
      'A synthwave 3D kart racer with procedurally generated tracks and a neon vaporwave splash — every race is a brand-new circuit. Touch and gamepad ready.',
    type: '3D',
    slug: 'vibekart',
    href: '/vibekart/',
    cover: '/arcade/splashes/vibekart.png',
  },
  {
    title: 'Space Bean',
    author: 'Pink Horse of Whimsy',
    description:
      'A cinematic Star Fox–style rail shooter starring Space Bean, defender of the Galactic Bean-O-Phone. Four missions culminating in “Bean There, Done That”: crash TigerTron’s asteroid carnival and defeat a giant evil coffee grinder. Cutscenes, voice-over, bloom-lit combat. Drag to steer, tap or Space to fire.',
    type: '3D',
    slug: 'space-bean',
    href: '/space-bean/',
    cover: '/arcade/splashes/space-bean.png',
  },
  {
    title: 'Coin Collector',
    author: 'Pink Horse of Whimsy',
    description:
      'Jump, climb, and loot across three vertical levels. Grab keys, unlock doors, hunt secret gems, and race the flag — touch-friendly platforming with score popups and chiptune vibes.',
    type: '2D',
    slug: 'coin-collector',
    cover: '/arcade/splashes/coin-collector.png',
  },
  {
    title: 'Platform Runner',
    author: 'Pink Horse of Whimsy',
    description:
      'Dash through three action stages: stomp slimes, dodge bats and spike pits, ride moving platforms, and take down a boss slime. Lives, checkpoints, and controller/touch support.',
    type: '2D',
    slug: 'platform-runner',
    cover: '/arcade/splashes/platform-runner.png',
  },
  {
    title: 'Maze Explorer',
    author: 'Pink Horse of Whimsy',
    description:
      'Wolfenstein-style dungeon FPS: roam a multi-wing labyrinth, blast the floating Beholder boss and gargoyle packs with a hitscan pistol, loot gems, unlock keyed doors, and survive the mood-lit dark. Big on-screen FIRE for tablets.',
    type: '3D',
    slug: 'maze-explorer',
    cover: '/arcade/splashes/maze-explorer.png',
  },
];

function GameCardComponent({ game }: { game: GameCard }) {
  const coverUrl = useBaseUrl(game.cover || '');
  const screenshotUrl = useBaseUrl(game.screenshot || '');
  const playUrl = useBaseUrl(game.href || `/arcade/games/${game.slug}/`);
  const hasArt = !!(game.cover || game.screenshot);

  return (
    <div
      style={{
        border: '2px solid var(--ifm-color-primary)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        backgroundColor: 'var(--ifm-card-background-color)',
      }}
    >
      {hasArt && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              game.cover && game.screenshot ? '1fr 1fr' : '1fr',
            gap: '0.75rem',
            marginBottom: '1rem',
            alignItems: 'start',
          }}
        >
          {game.cover && (
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              {/* Full box art, never cropped — painted titles stay readable */}
              <div
                style={{
                  background: '#0a0a14',
                  borderRadius: '8px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
                  lineHeight: 0,
                }}
              >
                <img
                  src={coverUrl}
                  alt={`${game.title} cover art`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: '8px',
                    verticalAlign: 'top',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.65,
                  marginTop: '0.35rem',
                  lineHeight: 1.3,
                }}
              >
                Cover art
              </div>
            </a>
          )}
          {game.screenshot && (
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: '#0a0a14',
                  borderRadius: '8px',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
                  lineHeight: 0,
                }}
              >
                <img
                  src={screenshotUrl}
                  alt={`Screenshot of ${game.title}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: '8px',
                    verticalAlign: 'top',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.65,
                  marginTop: '0.35rem',
                  lineHeight: 1.3,
                }}
              >
                Screenshot
              </div>
            </a>
          )}
        </div>
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
          Welcome to the Pink Horse Arcade! A growing collection of homemade browser games —
          each with hand-painted 80s-style cover art. Tap a cover or Play Now to jump in
          (touch and gamepad friendly).
        </p>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}
        >
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
            {GAMES.filter((g) => g.type === '2D').map((game) => (
              <GameCardComponent key={game.slug} game={game} />
            ))}

            <h2>3D Games</h2>
            {GAMES.filter((g) => g.type === '3D').map((game) => (
              <GameCardComponent key={game.slug} game={game} />
            ))}
          </>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              border: '2px dashed var(--ifm-color-primary)',
              borderRadius: '12px',
              margin: '2rem 0',
            }}
          >
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
          <li>
            <strong>Export from GDevelop:</strong> File &rarr; Export &rarr; Web (upload online)
          </li>
          <li>
            <strong>Download the build:</strong> Save the exported ZIP file
          </li>
          <li>
            <strong>Unzip</strong> into <code>site/static/arcade/games/your-game-name/</code>
          </li>
          <li>
            <strong>Add your game</strong> to the GAMES array in{' '}
            <code>site/src/pages/arcade/index.tsx</code>
          </li>
          <li>
            <strong>Rebuild the site</strong> and your game appears in the Arcade!
          </li>
        </ol>
      </main>
    </Layout>
  );
}
