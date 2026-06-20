import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header style={{
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
      padding: '0',
    }}>
      <img
        src={useBaseUrl('/img/hero-banner.png')}
        alt="Pink Horse of Whimsy"
        style={{ width: '100%', display: 'block' }}
      />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '2rem',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
      }}>
        <Heading as="h1" style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 0.5rem 0', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          {siteConfig.title}
        </Heading>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', margin: '0 0 1rem 0' }}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/curriculum/">
            View Curriculum
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/arcade"
            style={{ marginLeft: '1rem' }}>
            Pink Horse Arcade
          </Link>
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  {
    title: '8 Weeks of Game Design',
    description: 'From first tutorial to published game. Build 2D and 3D games using GDevelop 5.',
    link: '/docs/curriculum/',
  },
  {
    title: 'Guest Producer: Brian Lowe',
    description: '69 shipped games. From 720\u00B0 to Five Nights at Freddy\'s. Real industry insights.',
    link: '/docs/curriculum/week-1/',
  },
  {
    title: 'Pink Horse Arcade',
    description: 'Play games built by students! All games are published and playable in your browser.',
    link: '/arcade',
  },
  {
    title: 'Worksheets & Resources',
    description: 'Pixel art grids, level design planners, game design documents, and practice quizzes.',
    link: '/docs/worksheets/',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Game Design & Programming Club. Build and publish real games in 8 weeks!">
      <HomepageHeader />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginTop: '1rem',
        }}>
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              to={feature.link}
              style={{
                display: 'block',
                padding: '1.5rem',
                border: '2px solid var(--ifm-color-primary)',
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{feature.title}</h3>
              <p style={{ margin: 0, opacity: 0.8 }}>{feature.description}</p>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center', margin: '3rem 0' }}>
          <h2>Semester at a Glance</h2>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Date</th>
                <th>Focus</th>
                <th>Featured Game</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Apr 17</td><td>Intro to Game Design</td><td>Multi-game tour</td></tr>
              <tr><td>2</td><td>Apr 24</td><td>Sprites & Movement</td><td>Gunstar Heroes</td></tr>
              <tr><td>3</td><td>May 1</td><td>Enemies & Level Design</td><td>Sonic & Knuckles</td></tr>
              <tr><td>4</td><td>May 8</td><td>Polish & Publishing</td><td>Rock Band 3</td></tr>
              <tr><td>5</td><td>May 15</td><td>3D Space & Camera</td><td>FNAF: Security Breach</td></tr>
              <tr><td>6</td><td>May 22</td><td>3D Interaction</td><td>Ace Patrol</td></tr>
              <tr><td>7</td><td>May 29</td><td>3D Polish & Prep</td><td>Rampage 2</td></tr>
              <tr><td>8</td><td>Jun 5</td><td>Demo Day!</td><td>All of them</td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </Layout>
  );
}
