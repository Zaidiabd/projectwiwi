import * as THREE from 'three';

const CELL_W = 256;
const CELL_H = 170;
const GROUND_MARGIN = 12;

const REAL_ATLAS_W = 2048;
const REAL_ATLAS_H = 1024;

const CLIP_DEFS = [
  { name: 'run_rear', frames: 8, fps: 16, loop: true },
  { name: 'trot', frames: 8, fps: 14, loop: true },
  { name: 'pounce', frames: 8, fps: 14, loop: false },
  { name: 'sit_smug', frames: 6, fps: 8, loop: true },
  { name: 'shocked', frames: 6, fps: 12, loop: false },
  { name: 'sulking', frames: 6, fps: 8, loop: true }
];

const PALETTE = {
  black: '#161a24',
  blackShade: '#0d1017',
  white: '#f1f5f9',
  whiteShade: '#cbd5e1',
  ink: '#05070c',
  rim: '#8aa3bf',
  earInner: '#d8b4c8',
  eye: '#34d399', // bright emerald green eyes
  pupil: '#06140e',
  nose: '#f472b6'
};

function drawFluffyTail(ctx, bx, by, pts) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
  };

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 22;
  trace();
  ctx.stroke();

  ctx.strokeStyle = PALETTE.black;
  ctx.lineWidth = 17;
  trace();
  ctx.stroke();

  // Fluffy white tail tip!
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(pts[2], pts[3]);
  ctx.quadraticCurveTo((pts[2] + pts[4]) * 0.5, (pts[3] + pts[5]) * 0.5, pts[4], pts[5]);
  ctx.stroke();
  ctx.restore();
}

function drawLongLimb(ctx, x1, y1, cx, cy, x2, y2, width = 11) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = width + 4.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.black;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();

  // White tuxedo mitten paw with delicate toe-line creases
  ctx.fillStyle = PALETTE.white;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(x2, y2, 8.2, 5.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x2 - 2.6, y2 + 0.8);
  ctx.lineTo(x2 - 2.2, y2 + 4.8);
  ctx.moveTo(x2 + 2.6, y2 + 0.8);
  ctx.lineTo(x2 + 2.2, y2 + 4.8);
  ctx.stroke();
  ctx.restore();
}

