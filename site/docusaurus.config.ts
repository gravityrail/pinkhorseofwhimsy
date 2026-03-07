import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Grass Valley Game Club',
  tagline: 'Game Design & Programming Club - Grass Valley Charter School',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://gravityrail.github.io',
  baseUrl: '/game-club/',

  organizationName: 'gravityrail',
  projectName: 'game-club',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Grass Valley Game Club',
      logo: {
        alt: 'Grass Valley Game Club Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'curriculumSidebar',
          position: 'left',
          label: 'Curriculum',
        },
        {
          to: '/arcade',
          label: 'Arcade',
          position: 'left',
        },
        {
          type: 'docSidebar',
          sidebarId: 'worksheetsSidebar',
          position: 'left',
          label: 'Worksheets',
        },
        {
          type: 'docSidebar',
          sidebarId: 'resourcesSidebar',
          position: 'left',
          label: 'Resources',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Curriculum',
          items: [
            {label: 'Week 1 - Foundations', to: '/docs/curriculum/week-1/'},
            {label: 'Week 2 - 2D Sprites', to: '/docs/curriculum/week-2/'},
            {label: 'Week 3 - 2D Enemies', to: '/docs/curriculum/week-3/'},
            {label: 'Week 4 - 2D Polish', to: '/docs/curriculum/week-4/'},
          ],
        },
        {
          title: 'More Curriculum',
          items: [
            {label: 'Week 5 - 3D Space', to: '/docs/curriculum/week-5/'},
            {label: 'Week 6 - 3D Interaction', to: '/docs/curriculum/week-6/'},
            {label: 'Week 7 - 3D Polish', to: '/docs/curriculum/week-7/'},
            {label: 'Week 8 - Demo Day', to: '/docs/curriculum/week-8/'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Arcade', to: '/arcade'},
            {label: 'Worksheets', to: '/docs/worksheets/'},
            {label: 'Resources', to: '/docs/resources/'},
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Grass Valley Charter School Game Club. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
