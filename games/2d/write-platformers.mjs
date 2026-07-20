#!/usr/bin/env node
/**
 * Write upgraded Coin Collector + Platform Runner GDevelop game.json files.
 * 3 levels each, keys/doors/secrets, enemies/boss, juice events.
 */
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uid = (() => { let n = 0; return (p = 'id') => `${p}-${++n}`; })();

const gdVersion = { build: 237, major: 5, minor: 5, revision: 0 };

function imgRes(file) {
  return { file, kind: 'image', name: file, smoothed: false, userAdded: true };
}
function audioRes(file) {
  return { file, kind: 'audio', name: file, smoothed: false, userAdded: true };
}

function inst(name, x, y, opts = {}) {
  const o = {
    angle: 0,
    customSize: !!(opts.width || opts.height),
    height: opts.height || 0,
    width: opts.width || 0,
    layer: opts.layer || '',
    name,
    x, y,
    zOrder: opts.zOrder ?? 1,
    numberProperties: [],
    stringProperties: [],
    initialVariables: (opts.vars || []).map(v => ({
      name: v.name,
      type: v.type || 'number',
      value: v.value,
    })),
    persistentUuid: opts.id || uid(name.toLowerCase()),
  };
  return o;
}

function spriteObj(name, image, behaviors = [], animName = 'idle', vars = []) {
  return {
    assetStoreId: '',
    name,
    type: 'Sprite',
    updateIfNotVisible: false,
    variables: vars.map(v => ({ name: v.name, type: v.type || 'number', value: v.value })),
    effects: [],
    behaviors,
    animations: [{
      name: animName,
      useMultipleDirections: false,
      directions: [{
        looping: true,
        timeBetweenFrames: 0.08,
        sprites: [{
          hasCustomCollisionMask: false,
          image,
          points: [],
          originPoint: { name: 'origine', x: 0, y: 0 },
          centerPoint: { automatic: true, name: 'centre', x: 0, y: 0 },
          customCollisionMask: [],
        }],
      }],
    }],
  };
}

function tiled(name, texture, w, h, platformType = 'NormalPlatform') {
  return {
    assetStoreId: '',
    name,
    type: 'TiledSpriteObject::TiledSprite',
    updateIfNotVisible: false,
    variables: [],
    effects: [],
    behaviors: [{
      name: 'Platform',
      type: 'PlatformBehavior::PlatformBehavior',
      canBeGrabbed: false,
      platformType,
    }],
    width: w,
    height: h,
    texture,
  };
}

function textObj(name, str, size = 28, color = { r: 255, g: 255, b: 255 }, align = 'left') {
  return {
    assetStoreId: '',
    name,
    type: 'TextObject::Text',
    updateIfNotVisible: false,
    variables: [],
    effects: [],
    behaviors: [],
    characterSize: size,
    font: '',
    textAlignment: align,
    color,
    string: str,
    bold: true,
    italic: false,
    underlined: false,
    smoothed: true,
    isOutlineEnabled: true,
    outlineColor: { b: 0, g: 0, r: 0 },
    outlineThickness: 2,
    isShadowEnabled: false,
    shadowColor: { b: 0, g: 0, r: 0 },
    shadowOpacity: 127,
    shadowDistance: 1,
    shadowAngle: 90,
    shadowBlurRadius: 1,
  };
}

function platformerBehavior(opts = {}) {
  return {
    name: 'PlatformCharacter',
    type: 'PlatformBehavior::PlatformerObjectBehavior',
    acceleration: opts.acceleration ?? 1500,
    deceleration: opts.deceleration ?? 1500,
    gravity: opts.gravity ?? 1100,
    jumpSpeed: opts.jumpSpeed ?? 820,
    ladderClimbingSpeed: 150,
    maxFallingSpeed: 750,
    maxSpeed: opts.maxSpeed ?? 480,
    slopeMaxAngle: 60,
    canGrabPlatforms: false,
    ignoreDefaultControls: false,
    canGoDownFromJumpthru: true,
    useLegacyTrajectory: false,
  };
}

const ev = (conditions, actions, events) => {
  const e = {
    type: 'BuiltinCommonInstructions::Standard',
    conditions: conditions || [],
    actions: actions || [],
  };
  if (events) e.events = events;
  return e;
};
const cond = (type, parameters = []) => ({ type: { value: type }, parameters });
const act = (type, parameters = []) => ({ type: { value: type }, parameters });
const once = () => cond('BuiltinCommonInstructions::Once', []);
const jsCode = (code) => ({
  type: 'BuiltinCommonInstructions::JsCode',
  inlineCode: code,
  parameterObjects: '',
  useStrict: true,
  eventsSheetExpanded: false,
});

function baseLayer() {
  return {
    ambientLightColorB: 200, ambientLightColorG: 200, ambientLightColorR: 200,
    camera3DFarPlaneDistance: 10000, camera3DFieldOfView: 45, camera3DNearPlaneDistance: 3,
    followBaseLayerCamera: false, isLightingLayer: false, isLocked: false,
    name: '', renderingType: '', visibility: true,
    cameras: [{ defaultSize: true, defaultViewport: true, height: 0, viewportBottom: 1, viewportLeft: 0, viewportRight: 1, viewportTop: 0, width: 0 }],
    effects: [],
  };
}

function uiSettings() {
  return {
    grid: true, gridType: 'rectangular', gridWidth: 32, gridHeight: 32,
    gridOffsetX: 0, gridOffsetY: 0, gridColor: 10401023, gridAlpha: 0.8,
    snap: true, zoomFactor: 1, windowMask: false,
  };
}

// ─────────────────────────────────────────────────────────────
// Shared helpers for layouts
// ─────────────────────────────────────────────────────────────

function makeLayout({
  name, r, g, b, instances, objects, objectGroups, events, behaviorsSharedData,
}) {
  return {
    b, r, v: g,
    disableInputWhenNotFocused: true,
    mangledName: name,
    name,
    standardSortMethod: true,
    stopSoundsOnStartup: false,
    title: '',
    uiSettings: uiSettings(),
    objectsGroups: objectGroups || [],
    variables: [],
    instances,
    objects,
    objectsFolderStructure: {
      folderName: '__ROOT',
      children: objects.map(o => ({ objectName: o.name })),
    },
    events,
    layers: [baseLayer()],
    behaviorsSharedData: behaviorsSharedData || [
      { name: 'PlatformCharacter', type: 'PlatformBehavior::PlatformerObjectBehavior' },
      { name: 'Platform', type: 'PlatformBehavior::PlatformBehavior' },
    ],
  };
}

// ═════════════════════════════════════════════════════════════
// COIN COLLECTOR
// ═════════════════════════════════════════════════════════════

