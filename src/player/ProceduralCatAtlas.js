import * as THREE from 'three';

const ATLAS_W = 2048;
const ATLAS_H = 2048;
const CELL_W = 256;
const CELL_H = 136;
const GROUND_MARGIN = 12;

const CLIP_DEFS = [
  { name: 'idle', frames: 6, fps: 8, loop: true },
  { name: 'alert', frames: 6, fps: 12, loop: false },
  { name: 'run', frames: 8, fps: 14, loop: true },
  { name: 'run_left', frames: 8, fps: 14, loop: true },
  { name: 'run_right', frames: 8, fps: 14, loop: true },
  { name: 'sprint', frames: 8, fps: 18, loop: true },
  { name: 'overclock', frames: 8, fps: 22, loop: true },
  { name: 'slowmo', frames: 8, fps: 10, loop: true },
  { name: 'jump', frames: 6, fps: 14, loop: false },
  { name: 'fall', frames: 6, fps: 12, loop: true },
  { name: 'land', frames: 6, fps: 16, loop: false },
  { name: 'sit', frames: 6, fps: 8, loop: true },
  { name: 'catch', frames: 8, fps: 12, loop: false },
  { name: 'annoyed', frames: 6, fps: 10, loop: true },
  { name: 'flop_lose', frames: 8, fps: 12, loop: true }
];

// Gray British Shorthair Munchkin Palette
const PALETTE = {
  fur: '#6f7e94',
  furShade: '#536175',
  ink: '#0c111d',
  rim: '#a6bdd9',
  rimBright: '#38f3ff',
  innerEar: '#8e9bae',
  sock: '#cfd9e6',
  eye: '#f59e0b',
  eyeGlow: '#fcd34d',
  eyePupil: '#140c04',
  nose: '#475569'
};

function makePlushGrad(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.35, r * 0.1, cx, cy, r * 1.15);
  g.addColorStop(0, '#8898af');
  g.addColorStop(0.55, PALETTE.fur);
  g.addColorStop(1, PALETTE.furShade);
  return g;
}

function drawPaw(ctx, x, y, r = 6.2, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = PALETTE.sock;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.15, r * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Delicate toe-line creases
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.12);
  ctx.lineTo(-r * 0.25, r * 0.65);
  ctx.moveTo(r * 0.32, r * 0.12);
  ctx.lineTo(r * 0.25, r * 0.65);
  ctx.stroke();
  ctx.restore();
}

function drawShortLimb(ctx, x1, y1, cx, cy, x2, y2, width = 9.5, drawSock = true) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Ink border
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = width + 4.4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  // Plush gray fur
  ctx.strokeStyle = PALETTE.fur;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  // Soft plush highlight
  ctx.strokeStyle = PALETTE.rim;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x1 - 1.4, y1);
  ctx.quadraticCurveTo(cx - 1.8, cy, x2 - 1.4, y2 - 1.5);
  ctx.stroke();

  if (drawSock) {
    drawPaw(ctx, x2, y2, Math.max(4.8, width * 0.58));
  }
  ctx.restore();
}

function drawPlushTail(ctx, bx, by, points, overclock = false) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(
      points[0], points[1],
      points[2], points[3],
      points[4], points[5]
    );
  };

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 13.5;
  trace();
  ctx.stroke();

  ctx.strokeStyle = PALETTE.fur;
  ctx.lineWidth = 9.4;
  trace();
  ctx.stroke();

  ctx.strokeStyle = overclock ? PALETTE.rimBright : PALETTE.rim;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(bx - 1, by - 2);
  ctx.bezierCurveTo(
    points[0] - 1, points[1] - 2.5,
    points[2] - 1, points[3] - 2.5,
    points[4] - 1, points[5] - 2
  );
  ctx.stroke();
  ctx.restore();
}