function drawLilyHead(ctx, hx, hy, opts = {}) {
  const { facing = 'front', tilt = 0, expression = 'smug', earTufts = true } = opts;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);

  // Ears with long-haired lynx tufts
  for (const dir of [-1, 1]) {
    ctx.fillStyle = PALETTE.black;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(dir * 9, -15);
    ctx.lineTo(dir * 22, -36);
    ctx.lineTo(dir * 21, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner ear fluff
    ctx.fillStyle = PALETTE.earInner;
    ctx.beginPath();
    ctx.moveTo(dir * 11, -15);
    ctx.lineTo(dir * 19, -29);
    ctx.lineTo(dir * 19, -10);
    ctx.closePath();
    ctx.fill();

    if (earTufts) {
      ctx.strokeStyle = PALETTE.white;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(dir * 12, -16);
      ctx.lineTo(dir * 16, -21);
      ctx.stroke();
    }
  }

  // Fluffy long-haired cheek ruffs + head base
  ctx.fillStyle = PALETTE.black;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-24, -4);
  ctx.quadraticCurveTo(-29, 4, -22, 11); // left fluff tuft
  ctx.quadraticCurveTo(-18, 17, 0, 17);
  ctx.quadraticCurveTo(18, 17, 22, 11);  // right fluff tuft
  ctx.quadraticCurveTo(29, 4, 24, -4);
  ctx.quadraticCurveTo(20, -21, 0, -21);
  ctx.quadraticCurveTo(-20, -21, -24, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White tuxedo muzzle + nose bridge blaze
  ctx.fillStyle = PALETTE.white;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-4, 0);
  ctx.quadraticCurveTo(-14, 3, -12, 12);
  ctx.quadraticCurveTo(0, 17, 12, 12);
  ctx.quadraticCurveTo(14, 3, 4, 0);
  ctx.closePath();
  ctx.fill();

  // Rim highlight
  ctx.strokeStyle = PALETTE.rim;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -4, 19.5, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Expressive emerald eyes + delicate white whiskers
  const eyeOffset = facing === 'left' ? -3 : 0;
  if (facing === 'front') {
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.78)';
    ctx.lineWidth = 1.25;
    for (const dir of [-1, 1]) {
      for (const wy of [4.5, 7.0, 9.5]) {
        ctx.beginPath();
        ctx.moveTo(dir * 9, wy);
        ctx.quadraticCurveTo(dir * 19, wy - 1.2, dir * 27, wy + (wy - 7) * 0.45);
        ctx.stroke();
      }
    }
  }

  for (const dir of [-1, 1]) {
    const ex = dir * 9 + eyeOffset;
    const ey = -3;

    if (expression === 'smug') {
      // Half-lidded smug victorious eyes
      ctx.fillStyle = PALETTE.eye;
      ctx.beginPath();
      ctx.ellipse(ex, ey + 1, 5.2, 3.4, dir * -0.1, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ex - 5.5, ey + 0.5);
      ctx.lineTo(ex + 5.5, ey + 0.5);
      ctx.stroke();
    } else if (expression === 'shocked') {
      // Giant round startled eyes with tiny pinprick pupils!
      const irisGrad = ctx.createRadialGradient(ex - 1, ey - 1, 0.5, ex, ey, 6.2);
      irisGrad.addColorStop(0, '#a7f3d0');
      irisGrad.addColorStop(0.6, PALETTE.eye);
      irisGrad.addColorStop(1, '#047857');
      ctx.fillStyle = irisGrad;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ex, ey, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.pupil;
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const irisGrad = ctx.createRadialGradient(ex - 1.2, ey - 1.2, 0.5, ex, ey, 5.0);
      irisGrad.addColorStop(0, '#a7f3d0');
      irisGrad.addColorStop(0.6, PALETTE.eye);
      irisGrad.addColorStop(1, '#047857');
      ctx.fillStyle = irisGrad;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ex, ey, 5.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.pupil;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 1.8, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.3, ey - 1.4, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pink button nose
  ctx.fillStyle = PALETTE.nose;
  ctx.beginPath();
  ctx.moveTo(-2.8 + eyeOffset, 4);
  ctx.lineTo(2.8 + eyeOffset, 4);
  ctx.lineTo(eyeOffset, 7);
  ctx.closePath();
  ctx.fill();

  // Smug little `:3` smile or shocked `o` mouth
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  if (expression === 'shocked') {
    ctx.beginPath();
    ctx.arc(eyeOffset, 10.5, 2.8, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(eyeOffset - 3, 8.5, 3, 0, Math.PI);
    ctx.arc(eyeOffset + 3, 8.5, 3, 0, Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawLilyFrame(ctx, cx, groundY, clipName, phase, t) {
  const s = phase * Math.PI * 2;

  if (clipName === 'run_rear') {
    // Big fluffy long-haired black-and-white cat seen from behind bounding alongside Wiwi!
    const bounce = Math.max(0, Math.sin(s + 0.3)) * 10;
    const strideA = Math.sin(s);
    const strideB = Math.sin(s + Math.PI);
    const bodyY = groundY - 48 - bounce;
    const headY = groundY - 82 - bounce * 0.85;

    // Back-of-head + fluffy cheek tufts (no eyes from behind!)
    ctx.save();
    for (const dir of [-1, 1]) {
      ctx.fillStyle = PALETTE.black;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx + dir * 10, headY - 12);
      ctx.lineTo(cx + dir * 21, headY - 34);
      ctx.lineTo(cx + dir * 20, headY - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = PALETTE.black;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx - 24, headY - 2);
    ctx.quadraticCurveTo(cx - 28, headY + 6, cx - 21, headY + 13);
    ctx.quadraticCurveTo(cx, headY + 18, cx + 21, headY + 13);
    ctx.quadraticCurveTo(cx + 28, headY + 6, cx + 24, headY - 2);
    ctx.quadraticCurveTo(cx + 19, headY - 19, cx, headY - 19);
    ctx.quadraticCurveTo(cx - 19, headY - 19, cx - 24, headY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fluffy white cheek ruff tips peeking on each side
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath();
    ctx.ellipse(cx - 22, headY + 6, 4.5, 5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + 22, headY + 6, 4.5, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy big black tuxedo torso
    ctx.fillStyle = PALETTE.black;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(cx, bodyY, 27, 25 + strideA * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = PALETTE.rim;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(cx, bodyY - 2, 24, 22, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();

    // Long athletic hind legs with white mittens kicking back
    const liftL = Math.max(0, -strideA) * 18;
    const liftR = Math.max(0, -strideB) * 18;
    drawLongLimb(ctx, cx - 13, bodyY + 12, cx - 18, bodyY + 28, cx - 14 + strideA * 6, groundY - 5 - liftL, 10.5);
    drawLongLimb(ctx, cx + 13, bodyY + 12, cx + 18, bodyY + 28, cx + 14 + strideB * 6, groundY - 5 - liftR, 10.5);

    // Big fluffy black-and-white plumed tail streaming behind!
    const whip = Math.sin(s + 0.6) * 20;
    drawFluffyTail(ctx, cx, bodyY + 10, [
      cx + 18 + whip * 0.4, bodyY + 2,
      cx + 38 + whip * 0.7, bodyY - 18,
      cx + 52 + whip, bodyY - 34
    ]);
    return;
  }

  if (clipName === 'trot') {
    const bounce = Math.abs(Math.sin(s)) * 7;
    const stride = Math.sin(s);

    // Big fluffy tail waving behind
    drawFluffyTail(ctx, cx + 24, groundY - 46 - bounce, [
      cx + 46, groundY - 62 - bounce,
      cx + 66, groundY - 82 + Math.sin(s) * 8,
      cx + 56, groundY - 102 + Math.sin(s) * 10
    ]);

    // Back legs
    drawLongLimb(ctx, cx + 12, groundY - 38 - bounce, cx + 18, groundY - 18, cx + 16 + stride * 12, groundY - 5 - Math.max(0, stride) * 8);
    drawLongLimb(ctx, cx - 10, groundY - 38 - bounce, cx - 16, groundY - 18, cx - 14 - stride * 12, groundY - 5 - Math.max(0, -stride) * 8);

    // Big fluffy black body + white bib
    ctx.save();
    ctx.fillStyle = PALETTE.black;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(cx + 2, groundY - 46 - bounce, 34, 24, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fluffy white tuxedo chest bib
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath();
    ctx.ellipse(cx - 18, groundY - 40 - bounce, 14, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Front legs
    drawLongLimb(ctx, cx - 22, groundY - 38 - bounce, cx - 28, groundY - 18, cx - 26 - stride * 14, groundY - 5 - Math.max(0, -stride) * 10);
    drawLongLimb(ctx, cx - 8, groundY - 38 - bounce, cx - 12, groundY - 18, cx - 10 + stride * 14, groundY - 5 - Math.max(0, stride) * 10);

    drawLilyHead(ctx, cx - 20, groundY - 76 - bounce, { facing: 'left', expression: 'happy', tilt: -0.05 });
    return;
  }

  if (clipName === 'pounce') {
    const leap = Math.sin(Math.min(1, t * 1.1) * Math.PI);
    const bodyY = groundY - 42 - leap * 24;
    const reach = t * 18;

    drawFluffyTail(ctx, cx + 26, bodyY - 4, [
      cx + 50, bodyY - 14,
      cx + 72, bodyY - 26,
      cx + 68, bodyY - 44
    ]);

    drawLongLimb(ctx, cx + 16, bodyY + 8, cx + 26, bodyY + 24, cx + 28, groundY - 5 - leap * 14);

    ctx.save();
    ctx.fillStyle = PALETTE.black;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(cx, bodyY, 36, 22, -0.15 + t * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.white;
    ctx.beginPath();
    ctx.ellipse(cx - 20, bodyY + 4, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Giant white mitten reaching down onto the laser dot
    drawLongLimb(ctx, cx - 18, bodyY + 6, cx - 24, groundY - 18, cx - 24 - reach * 0.3, groundY - 5 - leap * 10);
    drawLilyHead(ctx, cx - 22, bodyY - 28, { facing: 'left', expression: 'happy', tilt: 0.12 });
    return;
  }

  // Seated / standing poses (sit_smug, shocked, sulking)
  const isSmug = clipName === 'sit_smug';
  const isShocked = clipName === 'shocked';
  const isSulking = clipName === 'sulking';
  const jumpUp = isShocked ? Math.sin(Math.min(1, t * 1.4) * Math.PI) * 18 : 0;
  const sw = Math.sin(s) * 10;

  drawFluffyTail(ctx, cx + 20, groundY - 20 - jumpUp, [
    cx + 48, groundY - 16 - jumpUp,
    cx + 68, groundY - 44 - jumpUp + sw * 0.4,
    cx + 52, groundY - 72 - jumpUp + sw
  ]);

  // Big fluffy seated tuxedo torso
  ctx.save();
  ctx.fillStyle = PALETTE.black;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - 42 - jumpUp, 29, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Huge fluffy white chest ruff
  ctx.fillStyle = PALETTE.white;
  ctx.beginPath();
  ctx.moveTo(cx - 14, groundY - 68 - jumpUp);
  ctx.quadraticCurveTo(cx - 22, groundY - 44 - jumpUp, cx - 10, groundY - 24 - jumpUp);
  ctx.quadraticCurveTo(cx, groundY - 18 - jumpUp, cx + 10, groundY - 24 - jumpUp);
  ctx.quadraticCurveTo(cx + 22, groundY - 44 - jumpUp, cx + 14, groundY - 68 - jumpUp);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Front legs + white mittens
  drawLongLimb(ctx, cx - 10, groundY - 46 - jumpUp, cx - 11, groundY - 22 - jumpUp, cx - 10, groundY - 5 - jumpUp * 0.8);
  drawLongLimb(ctx, cx + 10, groundY - 46 - jumpUp, cx + 11, groundY - 22 - jumpUp, cx + 10, groundY - 5 - jumpUp * 0.8);

  if (isSmug) {
    // Laser dot trapped squarely under Lily's giant white paw!
    const pulse = 0.75 + Math.sin(s * 2) * 0.25;
    const grad = ctx.createRadialGradient(cx - 10, groundY - 3, 1, cx - 10, groundY - 3, 18);
    grad.addColorStop(0, `rgba(255, 70, 100, ${0.95 * pulse})`);
    grad.addColorStop(1, 'rgba(255, 42, 75, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx - 10, groundY - 3, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLilyHead(ctx, cx, groundY - 88 - jumpUp + (isSulking ? 6 : 0), {
    facing: 'front',
    expression: isSmug ? 'smug' : isShocked ? 'shocked' : 'normal',
    tilt: isSulking ? 0.15 : isSmug ? -0.06 : 0
  });
}

export function buildLilyCatAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = REAL_ATLAS_W;
  canvas.height = REAL_ATLAS_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, REAL_ATLAS_W, REAL_ATLAS_H);

  const clips = {};

  CLIP_DEFS.forEach((clip, rowIndex) => {
    const frames = [];
    for (let i = 0; i < clip.frames; i++) {
      const x = i * CELL_W;
      const y = rowIndex * CELL_H;
      const cx = x + CELL_W * 0.5;
      const groundY = y + CELL_H - GROUND_MARGIN;
      const phase = i / clip.frames;
      const t = clip.frames > 1 ? i / (clip.frames - 1) : 0;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
      ctx.clip();
      drawLilyFrame(ctx, cx, groundY, clip.name, phase, t);
      ctx.restore();

      frames.push({
        u0: (x + 2) / REAL_ATLAS_W,
        v0: 1 - (y + CELL_H - 2) / REAL_ATLAS_H,
        u1: (x + CELL_W - 2) / REAL_ATLAS_W,
        v1: 1 - (y + 2) / REAL_ATLAS_H
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
      atlasWidth: REAL_ATLAS_W,
      atlasHeight: REAL_ATLAS_H,
      cellWidth: CELL_W,
      cellHeight: CELL_H,
      groundPivotY: GROUND_MARGIN / CELL_H,
      clips
    }
  };
}