function coinCollectorObjects() {
  return [
    spriteObj('Player', 'player.png', [platformerBehavior({ gravity: 1000, jumpSpeed: 800, maxSpeed: 500 })], 'idle'),
    tiled('Ground', 'ground.png', 800, 64),
    tiled('Platform', 'platform.png', 192, 32),
    tiled('Jumpthru', 'platform.png', 128, 16, 'Jumpthru'),
    spriteObj('Coin', 'coin.png', [], 'spin'),
    spriteObj('Gem', 'gem.png', [], 'spin'),
    spriteObj('Key', 'key.png', [], 'idle'),
    spriteObj('Door', 'door.png', [{
      name: 'Platform',
      type: 'PlatformBehavior::PlatformBehavior',
      canBeGrabbed: false,
      platformType: 'NormalPlatform',
    }], 'idle'),
    spriteObj('Flag', 'flag.png', [], 'wave'),
    spriteObj('Checkpoint', 'checkpoint.png', [], 'idle'),
    spriteObj('Bush', 'bush.png', [], 'idle'),
    spriteObj('Cloud', 'cloud.png', [], 'idle'),
    textObj('ScoreText', 'Score: 0', 28, { r: 255, g: 255, b: 255 }),
    textObj('LevelText', 'Level 1', 22, { r: 255, g: 240, b: 120 }),
    textObj('MessageText', '', 36, { r: 255, g: 255, b: 100 }),
    textObj('ScorePopup', '+10', 20, { r: 255, g: 230, b: 80 }),
  ];
}

function coinCollectorEvents({ levelNum, nextScene, startX, startY, levelW, levelH, isFirst }) {
  const spawnX = startX;
  const spawnY = startY;
  const events = [];

  // Begin scene
  const beginActs = [
    act('SetNumberVariable', ['HasKey', '=', '0']),
    act('SetNumberVariable', ['CheckpointX', '=', String(spawnX)]),
    act('SetNumberVariable', ['CheckpointY', '=', String(spawnY)]),
    act('SetNumberVariable', ['LevelDone', '=', '0']),
    act('SetNumberVariable', ['Invuln', '=', '0']),
    act('TextObject::String', ['ScoreText', '=', '"Score: " + ToString(GlobalVariable(Score))']),
    act('TextObject::String', ['LevelText', '=', `"Level ${levelNum}"`]),
    act('TextObject::String', ['MessageText', '=', '""']),
    act('Hide', ['ScorePopup']),
    act('Hide', ['MessageText']),
  ];
  if (isFirst) {
    beginActs.unshift(act('SetNumberVariable', ['Score', '=', '0']));
  }
  events.push(ev([cond('DepartScene', [''])], beginActs));

  // Camera follow + clamp
  events.push(jsCode(`
var players = runtimeScene.getObjects("Player");
if (!players.length) return;
var p = players[0];
var camX = p.getCenterXInScene();
var camY = p.getCenterYInScene();
var halfW = 400, halfH = 300;
var levelW = ${levelW}, levelH = ${levelH};
camX = Math.max(halfW, Math.min(levelW - halfW, camX));
camY = Math.max(halfH, Math.min(levelH - halfH, camY));
var layer = runtimeScene.getLayer("");
layer.setCameraX(camX, 0);
layer.setCameraY(camY, 0);
// Keep HUD glued to camera
function pin(name, ox, oy) {
  var arr = runtimeScene.getObjects(name);
  for (var i = 0; i < arr.length; i++) {
    arr[i].setX(camX - halfW + ox);
    arr[i].setY(camY - halfH + oy);
  }
}
pin("ScoreText", 16, 12);
pin("LevelText", 16, 44);
pin("MessageText", halfW - 120, halfH - 40);
`.trim()));

  // Coin collect
  events.push(ev(
    [cond('CollisionNP', ['Player', 'Coin', '', '', ''])],
    [
      act('SetNumberVariable', ['Score', '+', '10']),
      act('TextObject::String', ['ScoreText', '=', '"Score: " + ToString(GlobalVariable(Score))']),
      act('PlaySound', ['', 'coin-collect.mp3', '', '60', '1']),
      act('Create', ['', 'ScorePopup', 'Coin.X()', 'Coin.Y() - 10', '']),
      act('TextObject::String', ['ScorePopup', '=', '"+10"']),
      act('ModVarObjet', ['ScorePopup', 'age', '=', '0']),
      act('Delete', ['Coin', '']),
    ]
  ));

  // Gem collect (secret treasure)
  events.push(ev(
    [cond('CollisionNP', ['Player', 'Gem', '', '', ''])],
    [
      act('SetNumberVariable', ['Score', '+', '50']),
      act('TextObject::String', ['ScoreText', '=', '"Score: " + ToString(GlobalVariable(Score))']),
      act('PlaySound', ['', 'coin-collect.mp3', '', '80', '1.2']),
      act('Create', ['', 'ScorePopup', 'Gem.X()', 'Gem.Y() - 10', '']),
      act('TextObject::String', ['ScorePopup', '=', '"+50!"']),
      act('ModVarObjet', ['ScorePopup', 'age', '=', '0']),
      act('Delete', ['Gem', '']),
    ]
  ));

  // Score popup float + fade
  events.push(jsCode(`
var dt = runtimeScene.getTimeManager().getElapsedTime() / 1000;
var pops = runtimeScene.getObjects("ScorePopup");
for (var i = pops.length - 1; i >= 0; i--) {
  var o = pops[i];
  var age = o.getVariables().get("age");
  age.add(dt);
  o.setY(o.getY() - 50 * dt);
  if (age.getAsNumber() > 0.7) o.deleteFromScene(runtimeScene);
}
`.trim()));

  // Key pickup
  events.push(ev(
    [cond('CollisionNP', ['Player', 'Key', '', '', ''])],
    [
      act('Delete', ['Key', '']),
      act('SetNumberVariable', ['HasKey', '=', '1']),
      act('PlaySound', ['', 'coin-collect.mp3', '', '70', '0.8']),
      act('TextObject::String', ['MessageText', '=', '"Got a key!"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"msg"']),
    ]
  ));

  // Door unlock
  events.push(ev(
    [
      cond('CollisionNP', ['Player', 'Door', '', '', '']),
      cond('NumberVariable', ['HasKey', '=', '1']),
    ],
    [
      act('Delete', ['Door', '']),
      act('SetNumberVariable', ['HasKey', '=', '0']),
      act('PlaySound', ['', 'level-complete.mp3', '', '50', '1.3']),
      act('TextObject::String', ['MessageText', '=', '"Door unlocked!"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"msg"']),
    ]
  ));

  // Clear message after 1.5s
  events.push(ev(
    [cond('CompareTimer', ['', '"msg"', '>=', '1.5'])],
    [
      act('TextObject::String', ['MessageText', '=', '""']),
      act('Hide', ['MessageText']),
    ]
  ));

  // Checkpoint
  events.push(ev(
    [
      cond('CollisionNP', ['Player', 'Checkpoint', '', '', '']),
      once(),
    ],
    [
      act('SetNumberVariable', ['CheckpointX', '=', 'Checkpoint.X()']),
      act('SetNumberVariable', ['CheckpointY', '=', 'Checkpoint.Y() - 32']),
      act('PlaySound', ['', 'coin-collect.mp3', '', '40', '0.6']),
      act('TextObject::String', ['MessageText', '=', '"Checkpoint!"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"msg"']),
    ]
  ));

  // Fall death (below level)
  events.push(ev(
    [cond('PosY', ['Player', '>', String(levelH + 40)])],
    [
      act('MettreXY', ['Player', '=', 'GlobalVariable(CheckpointX)', '=', 'GlobalVariable(CheckpointY)']),
      act('PlaySound', ['', 'jump.mp3', '', '40', '0.5']),
    ]
  ));

  // Flag = level complete
  events.push(ev(
    [
      cond('CollisionNP', ['Player', 'Flag', '', '', '']),
      cond('NumberVariable', ['LevelDone', '=', '0']),
    ],
    [
      act('SetNumberVariable', ['LevelDone', '=', '1']),
      act('PlaySound', ['', 'level-complete.mp3', '', '80', '1']),
      act('TextObject::String', ['MessageText', '=', nextScene ? '"Level clear!"' : '"YOU WIN!"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"levelend"']),
    ]
  ));

  if (nextScene) {
    events.push(ev(
      [
        cond('NumberVariable', ['LevelDone', '=', '1']),
        cond('CompareTimer', ['', '"levelend"', '>=', '1.4']),
      ],
      [act('Scene', ['', `"${nextScene}"`, ''])]
    ));
  } else {
    // Win: restart on timer after celebrate, or just stay
    events.push(ev(
      [
        cond('NumberVariable', ['LevelDone', '=', '1']),
        cond('CompareTimer', ['', '"levelend"', '>=', '4']),
      ],
      [
        act('SetNumberVariable', ['Score', '=', '0']),
        act('Scene', ['', '"Level1"', '']),
      ]
    ));
  }

  // Jump SFX
  events.push(ev(
    [
      cond('PlatformBehavior::IsJumping', ['Player', 'PlatformCharacter']),
      once(),
    ],
    [act('PlaySound', ['', 'jump.mp3', '', '35', '1'])]
  ));

  return events;
}