function drawBritishHead(ctx, hx, hy, opts = {}) {
  const {
    yaw = 0, // -1 left turn, 0 rear, +1 right turn, 'front'
    earPerk = 0,
    tilt = 0,
    showEyes = false,
    lookDown = 0,
    overclock = false,
    angry = false
  } = opts;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);

  // British Shorthair ears: flattened airplane ears when angry!
  const earSpread = (angry ? 18.5 : 13.5) - Math.abs(yaw === 'front' ? 0 : yaw) * 2;
  const earTipY = (angry ? -16.5 : -24.5) - earPerk * 4;
  const yawOffset = yaw === 'front' ? 0 : yaw * 7;

  // Left Ear
  ctx.fillStyle = PALETTE.fur;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-earSpread - 5 + yawOffset * 0.4, -7);
  ctx.quadraticCurveTo(-earSpread - 7 + yawOffset * 0.5, earTipY, -earSpread - 3 + yawOffset * 0.5, earTipY);
  ctx.lineTo(-3 + yawOffset * 0.4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Ear
  ctx.beginPath();
  ctx.moveTo(earSpread + 5 + yawOffset * 0.4, -7);
  ctx.quadraticCurveTo(earSpread + 7 + yawOffset * 0.5, earTipY, earSpread + 3 + yawOffset * 0.5, earTipY);
  ctx.lineTo(3 + yawOffset * 0.4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner ears visible ONLY from the front view (never from behind)
  if (yaw === 'front') {
    ctx.fillStyle = PALETTE.innerEar;
    ctx.beginPath();
    ctx.moveTo(-earSpread - 2, -10);
    ctx.lineTo(-earSpread - 3, earTipY + 5);
    ctx.lineTo(-6, -15);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(earSpread + 2, -10);
    ctx.lineTo(earSpread + 3, earTipY + 5);
    ctx.lineTo(6, -15);
    ctx.closePath();
    ctx.fill();
  }

  // Iconic round chubby British Shorthair head with plush radial shading
  ctx.fillStyle = makePlushGrad(ctx, 0, -3, 22);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(0, -3, 21.5, 17.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (yaw === 'front') {
    // Subtle chubby cheek puff shading & plush tuft strokes
    ctx.fillStyle = PALETTE.furShade;
    ctx.beginPath();
    ctx.ellipse(-10, 4, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(10, 4, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Clean back-of-head nape shadow arc + subtle plush fur strokes (no face features from behind!)
    ctx.strokeStyle = PALETTE.furShade;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -2, 16.2, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();

    // Soft crown fur tuft wisps
    ctx.strokeStyle = PALETTE.rim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -17);
    ctx.quadraticCurveTo(-2, -21, 0, -18);
    ctx.quadraticCurveTo(2, -21, 4, -17);
    ctx.stroke();

    // On a sharp 3/4 turn, show only the chubby cheek silhouette curve on the turning side
    if (Math.abs(yaw) > 0.35) {
      const side = Math.sign(yaw);
      ctx.fillStyle = makePlushGrad(ctx, side * 15, 2, 8);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(side * 15, 2, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Rim highlight on plush crown
  ctx.strokeStyle = overclock ? PALETTE.rimBright : PALETTE.rim;
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.arc(0, -4, 18.5, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Big round golden-copper British Shorthair eyes + delicate whiskers ONLY in front view
  if (yaw === 'front') {
    const eyeY = -2.5 + lookDown * 3.8;
    // Soft pale muzzle pads
    ctx.fillStyle = PALETTE.sock;
    ctx.beginPath();
    ctx.ellipse(-4.2, 4.5 + lookDown * 2, 4.8, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(4.2, 4.5 + lookDown * 2, 4.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Delicate curved whiskers (3 per side)
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.lineWidth = 1.15;
    for (const dir of [-1, 1]) {
      for (const wy of [2.5, 5.0, 7.5]) {
        ctx.beginPath();
        ctx.moveTo(dir * 7, wy + lookDown * 2);
        ctx.quadraticCurveTo(dir * 16, wy - 1 + lookDown * 2, dir * 23, wy + (wy - 5) * 0.45 + lookDown * 2);
        ctx.stroke();
      }
    }

    for (const dir of [-1, 1]) {
      // Multi-stop gleaming golden-copper iris gradient
      const irisGrad = ctx.createRadialGradient(
        dir * 7.8 - 1.2, eyeY - 1.4, 0.6,
        dir * 7.8, eyeY, 4.9
      );
      irisGrad.addColorStop(0, '#fde68a');
      irisGrad.addColorStop(0.55, PALETTE.eye);
      irisGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = irisGrad;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(dir * 7.8, eyeY, 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = PALETTE.eyePupil;
      ctx.beginPath();
      ctx.ellipse(dir * 7.8, eyeY + lookDown * 0.7, 1.8, 3.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 7.8 - 1.5, eyeY - 1.6, 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dir * 7.8 + 1.3, eyeY + 1.3, 0.6, 0, Math.PI * 2);
      ctx.fill();

      if (angry) {
        // Furrowed angry brow slant glaring toward Lily
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(dir * 13.5, eyeY - 5.2);
        ctx.lineTo(dir * 3.2, eyeY - 2.2);
        ctx.stroke();
      }
    }

    // Little dark-gray button nose
    ctx.fillStyle = PALETTE.nose;
    ctx.beginPath();
    ctx.moveTo(-2.4, 2.2 + lookDown * 2.2);
    ctx.lineTo(2.4, 2.2 + lookDown * 2.2);
    ctx.lineTo(0, 4.8 + lookDown * 2.2);
    ctx.closePath();
    ctx.fill();

    if (angry) {
      // Grumpy downturned frown
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 11 + lookDown * 2, 4.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawRearOrAngledFrame(ctx, cx, groundY, clipName, phase, t) {
  const s = phase * Math.PI * 2;
  const isTurnLeft = clipName === 'run_left';
  const isTurnRight = clipName === 'run_right';
  const yaw = isTurnLeft ? -0.75 : isTurnRight ? 0.75 : 0;

  const isRun = clipName.startsWith('run');
  const isSprint = clipName === 'sprint' || clipName === 'overclock' || clipName === 'slowmo';
  const isOverclock = clipName === 'overclock';
  const isAlert = clipName === 'alert';
  const isJump = clipName === 'jump';
  const isFall = clipName === 'fall';
  const isLand = clipName === 'land';

  // Munchkin proportions: lower, plumper body close to the floor with short stubby legs
  let bodyY = groundY - 28;
  let bodyRx = 23.5;
  let bodyRy = 19.5;
  let headX = cx + yaw * 14;
  let headY = groundY - 52;
  let earPerk = isAlert ? Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5) : isSprint ? -0.22 : 0.1;

  if (clipName === 'idle') {
    const breath = Math.sin(s);
    bodyY = groundY - 27 + breath * 1.3;
    headY = groundY - 51 + breath * 1.5;
  } else if (isAlert) {
    const snap = Math.min(1, t * 2.0);
    bodyY = groundY - 27 - snap * 2.5;
    headY = groundY - 51 - snap * 5.0;
  } else if (isRun) {
    const stride = Math.sin(s);
    const bounce = Math.abs(Math.cos(s)) * 4.2;
    bodyY = groundY - 28 - bounce;
    headY = groundY - 52 - bounce * 0.85;
    bodyRx = 23.5 + Math.abs(yaw) * 7;
    bodyRy = 19 - Math.abs(stride) * 1.4;
  } else if (isSprint) {
    const gallop = Math.sin(s);
    const lift = Math.max(0, Math.sin(s + 0.4)) * 7;
    bodyY = groundY - 29 - lift;
    headY = groundY - 50 - lift * 0.7;
    bodyRx = 24 + (isOverclock ? 2 : 0);
    bodyRy = 17.5 + gallop * 1.8;
  } else if (isJump) {
    const crouch = t < 0.25 ? (0.25 - t) * 32 : 0;
    const rise = t >= 0.25 ? Math.sin(((t - 0.25) / 0.75) * Math.PI * 0.5) * 24 : 0;
    bodyY = groundY - 27 + crouch - rise;
    headY = groundY - 51 + crouch * 0.9 - rise * 1.06;
    bodyRy = t < 0.25 ? 16 : 22;
  } else if (isFall) {
    const sway = Math.sin(s) * 2;
    bodyY = groundY - 46 + sway;
    headY = groundY - 69 + sway;
    bodyRy = 20;
  } else if (isLand) {
    const squash = Math.sin(t * Math.PI);
    bodyY = groundY - 26 + squash * 7;
    headY = groundY - 50 + squash * 8;
    bodyRx = 24.5 + squash * 4;
    bodyRy = 18 - squash * 3.5;
  }

  const strideA = Math.sin(s);
  const strideB = Math.sin(s + Math.PI);

  // Plush tail
  const tailBaseX = cx - yaw * 12;
  const tailBaseY = bodyY + 8;
  let tailPts;
  if (clipName === 'idle' || isAlert) {
    const sw = Math.sin(s) * 15;
    tailPts = [
      tailBaseX + 14 + sw * 0.4, tailBaseY + 10,
      tailBaseX + 32 + sw * 0.8, tailBaseY + 4 - (isAlert ? 12 : 0),
      tailBaseX + 38 + sw, tailBaseY - 12 - (isAlert ? 14 : 0)
    ];
  } else if (isJump || isFall) {
    const whip = Math.sin(s) * 9;
    tailPts = [
      tailBaseX + 8, tailBaseY + 18,
      tailBaseX + 18 + whip, tailBaseY + 26,
      tailBaseX + 26 + whip, tailBaseY + 16
    ];
  } else {
    const whip = Math.sin(s + 0.8) * (isSprint ? 18 : 14);
    const trailDir = yaw !== 0 ? -Math.sign(yaw) : 1;
    tailPts = [
      tailBaseX + trailDir * 15 + whip * 0.4, tailBaseY + 2,
      tailBaseX + trailDir * 28 + whip * 0.7, tailBaseY - 12,
      tailBaseX + trailDir * 39 + whip, tailBaseY - 24
    ];
  }

  // Short stubby front limbs peeking on turns / sprint
  if (Math.abs(yaw) > 0.1 || isSprint || isJump || isFall) {
    const reach = isSprint ? strideA * 10 : isJump ? -8 : strideA * 7;
    const fx = cx + yaw * 22;
    drawShortLimb(ctx, fx - 6, bodyY + 6, fx - 10 + reach * 0.3, bodyY + 14, fx - 7 + reach, groundY - (isJump || isFall ? 14 : 4), 8.5);
    drawShortLimb(ctx, fx + 6, bodyY + 6, fx + 9 - reach * 0.3, bodyY + 14, fx + 7 - reach * 0.6, groundY - (isJump || isFall ? 12 : 4), 8.5);
  }

  // Plump round British Shorthair torso
  ctx.save();
  ctx.translate(cx, bodyY);
  ctx.rotate(yaw * 0.2);
  ctx.fillStyle = makePlushGrad(ctx, 0, 0, bodyRx);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyRx, bodyRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle shaded lower belly
  ctx.fillStyle = PALETTE.furShade;
  ctx.beginPath();
  ctx.ellipse(0, bodyRy * 0.35, bodyRx * 0.78, bodyRy * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pale-silver chest puff on turns
  if (Math.abs(yaw) > 0.35) {
    ctx.fillStyle = PALETTE.sock;
    ctx.beginPath();
    ctx.moveTo(yaw * 17, -5);
    ctx.lineTo(yaw * 24, 2);
    ctx.lineTo(yaw * 16, 7);
    ctx.closePath();
    ctx.fill();
  }

  // Plush rim highlight
  ctx.strokeStyle = isOverclock ? PALETTE.rimBright : PALETTE.rim;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(0, -2, bodyRx - 2.5, bodyRy - 3, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();

  // Short stubby Munchkin hind legs!
  if (clipName === 'idle' || isAlert || isLand) {
    const squat = isLand ? 3 : 0;
    drawShortLimb(ctx, cx - 10, bodyY + 9, cx - 12, groundY - 9 + squat, cx - 10, groundY - 4, 9.5);
    drawShortLimb(ctx, cx + 10, bodyY + 9, cx + 12, groundY - 9 + squat, cx + 10, groundY - 4, 9.5);
  } else if (isJump || isFall) {
    drawShortLimb(ctx, cx - 10, bodyY + 10, cx - 14, bodyY + 18, cx - 12, bodyY + 24, 9.5);
    drawShortLimb(ctx, cx + 10, bodyY + 10, cx + 14, bodyY + 18, cx + 12, bodyY + 24, 9.5);
  } else {
    const kickL = isSprint ? strideA * 9 : strideA * 7;
    const kickR = isSprint ? strideB * 9 : strideB * 7;
    const liftL = Math.max(0, -strideA) * (isSprint ? 10 : 7);
    const liftR = Math.max(0, -strideB) * (isSprint ? 10 : 7);
    drawShortLimb(ctx, cx - 10 - yaw * 4, bodyY + 9, cx - 13 - yaw * 4, bodyY + 16, cx - 11 + kickL * 0.35, groundY - 4 - liftL, 9.5);
    drawShortLimb(ctx, cx + 10 - yaw * 4, bodyY + 9, cx + 13 - yaw * 4, bodyY + 16, cx + 11 + kickR * 0.35, groundY - 4 - liftR, 9.5);
  }

  // Round British Shorthair Head
  drawBritishHead(ctx, headX, headY, {
    yaw,
    earPerk,
    tilt: yaw * 0.14 + (isRun || isSprint ? Math.sin(s) * 0.04 : 0),
    overclock: isOverclock
  });

  // Plush tail over haunches
  drawPlushTail(ctx, tailBaseX, tailBaseY, tailPts, isOverclock);
}

function drawEndingFrame(ctx, cx, groundY, clipName, phase, t) {
  const s = phase * Math.PI * 2;
  const isCatch = clipName === 'catch';
  const isAnnoyed = clipName === 'annoyed';
  const isFlop = clipName === 'flop_lose';

  if (isFlop) {
    // Funny splat belly-flop flat on the floor when Lily steals the laser!
    const twitch = Math.sin(s * 2) * 1.5;
    drawPlushTail(ctx, cx - 22, groundY - 12, [
      cx - 42, groundY - 16,
      cx - 56, groundY - 26 + twitch,
      cx - 46, groundY - 36 + twitch
    ], false);

    // Splayed short hind legs sticking out sideways
    drawShortLimb(ctx, cx - 18, groundY - 10, cx - 28, groundY - 7, cx - 34, groundY - 4, 7.5);
    drawShortLimb(ctx, cx + 18, groundY - 10, cx + 28, groundY - 7, cx + 34, groundY - 4, 7.5);

    // Flat splatted plush torso on floor
    ctx.save();
    ctx.fillStyle = makePlushGrad(ctx, cx, groundY - 13, 30);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 13, 31, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Tiny front paws stretched forward empty-handed
    drawShortLimb(ctx, cx - 14, groundY - 12, cx - 20, groundY - 6, cx - 22, groundY - 4, 7.5);
    drawShortLimb(ctx, cx + 14, groundY - 12, cx + 20, groundY - 6, cx + 22, groundY - 4, 7.5);

    // Angry grumpy Munchkin face squished low on the floor glaring at Lily!
    drawBritishHead(ctx, cx, groundY - 24 + twitch * 0.5, {
      yaw: 'front',
      tilt: -0.08,
      lookDown: 0.1,
      angry: true
    });
    return;
  }

  const pounce = isCatch ? Math.sin(Math.min(1, t * 2.2) * Math.PI * 0.5) : 0;

  // Plush tail curled softly (or bristling high when annoyed!)
  const sw = Math.sin(s) * (isAnnoyed ? 12 : 5);
  drawPlushTail(ctx, cx + 15, groundY - 10, isAnnoyed ? [
    cx + 30, groundY - 24,
    cx + 42, groundY - 46 + sw * 0.4,
    cx + 36, groundY - 64 + sw
  ] : [
    cx + 38, groundY - 5,
    cx + 52, groundY - 12 + sw * 0.4,
    cx + 46, groundY - 22 + sw
  ], false);

  // Plump seated Munchkin torso
  ctx.save();
  ctx.fillStyle = makePlushGrad(ctx, cx, groundY - 22 + pounce * 3, 23);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - 22 + pounce * 3, 23, 20 - pounce * 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Soft pale-silver chest puff
  ctx.fillStyle = PALETTE.sock;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - 31 + pounce * 3, 6.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rim highlight
  ctx.strokeStyle = PALETTE.rim;
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.arc(cx, groundY - 22 + pounce * 3, 19.5, Math.PI * 1.1, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();

  // Cute tucked short hind paws
  drawPaw(ctx, cx - 16, groundY - 5, 5.8);
  drawPaw(ctx, cx + 16, groundY - 5, 5.8);

  // Stubby short front legs + paws pinning the laser dot in catch
  if (isCatch) {
    const reach = pounce * 10;
    drawShortLimb(ctx, cx - 8, groundY - 24, cx - 9, groundY - 13, cx - 6, groundY - 4 + reach * 0.18, 8.2);
    drawShortLimb(ctx, cx + 8, groundY - 24, cx + 9, groundY - 13, cx + 5, groundY - 4 + reach * 0.18, 8.2);

    const pulse = 0.75 + Math.sin(s * 2) * 0.25;
    const grad = ctx.createRadialGradient(cx, groundY - 2, 1, cx, groundY - 2, 16);
    grad.addColorStop(0, `rgba(255, 70, 100, ${0.95 * pulse})`);
    grad.addColorStop(1, 'rgba(255, 42, 75, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, groundY - 2, 16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawShortLimb(ctx, cx - 7, groundY - 26, cx - 8, groundY - 14, cx - 7, groundY - 4, 8.2);
    drawShortLimb(ctx, cx + 7, groundY - 26, cx + 8, groundY - 14, cx + 7, groundY - 4, 8.2);
  }

  // Round British Shorthair head looking at laser dot or glaring annoyed at Lily
  drawBritishHead(ctx, cx, groundY - 47 + pounce * 6 + (isAnnoyed ? 3 : 0), {
    yaw: 'front',
    earPerk: isCatch ? 0.3 : 0.15,
    tilt: isCatch ? Math.sin(t * Math.PI * 2) * 0.06 : isAnnoyed ? 0.08 : 0,
    lookDown: isCatch ? 0.85 : isAnnoyed ? 0.05 : 0.35,
    angry: isAnnoyed
  });
}

export function buildProceduralCatAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, ATLAS_W, ATLAS_H);

  const clips = {};

  CLIP_DEFS.forEach((clip, rowIndex) => {
    const frames = [];
    for (let i = 0; i < clip.frames; i++) {
      const col = i;
      const x = col * CELL_W;
      const y = rowIndex * CELL_H;
      const cx = x + CELL_W * 0.5;
      const groundY = y + CELL_H - GROUND_MARGIN;
      const phase = i / clip.frames;
      const t = clip.frames > 1 ? i / (clip.frames - 1) : 0;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
      ctx.clip();

      if (
        clip.name === 'sit' ||
        clip.name === 'catch' ||
        clip.name === 'annoyed' ||
        clip.name === 'flop_lose'
      ) {
        drawEndingFrame(ctx, cx, groundY, clip.name, phase, t);
      } else {
        drawRearOrAngledFrame(ctx, cx, groundY, clip.name, phase, t);
      }
      ctx.restore();

      frames.push({
        u0: (x + 2) / ATLAS_W,
        v0: 1 - (y + CELL_H - 2) / ATLAS_H,
        u1: (x + CELL_W - 2) / ATLAS_W,
        v1: 1 - (y + 2) / ATLAS_H
      });
    }

    clips[clip.name] = {
      fps: clip.fps,
      loop: clip.loop,
      frameCount: clip.frames,
      frames
    };
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return {
    texture,
    manifest: {
      atlasWidth: ATLAS_W,
      atlasHeight: ATLAS_H,
      cellWidth: CELL_W,
      cellHeight: CELL_H,
      groundPivotY: GROUND_MARGIN / CELL_H,
      clips
    }
  };
}