function buildCoinCollector() {
  const objects = coinCollectorObjects();
  const groups = [
    { name: 'Platforms', objects: [{ name: 'Ground' }, { name: 'Platform' }, { name: 'Jumpthru' }] },
    { name: 'Collectibles', objects: [{ name: 'Coin' }, { name: 'Gem' }] },
  ];

  // ── Level 1: Sunny meadows intro (800 x 900 vertical-ish)
  const L1 = [];
  // Ground floor pieces with a pit in the middle
  L1.push(inst('Ground', 0, 836, { width: 320, height: 64, zOrder: 0 }));
  L1.push(inst('Ground', 480, 836, { width: 480, height: 64, zOrder: 0 }));
  // Platforms climbing up
  L1.push(inst('Platform', 100, 720, { width: 160, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 340, 640, { width: 160, height: 32, zOrder: 0 }));
  L1.push(inst('Jumpthru', 560, 560, { width: 128, height: 16, zOrder: 0 }));
  L1.push(inst('Platform', 200, 480, { width: 192, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 480, 380, { width: 160, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 120, 280, { width: 128, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 360, 180, { width: 220, height: 32, zOrder: 0 })); // flag platform
  // Secret high-left ledge
  L1.push(inst('Platform', 0, 120, { width: 96, height: 32, zOrder: 0 }));
  // Player + flag
  L1.push(inst('Player', 48, 772, { width: 48, height: 48, zOrder: 5 }));
  L1.push(inst('Flag', 440, 116, { zOrder: 3 }));
  // Coins
  [[140, 680], [380, 600], [600, 520], [260, 440], [520, 340], [160, 240], [400, 140], [700, 796], [560, 796]].forEach(([x, y], i) => {
    L1.push(inst('Coin', x, y, { id: `c1-${i}` }));
  });
  // Secret gem
  L1.push(inst('Gem', 24, 80, { id: 'g1' }));
  // Decor
  L1.push(inst('Bush', 200, 804, { zOrder: 0 }));
  L1.push(inst('Bush', 620, 804, { zOrder: 0 }));
  L1.push(inst('Cloud', 80, 40, { zOrder: 0 }));
  L1.push(inst('Cloud', 500, 80, { zOrder: 0 }));
  L1.push(inst('ScoreText', 16, 12, { zOrder: 20 }));
  L1.push(inst('LevelText', 16, 44, { zOrder: 20 }));
  L1.push(inst('MessageText', 280, 260, { zOrder: 20 }));

  // ── Level 2: Key + locked door, secrets (1000 x 1100)
  const L2 = [];
  L2.push(inst('Ground', 0, 1036, { width: 1000, height: 64, zOrder: 0 }));
  // Left tower climb
  L2.push(inst('Platform', 40, 900, { width: 160, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 40, 760, { width: 128, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 40, 620, { width: 128, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 40, 480, { width: 160, height: 32, zOrder: 0 })); // key here
  // Mid path
  L2.push(inst('Platform', 280, 880, { width: 192, height: 32, zOrder: 0 }));
  L2.push(inst('Jumpthru', 520, 800, { width: 128, height: 16, zOrder: 0 }));
  L2.push(inst('Platform', 700, 720, { width: 160, height: 32, zOrder: 0 }));
  // Door blocking right secret chamber
  L2.push(inst('Door', 860, 972, { zOrder: 2 }));
  L2.push(inst('Platform', 860, 1036 - 32, { width: 32, height: 32, zOrder: 0 })); // sill
  // Secret chamber platforms
  L2.push(inst('Platform', 900, 900, { width: 96, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 900, 780, { width: 96, height: 32, zOrder: 0 }));
  // Upper right to flag
  L2.push(inst('Platform', 520, 560, { width: 192, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 280, 440, { width: 160, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 520, 320, { width: 200, height: 32, zOrder: 0 }));
  L2.push(inst('Checkpoint', 560, 520, { zOrder: 2 }));
  L2.push(inst('Player', 64, 972, { width: 48, height: 48, zOrder: 5 }));
  L2.push(inst('Key', 80, 440, { zOrder: 3 }));
  L2.push(inst('Flag', 600, 256, { zOrder: 3 }));
  // Coins path
  [[80, 860], [80, 720], [80, 580], [340, 840], [560, 760], [740, 680], [560, 520], [320, 400], [560, 280]].forEach(([x, y], i) => {
    L2.push(inst('Coin', x, y, { id: `c2-${i}` }));
  });
  // Secret gems behind door
  L2.push(inst('Gem', 930, 860, { id: 'g2a' }));
  L2.push(inst('Gem', 930, 740, { id: 'g2b' }));
  L2.push(inst('Coin', 930, 996, { id: 'c2s' }));
  L2.push(inst('Bush', 200, 1004, { zOrder: 0 }));
  L2.push(inst('Cloud', 400, 100, { zOrder: 0 }));
  L2.push(inst('ScoreText', 16, 12, { zOrder: 20 }));
  L2.push(inst('LevelText', 16, 44, { zOrder: 20 }));
  L2.push(inst('MessageText', 380, 400, { zOrder: 20 }));

  // ── Level 3: Vertical tower of keys (800 x 1600)
  const L3 = [];
  L3.push(inst('Ground', 0, 1536, { width: 800, height: 64, zOrder: 0 }));
  // Floors going up
  const floors = [
    { y: 1400, platforms: [[0, 200], [350, 200], [650, 150]] },
    { y: 1240, platforms: [[100, 180], [400, 220], [700, 100]] },
    { y: 1080, platforms: [[0, 160], [300, 160], [560, 240]] },
    { y: 920, platforms: [[80, 200], [420, 200]] },
    { y: 760, platforms: [[0, 140], [250, 180], [560, 200]] },
    { y: 600, platforms: [[100, 220], [480, 180]] },
    { y: 440, platforms: [[0, 200], [360, 200], [640, 160]] },
    { y: 280, platforms: [[150, 240], [500, 200]] },
    { y: 140, platforms: [[250, 300]] }, // summit
  ];
  floors.forEach((f, fi) => {
    f.platforms.forEach(([x, w], pi) => {
      L3.push(inst('Platform', x, f.y, { width: w, height: 32, zOrder: 0, id: `p3-${fi}-${pi}` }));
    });
  });
  // Locked doors mid tower
  L3.push(inst('Door', 300, 1048, { zOrder: 2, id: 'd3a' })); // blocks mid path
  L3.push(inst('Door', 500, 568, { zOrder: 2, id: 'd3b' }));
  // Keys
  L3.push(inst('Key', 700, 1200, { id: 'k3a' }));
  L3.push(inst('Key', 40, 720, { id: 'k3b' }));
  // Secret alcove left of floor y=920
  L3.push(inst('Platform', 0, 860, { width: 64, height: 32, zOrder: 0 }));
  L3.push(inst('Gem', 16, 820, { id: 'g3a' }));
  L3.push(inst('Gem', 280, 100, { id: 'g3b' }));
  // Checkpoint mid
  L3.push(inst('Checkpoint', 450, 880, { zOrder: 2 }));
  L3.push(inst('Player', 48, 1472, { width: 48, height: 48, zOrder: 5 }));
  L3.push(inst('Flag', 360, 76, { zOrder: 3 }));
  // Coins sprinkled
  const coins3 = [
    [80, 1360], [400, 1360], [700, 1360],
    [160, 1200], [480, 1200],
    [40, 1040], [600, 1040],
    [160, 880], [500, 880],
    [40, 720], [320, 720], [620, 720],
    [160, 560], [540, 560],
    [80, 400], [420, 400], [700, 400],
    [220, 240], [560, 240],
    [360, 100],
  ];
  coins3.forEach(([x, y], i) => L3.push(inst('Coin', x, y, { id: `c3-${i}` })));
  L3.push(inst('Cloud', 100, 40, { zOrder: 0 }));
  L3.push(inst('Cloud', 500, 60, { zOrder: 0 }));
  L3.push(inst('Bush', 180, 1504, { zOrder: 0 }));
  L3.push(inst('ScoreText', 16, 12, { zOrder: 20 }));
  L3.push(inst('LevelText', 16, 44, { zOrder: 20 }));
  L3.push(inst('MessageText', 280, 700, { zOrder: 20 }));

  const layouts = [
    makeLayout({
      name: 'Level1', r: 135, g: 206, b: 235,
      instances: L1, objects, objectGroups: groups,
      events: coinCollectorEvents({
        levelNum: 1, nextScene: 'Level2', startX: 48, startY: 772,
        levelW: 960, levelH: 900, isFirst: true,
      }),
    }),
    makeLayout({
      name: 'Level2', r: 100, g: 140, b: 180,
      instances: L2, objects: coinCollectorObjects(), objectGroups: groups,
      events: coinCollectorEvents({
        levelNum: 2, nextScene: 'Level3', startX: 64, startY: 972,
        levelW: 1000, levelH: 1100, isFirst: false,
      }),
    }),
    makeLayout({
      name: 'Level3', r: 70, g: 90, b: 140,
      instances: L3, objects: coinCollectorObjects(), objectGroups: groups,
      events: coinCollectorEvents({
        levelNum: 3, nextScene: null, startX: 48, startY: 1472,
        levelW: 800, levelH: 1600, isFirst: false,
      }),
    }),
  ];

  return {
    firstLayout: 'Level1',
    gdVersion,
    properties: {
      adaptGameResolutionAtRuntime: true,
      antialiasingMode: 'MSAA',
      antialisingEnabledOnMobile: false,
      folderProject: false,
      orientation: 'landscape',
      packageName: 'com.pinkhorse.coincollector',
      pixelsRounding: true,
      projectUuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      scaleMode: 'nearest',
      sizeOnStartupMode: 'adaptWidth',
      templateSlug: '',
      version: '2.0.0',
      name: 'Coin Collector',
      description: 'Collect coins, find keys, unlock secrets across 3 vertical levels!',
      author: 'Pink Horse of Whimsy',
      windowWidth: 800,
      windowHeight: 600,
      latestCompilationDirectory: '',
      maxFPS: 60,
      minFPS: 20,
      verticalSync: false,
      platformSpecificAssets: {},
      loadingScreen: {
        backgroundColor: 1710618,
        backgroundFadeInDuration: 0.2,
        backgroundImageResourceName: 'loading.png',
        gdevelopLogoStyle: 'light',
        logoAndProgressColor: 16777215,
        logoAndProgressLogoAndProgressFadeInDelay: 0.2,
        progressBarColor: 16777215,
        progressBarHeight: 20,
        progressBarMaxWidth: 200,
        progressBarMinWidth: 40,
        progressBarWidthPercent: 30,
        showGDevelopSplash: false,
        showProgressBar: true,
      },
      watermark: { placement: 'bottom-left', showWatermark: false },
      authorIds: [],
      authorUsernames: [],
      categories: [],
      playableDevices: ['keyboard', 'mobile'],
      extensionProperties: [],
      platforms: [{ name: 'GDevelop JS platform' }],
      currentPlatform: 'GDevelop JS platform',
    },
    resources: {
      resources: [
        imgRes('player.png'), imgRes('coin.png'), imgRes('ground.png'),
        imgRes('platform.png'), imgRes('loading.png'),
        imgRes('key.png'), imgRes('door.png'), imgRes('flag.png'),
        imgRes('checkpoint.png'), imgRes('gem.png'), imgRes('bush.png'),
        imgRes('cloud.png'),
        audioRes('coin-collect.mp3'), audioRes('jump.mp3'), audioRes('level-complete.mp3'),
      ],
      resourceFolders: [],
    },
    objects: [],
    objectsFolderStructure: { folderName: '__ROOT', children: [] },
    objectsGroups: [],
    variables: [
      { name: 'Score', type: 'number', value: 0 },
      { name: 'HasKey', type: 'number', value: 0 },
      { name: 'CheckpointX', type: 'number', value: 64 },
      { name: 'CheckpointY', type: 'number', value: 472 },
      { name: 'LevelDone', type: 'number', value: 0 },
      { name: 'Invuln', type: 'number', value: 0 },
    ],
    layouts,
    externalEvents: [],
    eventsFunctionsExtensions: [],
    externalLayouts: [],
    externalSourceFiles: [],
  };
}

// ═════════════════════════════════════════════════════════════
// PLATFORM RUNNER
// ═════════════════════════════════════════════════════════════

function runnerObjects() {
  return [
    spriteObj('Player', 'runner.png', [platformerBehavior({ gravity: 1200, jumpSpeed: 880, maxSpeed: 460 })], 'run'),
    tiled('Ground', 'ground.png', 800, 64),
    tiled('Platform', 'ground.png', 192, 32),
    tiled('MovingPlatform', 'moving-platform.png', 128, 24),
    spriteObj('Spike', 'spike.png', [], 'idle'),
    spriteObj('Enemy', 'enemy.png', [], 'idle', [{ name: 'dir', value: 1 }, { name: 'hp', value: 1 }]),
    spriteObj('Bat', 'bat.png', [], 'fly', [{ name: 'dir', value: 1 }, { name: 'baseY', value: 0 }]),
    spriteObj('Boss', 'boss.png', [], 'idle', [{ name: 'dir', value: 1 }, { name: 'hp', value: 3 }]),
    spriteObj('Flag', 'flag.png', [], 'wave'),
    spriteObj('Checkpoint', 'checkpoint.png', [], 'idle'),
    textObj('ScoreText', 'Score: 0', 26, { r: 255, g: 255, b: 255 }),
    textObj('LivesText', 'Lives: 3', 26, { r: 255, g: 120, b: 120 }),
    textObj('LevelText', 'Level 1', 22, { r: 180, g: 220, b: 255 }),
    textObj('MessageText', '', 36, { r: 255, g: 255, b: 120 }),
    textObj('ScorePopup', '+100', 20, { r: 255, g: 220, b: 80 }),
  ];
}

function runnerEvents({ levelNum, nextScene, startX, startY, levelW, levelH, isFirst }) {
  const events = [];
  const beginActs = [
    act('SetNumberVariable', ['CheckpointX', '=', String(startX)]),
    act('SetNumberVariable', ['CheckpointY', '=', String(startY)]),
    act('SetNumberVariable', ['LevelDone', '=', '0']),
    act('SetNumberVariable', ['Invuln', '=', '0']),
    act('SetNumberVariable', ['GameOver', '=', '0']),
    act('TextObject::String', ['ScoreText', '=', '"Score: " + ToString(GlobalVariable(Score))']),
    act('TextObject::String', ['LivesText', '=', '"Lives: " + ToString(GlobalVariable(Lives))']),
    act('TextObject::String', ['LevelText', '=', `"Level ${levelNum}"`]),
    act('TextObject::String', ['MessageText', '=', '""']),
    act('Hide', ['ScorePopup']),
    act('Hide', ['MessageText']),
  ];
  if (isFirst) {
    beginActs.unshift(act('SetNumberVariable', ['Score', '=', '0']));
    beginActs.unshift(act('SetNumberVariable', ['Lives', '=', '3']));
  }
  events.push(ev([cond('DepartScene', [''])], beginActs));

  // Camera + HUD + invuln timer + moving platforms + enemy AI + bats + boss
  events.push(jsCode(`
var dt = runtimeScene.getScene().getTimeManager().getElapsedTime() / 1000;
if (!runtimeScene.__t) runtimeScene.__t = 0;
runtimeScene.__t += dt;
var t = runtimeScene.__t;
var vars = runtimeScene.getGame().getVariables();
// also try scene vars fallback
function gVar(name) {
  var v = runtimeScene.getGame().getVariables().get(name);
  return v;
}
var inv = gVar("Invuln");
if (inv.getAsNumber() > 0) inv.sub(dt);

var players = runtimeScene.getObjects("Player");
var p = players[0];
var halfW = 400, halfH = 300;
var levelW = ${levelW}, levelH = ${levelH};
if (p) {
  var camX = Math.max(halfW, Math.min(levelW - halfW, p.getCenterXInScene()));
  var camY = Math.max(halfH, Math.min(levelH - halfH, p.getCenterYInScene()));
  var layer = runtimeScene.getLayer("");
  layer.setCameraX(camX, 0);
  layer.setCameraY(camY, 0);
  function pin(name, ox, oy) {
    var arr = runtimeScene.getObjects(name);
    for (var i = 0; i < arr.length; i++) {
      arr[i].setX(camX - halfW + ox);
      arr[i].setY(camY - halfH + oy);
    }
  }
  pin("ScoreText", 16, 12);
  pin("LivesText", 620, 12);
  pin("LevelText", 16, 42);
  pin("MessageText", halfW - 100, halfH - 50);
  // blink when invulnerable
  if (inv.getAsNumber() > 0) {
    p.hide(Math.floor(t * 12) % 2 === 0);
  } else {
    p.hide(false);
  }
}

// Moving platforms: store home on first frame via object var homeX/homeY/range/axis
var mps = runtimeScene.getObjects("MovingPlatform");
for (var i = 0; i < mps.length; i++) {
  var m = mps[i];
  var mv = m.getVariables();
  if (!mv.has("init")) {
    mv.get("init").setNumber(1);
    mv.get("homeX").setNumber(m.getX());
    mv.get("homeY").setNumber(m.getY());
    if (!mv.has("range")) mv.get("range").setNumber(80);
    if (!mv.has("axis")) mv.get("axis").setNumber(0); // 0=x, 1=y
    if (!mv.has("speed")) mv.get("speed").setNumber(1.2);
  }
  var homeX = mv.get("homeX").getAsNumber();
  var homeY = mv.get("homeY").getAsNumber();
  var range = mv.get("range").getAsNumber();
  var axis = mv.get("axis").getAsNumber();
  var speed = mv.get("speed").getAsNumber();
  var phase = t * speed + i * 1.3;
  if (axis < 0.5) m.setX(homeX + Math.sin(phase) * range);
  else m.setY(homeY + Math.sin(phase) * range);
}

// Enemy slime patrol
var enemies = runtimeScene.getObjects("Enemy");
for (var i = 0; i < enemies.length; i++) {
  var e = enemies[i];
  var ev = e.getVariables();
  if (!ev.has("init")) {
    ev.get("init").setNumber(1);
    ev.get("homeX").setNumber(e.getX());
    if (!ev.has("range")) ev.get("range").setNumber(60);
    if (!ev.has("dir")) ev.get("dir").setNumber(1);
    if (!ev.has("spd")) ev.get("spd").setNumber(70);
  }
  var dir = ev.get("dir").getAsNumber();
  var spd = ev.get("spd").getAsNumber();
  var homeX = ev.get("homeX").getAsNumber();
  var range = ev.get("range").getAsNumber();
  e.setX(e.getX() + dir * spd * dt);
  if (e.getX() > homeX + range) { ev.get("dir").setNumber(-1); }
  if (e.getX() < homeX - range) { ev.get("dir").setNumber(1); }
}

// Bats: sine fly
var bats = runtimeScene.getObjects("Bat");
for (var i = 0; i < bats.length; i++) {
  var b = bats[i];
  var bv = b.getVariables();
  if (!bv.has("init")) {
    bv.get("init").setNumber(1);
    bv.get("homeX").setNumber(b.getX());
    bv.get("homeY").setNumber(b.getY());
    if (!bv.has("range")) bv.get("range").setNumber(90);
  }
  var hx = bv.get("homeX").getAsNumber();
  var hy = bv.get("homeY").getAsNumber();
  var rng = bv.get("range").getAsNumber();
  b.setX(hx + Math.sin(t * 1.4 + i) * rng);
  b.setY(hy + Math.cos(t * 2.1 + i * 0.7) * 28);
}

// Boss patrol slower + larger range
var bosses = runtimeScene.getObjects("Boss");
for (var i = 0; i < bosses.length; i++) {
  var bo = bosses[i];
  var bov = bo.getVariables();
  if (!bov.has("init")) {
    bov.get("init").setNumber(1);
    bov.get("homeX").setNumber(bo.getX());
    if (!bov.has("range")) bov.get("range").setNumber(120);
    if (!bov.has("dir")) bov.get("dir").setNumber(1);
    if (!bov.has("hp")) bov.get("hp").setNumber(3);
    if (!bov.has("spd")) bov.get("spd").setNumber(55);
  }
  var dir = bov.get("dir").getAsNumber();
  var spd = bov.get("spd").getAsNumber();
  var homeX = bov.get("homeX").getAsNumber();
  var range = bov.get("range").getAsNumber();
  // enrage when low hp
  if (bov.get("hp").getAsNumber() <= 1) spd *= 1.6;
  bo.setX(bo.getX() + dir * spd * dt);
  if (bo.getX() > homeX + range) bov.get("dir").setNumber(-1);
  if (bo.getX() < homeX - range) bov.get("dir").setNumber(1);
}

// Score popups
var pops = runtimeScene.getObjects("ScorePopup");
for (var i = pops.length - 1; i >= 0; i--) {
  var o = pops[i];
  var age = o.getVariables().get("age");
  age.add(dt);
  o.setY(o.getY() - 55 * dt);
  if (age.getAsNumber() > 0.75) o.deleteFromScene(runtimeScene);
}
`.trim()));

  // Stomp enemies
  events.push(jsCode(`
var players = runtimeScene.getObjects("Player");
if (!players.length) return;
var p = players[0];
var inv = runtimeScene.getGame().getVariables().get("Invuln").getAsNumber();
var score = runtimeScene.getGame().getVariables().get("Score");
var falling = p.getBehavior("PlatformCharacter").isFalling();
var pBottom = p.getY() + p.getHeight();
var pPrevBottom = pBottom; // approximate

function tryStomp(list, points, sfx) {
  for (var i = list.length - 1; i >= 0; i--) {
    var e = list[i];
    if (!p.isCollidingWith(e)) continue;
    var eTop = e.getY();
    var eMid = e.getY() + e.getHeight() * 0.45;
    // stomp if player bottom is near top of enemy and falling
    if (falling && pBottom <= eMid + 8 && p.getY() < eTop) {
      var hp = e.getVariables().get("hp");
      hp.sub(1);
      // bounce player
      p.getBehavior("PlatformCharacter").setCanJump();
      p.getBehavior("PlatformCharacter").simulateJumpKey();
      try {
        var a = new Audio("/arcade/sfx/" + (sfx || "enemy-stomp") + ".mp3");
        a.volume = 0.55; a.play();
      } catch (err) {}
      if (hp.getAsNumber() <= 0) {
        score.add(points);
        // popup
        var popup = runtimeScene.createObject("ScorePopup");
        if (popup) {
          popup.setPosition(e.getX(), e.getY() - 10);
          popup.setString("+" + points);
          popup.getVariables().get("age").setNumber(0);
        }
        e.deleteFromScene(runtimeScene);
      } else {
        // flash boss - knock back slightly
        e.setX(e.getX() + (e.getX() < p.getX() ? -20 : 20));
      }
    } else if (inv <= 0) {
      // side hit - damage
      runtimeScene.getGame().getVariables().get("__hit").setNumber(1);
    }
  }
}
runtimeScene.getGame().getVariables().get("__hit").setNumber(0);
tryStomp(runtimeScene.getObjects("Enemy"), 100, "enemy-stomp");
tryStomp(runtimeScene.getObjects("Bat"), 150, "enemy-stomp");
tryStomp(runtimeScene.getObjects("Boss"), 300, "enemy-stomp");
`.trim()));

  // Handle side-hit damage from JS flag
  events.push(ev(
    [cond('NumberVariable', ['__hit', '=', '1'])],
    [
      act('SetNumberVariable', ['__hit', '=', '0']),
      act('SetNumberVariable', ['Lives', '-', '1']),
      act('TextObject::String', ['LivesText', '=', '"Lives: " + ToString(GlobalVariable(Lives))']),
      act('SetNumberVariable', ['Invuln', '=', '1.5']),
      act('MettreXY', ['Player', '=', 'GlobalVariable(CheckpointX)', '=', 'GlobalVariable(CheckpointY)']),
      act('PlaySound', ['', 'jump.mp3', '', '50', '0.5']),
    ]
  ));

  // Spike hazard
  events.push(ev(
    [
      cond('CollisionNP', ['Player', 'Spike', '', '', '']),
      cond('NumberVariable', ['Invuln', '<=', '0']),
      cond('NumberVariable', ['GameOver', '=', '0']),
    ],
    [
      act('SetNumberVariable', ['Lives', '-', '1']),
      act('TextObject::String', ['LivesText', '=', '"Lives: " + ToString(GlobalVariable(Lives))']),
      act('SetNumberVariable', ['Invuln', '=', '1.5']),
      act('MettreXY', ['Player', '=', 'GlobalVariable(CheckpointX)', '=', 'GlobalVariable(CheckpointY)']),
      act('PlaySound', ['', 'jump.mp3', '', '50', '0.5']),
    ]
  ));

  // Fall death
  events.push(ev(
    [
      cond('PosY', ['Player', '>', String(levelH + 80)]),
      cond('NumberVariable', ['GameOver', '=', '0']),
    ],
    [
      act('SetNumberVariable', ['Lives', '-', '1']),
      act('TextObject::String', ['LivesText', '=', '"Lives: " + ToString(GlobalVariable(Lives))']),
      act('SetNumberVariable', ['Invuln', '=', '1.2']),
      act('MettreXY', ['Player', '=', 'GlobalVariable(CheckpointX)', '=', 'GlobalVariable(CheckpointY)']),
    ]
  ));

  // Checkpoint
  events.push(ev(
    [
      cond('CollisionNP', ['Player', 'Checkpoint', '', '', '']),
      once(),
    ],
    [
      act('SetNumberVariable', ['CheckpointX', '=', 'Checkpoint.X()']),
      act('SetNumberVariable', ['CheckpointY', '=', 'Checkpoint.Y() - 40']),
      act('PlaySound', ['', 'coin-collect.mp3', '', '40', '0.7']),
      act('TextObject::String', ['MessageText', '=', '"Checkpoint!"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"msg"']),
    ]
  ));

  events.push(ev(
    [cond('CompareTimer', ['', '"msg"', '>=', '1.2'])],
    [act('Hide', ['MessageText']), act('TextObject::String', ['MessageText', '=', '""'])]
  ));

  // Game over
  events.push(ev(
    [
      cond('NumberVariable', ['Lives', '<=', '0']),
      cond('NumberVariable', ['GameOver', '=', '0']),
    ],
    [
      act('SetNumberVariable', ['GameOver', '=', '1']),
      act('TextObject::String', ['MessageText', '=', '"GAME OVER"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"gameover"']),
    ]
  ));
  events.push(ev(
    [
      cond('NumberVariable', ['GameOver', '=', '1']),
      cond('CompareTimer', ['', '"gameover"', '>=', '2.5']),
    ],
    [
      act('SetNumberVariable', ['Score', '=', '0']),
      act('SetNumberVariable', ['Lives', '=', '3']),
      act('Scene', ['', '"Level1"', '']),
    ]
  ));

  // Flag complete
  events.push(ev(
    [
      cond('CollisionNP', ['Player', 'Flag', '', '', '']),
      cond('NumberVariable', ['LevelDone', '=', '0']),
      cond('NumberVariable', ['GameOver', '=', '0']),
    ],
    [
      act('SetNumberVariable', ['LevelDone', '=', '1']),
      act('SetNumberVariable', ['Score', '+', '500']),
      act('TextObject::String', ['ScoreText', '=', '"Score: " + ToString(GlobalVariable(Score))']),
      act('PlaySound', ['', 'level-complete.mp3', '', '85', '1']),
      act('TextObject::String', ['MessageText', '=', nextScene ? '"Level clear!"' : '"YOU WIN!"']),
      act('Show', ['MessageText', '']),
      act('ResetTimer', ['', '"levelend"']),
    ]
  ));

  if (nextScene) {
    events.push(ev(
      [
        cond('NumberVariable', ['LevelDone', '=', '1']),
        cond('CompareTimer', ['', '"levelend"', '>=', '1.5']),
      ],
      [act('Scene', ['', `"${nextScene}"`, ''])]
    ));
  } else {
    events.push(ev(
      [
        cond('NumberVariable', ['LevelDone', '=', '1']),
        cond('CompareTimer', ['', '"levelend"', '>=', '4']),
      ],
      [
        act('SetNumberVariable', ['Score', '=', '0']),
        act('SetNumberVariable', ['Lives', '=', '3']),
        act('Scene', ['', '"Level1"', '']),
      ]
    ));
  }

  // Jump SFX
  events.push(ev(
    [
      cond('PlatformBehavior::IsJumping', ['Player', 'PlatformCharacter']),
      once(),
    ],
    [act('PlaySound', ['', 'jump.mp3', '', '30', '1'])]
  ));

  // Keep score text updated from stomps
  events.push(ev(
    [],
    [act('TextObject::String', ['ScoreText', '=', '"Score: " + ToString(GlobalVariable(Score))'])]
  ));

  return events;
}

function buildPlatformRunner() {
  const groups = [
    { name: 'Platforms', objects: [{ name: 'Ground' }, { name: 'Platform' }, { name: 'MovingPlatform' }] },
    { name: 'Hazards', objects: [{ name: 'Spike' }] },
    { name: 'Foes', objects: [{ name: 'Enemy' }, { name: 'Bat' }, { name: 'Boss' }] },
  ];

  // Level 1: warm-up run (1600 x 600)
  const L1 = [];
  L1.push(inst('Ground', 0, 536, { width: 1600, height: 64, zOrder: 0 }));
  L1.push(inst('Platform', 220, 420, { width: 160, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 480, 340, { width: 160, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 760, 400, { width: 128, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 1000, 300, { width: 160, height: 32, zOrder: 0 }));
  L1.push(inst('Platform', 1280, 380, { width: 192, height: 32, zOrder: 0 }));
  // Spikes
  [[360, 504], [620, 504], [900, 504], [1180, 504]].forEach(([x, y], i) => {
    L1.push(inst('Spike', x, y, { id: `s1-${i}` }));
  });
  // Enemies
  L1.push(inst('Enemy', 500, 500, { id: 'e1a', vars: [{ name: 'range', value: 50 }] }));
  L1.push(inst('Enemy', 1100, 500, { id: 'e1b', vars: [{ name: 'range', value: 70 }] }));
  L1.push(inst('Player', 48, 472, { width: 48, height: 48, zOrder: 5 }));
  L1.push(inst('Checkpoint', 800, 496, { zOrder: 2 }));
  L1.push(inst('Flag', 1500, 472, { zOrder: 3 }));
  L1.push(inst('ScoreText', 16, 12, { zOrder: 20 }));
  L1.push(inst('LivesText', 620, 12, { zOrder: 20 }));
  L1.push(inst('LevelText', 16, 42, { zOrder: 20 }));
  L1.push(inst('MessageText', 300, 250, { zOrder: 20 }));

  // Level 2: moving platforms + bats (2000 x 700)
  const L2 = [];
  L2.push(inst('Ground', 0, 636, { width: 400, height: 64, zOrder: 0 }));
  L2.push(inst('Ground', 700, 636, { width: 400, height: 64, zOrder: 0 }));
  L2.push(inst('Ground', 1500, 636, { width: 500, height: 64, zOrder: 0 }));
  // Gaps with spikes in pits
  L2.push(inst('Spike', 450, 604, { id: 's2a' }));
  L2.push(inst('Spike', 520, 604, { id: 's2b' }));
  L2.push(inst('Spike', 590, 604, { id: 's2c' }));
  L2.push(inst('Spike', 1180, 604, { id: 's2d' }));
  L2.push(inst('Spike', 1280, 604, { id: 's2e' }));
  L2.push(inst('Spike', 1380, 604, { id: 's2f' }));
  // Platforms over gaps
  L2.push(inst('Platform', 420, 500, { width: 128, height: 32, zOrder: 0 }));
  L2.push(inst('MovingPlatform', 560, 420, {
    width: 128, height: 24, zOrder: 0,
    vars: [{ name: 'range', value: 70 }, { name: 'axis', value: 0 }, { name: 'speed', value: 1.4 }],
  }));
  L2.push(inst('Platform', 900, 480, { width: 160, height: 32, zOrder: 0 }));
  L2.push(inst('MovingPlatform', 1200, 400, {
    width: 128, height: 24, zOrder: 0,
    vars: [{ name: 'range', value: 60 }, { name: 'axis', value: 1 }, { name: 'speed', value: 1.6 }],
  }));
  L2.push(inst('Platform', 1450, 360, { width: 128, height: 32, zOrder: 0 }));
  L2.push(inst('Platform', 1700, 480, { width: 160, height: 32, zOrder: 0 }));
  // Enemies + bats
  L2.push(inst('Enemy', 800, 600, { id: 'e2a', vars: [{ name: 'range', value: 80 }] }));
  L2.push(inst('Enemy', 1600, 600, { id: 'e2b', vars: [{ name: 'range', value: 60 }] }));
  L2.push(inst('Bat', 600, 280, { id: 'b2a', vars: [{ name: 'range', value: 100 }] }));
  L2.push(inst('Bat', 1300, 260, { id: 'b2b', vars: [{ name: 'range', value: 80 }] }));
  L2.push(inst('Player', 48, 572, { width: 48, height: 48, zOrder: 5 }));
  L2.push(inst('Checkpoint', 950, 596, { zOrder: 2 }));
  L2.push(inst('Flag', 1900, 572, { zOrder: 3 }));
  L2.push(inst('ScoreText', 16, 12, { zOrder: 20 }));
  L2.push(inst('LivesText', 620, 12, { zOrder: 20 }));
  L2.push(inst('LevelText', 16, 42, { zOrder: 20 }));
  L2.push(inst('MessageText', 300, 250, { zOrder: 20 }));

  // Level 3: gauntlet + boss (2400 x 700)
  const L3 = [];
  L3.push(inst('Ground', 0, 636, { width: 500, height: 64, zOrder: 0 }));
  L3.push(inst('Ground', 700, 636, { width: 300, height: 64, zOrder: 0 }));
  L3.push(inst('Ground', 1200, 636, { width: 300, height: 64, zOrder: 0 }));
  L3.push(inst('Ground', 1800, 636, { width: 600, height: 64, zOrder: 0 })); // boss arena
  // Spike patterns
  for (let i = 0; i < 5; i++) {
    L3.push(inst('Spike', 520 + i * 36, 604, { id: `s3a-${i}` }));
  }
  for (let i = 0; i < 4; i++) {
    L3.push(inst('Spike', 1020 + i * 40, 604, { id: `s3b-${i}` }));
  }
  for (let i = 0; i < 3; i++) {
    L3.push(inst('Spike', 1520 + i * 40, 604, { id: `s3c-${i}` }));
  }
  // Climbing route
  L3.push(inst('Platform', 200, 500, { width: 128, height: 32, zOrder: 0 }));
  L3.push(inst('Platform', 400, 400, { width: 128, height: 32, zOrder: 0 }));
  L3.push(inst('MovingPlatform', 600, 340, {
    width: 128, height: 24, zOrder: 0,
    vars: [{ name: 'range', value: 90 }, { name: 'axis', value: 0 }, { name: 'speed', value: 1.5 }],
  }));
  L3.push(inst('Platform', 850, 420, { width: 128, height: 32, zOrder: 0 }));
  L3.push(inst('MovingPlatform', 1050, 320, {
    width: 112, height: 24, zOrder: 0,
    vars: [{ name: 'range', value: 50 }, { name: 'axis', value: 1 }, { name: 'speed', value: 1.8 }],
  }));
  L3.push(inst('Platform', 1300, 400, { width: 160, height: 32, zOrder: 0 }));
  L3.push(inst('MovingPlatform', 1550, 360, {
    width: 128, height: 24, zOrder: 0,
    vars: [{ name: 'range', value: 70 }, { name: 'axis', value: 0 }, { name: 'speed', value: 1.7 }],
  }));
  L3.push(inst('Platform', 1750, 480, { width: 128, height: 32, zOrder: 0 }));
  // Foes
  L3.push(inst('Enemy', 300, 600, { id: 'e3a', vars: [{ name: 'range', value: 70 }, { name: 'spd', value: 90 }] }));
  L3.push(inst('Enemy', 800, 600, { id: 'e3b', vars: [{ name: 'range', value: 50 }] }));
  L3.push(inst('Enemy', 1400, 600, { id: 'e3c', vars: [{ name: 'range', value: 60 }] }));
  L3.push(inst('Bat', 500, 240, { id: 'b3a', vars: [{ name: 'range', value: 110 }] }));
  L3.push(inst('Bat', 1000, 220, { id: 'b3b', vars: [{ name: 'range', value: 90 }] }));
  L3.push(inst('Bat', 1500, 200, { id: 'b3c', vars: [{ name: 'range', value: 100 }] }));
  // BOSS
  L3.push(inst('Boss', 2000, 560, {
    id: 'boss',
    vars: [{ name: 'hp', value: 3 }, { name: 'range', value: 140 }, { name: 'spd', value: 50 }],
  }));
  L3.push(inst('Player', 48, 572, { width: 48, height: 48, zOrder: 5 }));
  L3.push(inst('Checkpoint', 1320, 360, { zOrder: 2 }));
  L3.push(inst('Checkpoint', 1850, 596, { zOrder: 2, id: 'cp3b' }));
  L3.push(inst('Flag', 2280, 572, { zOrder: 3 }));
  L3.push(inst('ScoreText', 16, 12, { zOrder: 20 }));
  L3.push(inst('LivesText', 620, 12, { zOrder: 20 }));
  L3.push(inst('LevelText', 16, 42, { zOrder: 20 }));
  L3.push(inst('MessageText', 300, 250, { zOrder: 20 }));

  const layouts = [
    makeLayout({
      name: 'Level1', r: 20, g: 30, b: 55,
      instances: L1, objects: runnerObjects(), objectGroups: groups,
      events: runnerEvents({
        levelNum: 1, nextScene: 'Level2', startX: 48, startY: 472,
        levelW: 1600, levelH: 600, isFirst: true,
      }),
    }),
    makeLayout({
      name: 'Level2', r: 30, g: 20, b: 50,
      instances: L2, objects: runnerObjects(), objectGroups: groups,
      events: runnerEvents({
        levelNum: 2, nextScene: 'Level3', startX: 48, startY: 572,
        levelW: 2000, levelH: 700, isFirst: false,
      }),
    }),
    makeLayout({
      name: 'Level3', r: 40, g: 15, b: 40,
      instances: L3, objects: runnerObjects(), objectGroups: groups,
      events: runnerEvents({
        levelNum: 3, nextScene: null, startX: 48, startY: 572,
        levelW: 2400, levelH: 700, isFirst: false,
      }),
    }),
  ];

  return {
    firstLayout: 'Level1',
    gdVersion,
    properties: {
      adaptGameResolutionAtRuntime: true,
      antialiasingMode: 'MSAA',
      antialisingEnabledOnMobile: false,
      folderProject: false,
      orientation: 'landscape',
      packageName: 'com.pinkhorse.platformrunner',
      pixelsRounding: true,
      projectUuid: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      scaleMode: 'nearest',
      sizeOnStartupMode: 'adaptWidth',
      templateSlug: '',
      version: '2.0.0',
      name: 'Platform Runner',
      description: 'Dash through 3 action levels — stomp slimes, dodge bats, beat the boss!',
      author: 'Pink Horse of Whimsy',
      windowWidth: 800,
      windowHeight: 600,
      latestCompilationDirectory: '',
      maxFPS: 60,
      minFPS: 20,
      verticalSync: false,
      platformSpecificAssets: {},
      loadingScreen: {
        backgroundColor: 1710618,
        backgroundFadeInDuration: 0.2,
        backgroundImageResourceName: 'loading.png',
        gdevelopLogoStyle: 'light',
        logoAndProgressColor: 16777215,
        logoAndProgressLogoAndProgressFadeInDelay: 0.2,
        progressBarColor: 16777215,
        progressBarHeight: 20,
        progressBarMaxWidth: 200,
        progressBarMinWidth: 40,
        progressBarWidthPercent: 30,
        showGDevelopSplash: false,
        showProgressBar: true,
      },
      watermark: { placement: 'bottom-left', showWatermark: false },
      authorIds: [],
      authorUsernames: [],
      categories: [],
      playableDevices: ['keyboard', 'mobile'],
      extensionProperties: [],
      platforms: [{ name: 'GDevelop JS platform' }],
      currentPlatform: 'GDevelop JS platform',
    },
    resources: {
      resources: [
        imgRes('runner.png'), imgRes('spike.png'), imgRes('ground.png'),
        imgRes('enemy.png'), imgRes('loading.png'),
        imgRes('bat.png'), imgRes('boss.png'), imgRes('flag.png'),
        imgRes('checkpoint.png'), imgRes('moving-platform.png'),
        audioRes('coin-collect.mp3'), audioRes('jump.mp3'),
        audioRes('enemy-stomp.mp3'), audioRes('level-complete.mp3'),
      ],
      resourceFolders: [],
    },
    objects: [],
    objectsFolderStructure: { folderName: '__ROOT', children: [] },
    objectsGroups: [],
    variables: [
      { name: 'Score', type: 'number', value: 0 },
      { name: 'Lives', type: 'number', value: 3 },
      { name: 'CheckpointX', type: 'number', value: 64 },
      { name: 'CheckpointY', type: 'number', value: 472 },
      { name: 'LevelDone', type: 'number', value: 0 },
      { name: 'Invuln', type: 'number', value: 0 },
      { name: 'GameOver', type: 'number', value: 0 },
      { name: '__hit', type: 'number', value: 0 },
    ],
    layouts,
    externalEvents: [],
    eventsFunctionsExtensions: [],
    externalLayouts: [],
    externalSourceFiles: [],
  };
}

async function main() {
  const cc = buildCoinCollector();
  const pr = buildPlatformRunner();
  await writeFile(join(__dirname, 'coin-collector/game.json'), JSON.stringify(cc, null, 2));
  await writeFile(join(__dirname, 'platform-runner/game.json'), JSON.stringify(pr, null, 2));
  console.log('Wrote coin-collector/game.json and platform-runner/game.json');
  console.log('  Coin Collector levels:', cc.layouts.map(l => l.name).join(', '));
  console.log('  Platform Runner levels:', pr.layouts.map(l => l.name).join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
