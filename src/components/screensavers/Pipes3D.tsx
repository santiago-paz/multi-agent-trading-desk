'use client';

import React, { useEffect, useRef } from 'react';

interface Pipes3DProps {
  isFullScreen?: boolean;
}

const VERT_SRC = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform mat3 uNormalMat;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vPos = worldPos.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uProj * uView * worldPos;
}`;

const FRAG_SRC = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPos;
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform vec3 uViewPos;
uniform float uShininess;
uniform float uSpecular;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(-uLightDir);
  vec3 V = normalize(uViewPos - vPos);
  vec3 R = reflect(-L, N);
  float ambient = 0.22;
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(R, V), 0.0), uShininess);
  vec3 color = uColor * (ambient + diff * 0.78) + vec3(1.0) * spec * uSpecular;
  gl_FragColor = vec4(color, 1.0);
}`;

type M4 = Float32Array;
type V3 = [number, number, number];

function m4Identity(): M4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function m4Multiply(a: M4, b: M4): M4 {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += a[k * 4 + j] * b[i * 4 + k];
      out[i * 4 + j] = v;
    }
  }
  return out;
}

function m4Perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function m4LookAt(eye: V3, target: V3, up: V3): M4 {
  const ex = eye[0], ey = eye[1], ez = eye[2];
  let zx = ex - target[0], zy = ey - target[1], zz = ez - target[2];
  const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  const xl = Math.hypot(xx, xy, xz); xx /= xl; xy /= xl; xz /= xl;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  const out = new Float32Array(16);
  out[0] = xx; out[1] = yx; out[2] = zx;
  out[4] = xy; out[5] = yy; out[6] = zy;
  out[8] = xz; out[9] = yz; out[10] = zz;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  out[15] = 1;
  return out;
}

function m4Translate(x: number, y: number, z: number): M4 {
  const m = m4Identity();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

function m4Scale(x: number, y: number, z: number): M4 {
  const m = new Float32Array(16);
  m[0] = x; m[5] = y; m[10] = z; m[15] = 1;
  return m;
}

// Build rotation that maps +Z onto the given unit direction.
function m4AlignZ(dir: V3): M4 {
  const dx = dir[0], dy = dir[1], dz = dir[2];
  if (dx === 0 && dy === 0 && dz === 1) return m4Identity();
  if (dx === 0 && dy === 0 && dz === -1) {
    const m = m4Identity();
    m[5] = -1; m[10] = -1;
    return m;
  }
  const ax = -dy, ay = dx, az = 0;
  const al = Math.hypot(ax, ay, az);
  const nx = ax / al, ny = ay / al, nz = az / al;
  const c = dz;
  const s = Math.sqrt(Math.max(0, 1 - c * c));
  const t = 1 - c;
  const m = m4Identity();
  m[0] = t * nx * nx + c;
  m[1] = t * nx * ny + s * nz;
  m[2] = t * nx * nz - s * ny;
  m[4] = t * nx * ny - s * nz;
  m[5] = t * ny * ny + c;
  m[6] = t * ny * nz + s * nx;
  m[8] = t * nx * nz + s * ny;
  m[9] = t * ny * nz - s * nx;
  m[10] = t * nz * nz + c;
  return m;
}

function m3NormalFromM4(m: M4): Float32Array {
  const a00 = m[0], a01 = m[1], a02 = m[2];
  const a10 = m[4], a11 = m[5], a12 = m[6];
  const a20 = m[8], a21 = m[9], a22 = m[10];
  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  const det = a00 * b01 + a01 * b11 + a02 * b21;
  const id = det !== 0 ? 1 / det : 0;
  const out = new Float32Array(9);
  out[0] = b01 * id;
  out[1] = (-a22 * a01 + a02 * a21) * id;
  out[2] = (a12 * a01 - a02 * a11) * id;
  out[3] = b11 * id;
  out[4] = (a22 * a00 - a02 * a20) * id;
  out[5] = (-a12 * a00 + a02 * a10) * id;
  out[6] = b21 * id;
  out[7] = (-a21 * a00 + a01 * a20) * id;
  out[8] = (a11 * a00 - a01 * a10) * id;
  return out;
}

interface Mesh {
  vbo: WebGLBuffer;
  nbo: WebGLBuffer;
  ibo: WebGLBuffer;
  count: number;
}

// Cylinder along +Z, length 1 (z in [0,1]), radius 1, open-ended.
function buildCylinder(gl: WebGLRenderingContext, sides: number): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const cx = Math.cos(a), sy = Math.sin(a);
    positions.push(cx, sy, 0); normals.push(cx, sy, 0);
    positions.push(cx, sy, 1); normals.push(cx, sy, 0);
  }
  for (let i = 0; i < sides; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  return uploadMesh(gl, positions, normals, indices);
}

// UV sphere centered at origin, radius 1.
function buildSphere(gl: WebGLRenderingContext, rings: number, sectors: number): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    for (let s = 0; s <= sectors; s++) {
      const theta = (s / sectors) * Math.PI * 2;
      const st = Math.sin(theta), ct = Math.cos(theta);
      const x = sp * ct, y = cp, z = sp * st;
      positions.push(x, y, z);
      normals.push(x, y, z);
    }
  }
  const stride = sectors + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const a = r * stride + s;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return uploadMesh(gl, positions, normals, indices);
}

function uploadMesh(gl: WebGLRenderingContext, positions: number[], normals: number[], indices: number[]): Mesh {
  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const nbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  const ibo = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return { vbo, nbo, ibo, count: indices.length };
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader compile error');
  }
  return sh;
}

function linkProgram(gl: WebGLRenderingContext): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || 'program link error');
  }
  return prog;
}

const DIRS: V3[] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

interface Segment {
  // Cell entered at this step (before the move it occupies `from` cell). Stored as the START cell of the cylinder.
  from: V3;
  dir: V3;
  /** Animated growth length, 0..1 over a short interval. */
  grow: number;
  growStart: number;
}

interface Pipe {
  pos: V3;
  dir: V3 | null;
  color: V3;
  /** Higher = shinier/metallic-looking. */
  shininess: number;
  specular: number;
  segments: Segment[];
  /** Cell positions where direction changes (ball joints). */
  joints: V3[];
  alive: boolean;
  nextStepAt: number;
}

const GRID = 16;
const TUBE_RADIUS = 0.32;
const JOINT_RADIUS = 0.48;
const STEP_INTERVAL_MS = 55;
const GROW_DURATION_MS = STEP_INTERVAL_MS;
const MAX_PIPES = 4;
const STRAIGHT_BIAS = 0.55; // probability to keep going straight when straight is available
const RESET_AFTER_MS = 18000;

function inBounds(p: V3): boolean {
  return p[0] >= 0 && p[0] < GRID && p[1] >= 0 && p[1] < GRID && p[2] >= 0 && p[2] < GRID;
}

function cellKey(p: V3): number {
  return (p[0] * GRID + p[1]) * GRID + p[2];
}

function vecEq(a: V3, b: V3): boolean { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

function randomColor(): V3 {
  const h = Math.random();
  const s = 0.55 + Math.random() * 0.35;
  const l = 0.5 + Math.random() * 0.15;
  return hslToRgb(h, s, l);
}

function hslToRgb(h: number, s: number, l: number): V3 {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function spawnPipe(occupied: Set<number>): Pipe | null {
  for (let attempt = 0; attempt < 32; attempt++) {
    const pos: V3 = [
      Math.floor(Math.random() * GRID),
      Math.floor(Math.random() * GRID),
      Math.floor(Math.random() * GRID),
    ];
    if (!occupied.has(cellKey(pos))) {
      occupied.add(cellKey(pos));
      const metallic = Math.random() < 0.25;
      return {
        pos,
        dir: null,
        color: randomColor(),
        shininess: metallic ? 64 : 24,
        specular: metallic ? 0.85 : 0.45,
        segments: [],
        joints: [[...pos] as V3],
        alive: true,
        nextStepAt: 0,
      };
    }
  }
  return null;
}

function chooseDirection(pipe: Pipe, occupied: Set<number>): V3 | null {
  const candidates: V3[] = [];
  for (const d of DIRS) {
    const next: V3 = [pipe.pos[0] + d[0], pipe.pos[1] + d[1], pipe.pos[2] + d[2]];
    if (!inBounds(next)) continue;
    if (occupied.has(cellKey(next))) continue;
    candidates.push(d);
  }
  if (candidates.length === 0) return null;
  if (pipe.dir && Math.random() < STRAIGHT_BIAS) {
    const straight = candidates.find(d => vecEq(d, pipe.dir!));
    if (straight) return straight;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function Pipes3D({ isFullScreen = false }: Pipes3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    let disposed = false;
    let raf = 0;

    const program = linkProgram(gl);
    gl.useProgram(program);

    const aPos = gl.getAttribLocation(program, 'aPosition');
    const aNor = gl.getAttribLocation(program, 'aNormal');
    const uModel = gl.getUniformLocation(program, 'uModel');
    const uView = gl.getUniformLocation(program, 'uView');
    const uProj = gl.getUniformLocation(program, 'uProj');
    const uNormalMat = gl.getUniformLocation(program, 'uNormalMat');
    const uColor = gl.getUniformLocation(program, 'uColor');
    const uLightDir = gl.getUniformLocation(program, 'uLightDir');
    const uViewPos = gl.getUniformLocation(program, 'uViewPos');
    const uShininess = gl.getUniformLocation(program, 'uShininess');
    const uSpecular = gl.getUniformLocation(program, 'uSpecular');

    const cylinder = buildCylinder(gl, 18);
    const sphere = buildSphere(gl, 14, 18);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    let pipes: Pipe[] = [];
    let occupied = new Set<number>();
    let cycleStart = performance.now();

    const resetWorld = (now: number) => {
      pipes = [];
      occupied = new Set();
      cycleStart = now;
      for (let i = 0; i < 1; i++) {
        const p = spawnPipe(occupied);
        if (p) {
          p.nextStepAt = now;
          pipes.push(p);
        }
      }
    };
    resetWorld(performance.now());

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 300;
      const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 200;
      const W = Math.max(1, Math.floor(w * dpr));
      const H = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      gl.viewport(0, 0, W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const bindMesh = (mesh: Mesh) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nbo);
      gl.enableVertexAttribArray(aNor);
      gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
    };

    const drawMesh = (mesh: Mesh, model: M4, color: V3, shininess: number, specular: number) => {
      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniformMatrix3fv(uNormalMat, false, m3NormalFromM4(model));
      gl.uniform3f(uColor, color[0], color[1], color[2]);
      gl.uniform1f(uShininess, shininess);
      gl.uniform1f(uSpecular, specular);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    };

    const stepPipes = (now: number) => {
      let aliveCount = 0;
      for (const pipe of pipes) {
        if (!pipe.alive) continue;
        if (now < pipe.nextStepAt) { aliveCount++; continue; }
        const dir = chooseDirection(pipe, occupied);
        if (!dir) {
          pipe.alive = false;
          continue;
        }
        const next: V3 = [pipe.pos[0] + dir[0], pipe.pos[1] + dir[1], pipe.pos[2] + dir[2]];
        const turned = pipe.dir !== null && !vecEq(dir, pipe.dir);
        if (turned) pipe.joints.push([...pipe.pos] as V3);
        pipe.segments.push({
          from: [...pipe.pos] as V3,
          dir,
          grow: 0,
          growStart: now,
        });
        occupied.add(cellKey(next));
        pipe.pos = next;
        pipe.dir = dir;
        pipe.nextStepAt = now + STEP_INTERVAL_MS;
        aliveCount++;
      }

      // Animate growth of latest segments.
      for (const pipe of pipes) {
        for (const seg of pipe.segments) {
          if (seg.grow < 1) {
            seg.grow = Math.min(1, (now - seg.growStart) / GROW_DURATION_MS);
          }
        }
      }

      // Spawn additional pipes occasionally to keep the screen busy.
      if (aliveCount < MAX_PIPES && Math.random() < 0.012) {
        const p = spawnPipe(occupied);
        if (p) {
          p.nextStepAt = now;
          pipes.push(p);
        }
      }

      const stuck = aliveCount === 0 && pipes.length > 0;
      if (stuck || now - cycleStart > RESET_AFTER_MS) {
        resetWorld(now);
      }
    };

    const render = () => {
      if (disposed) return;
      const now = performance.now();
      stepPipes(now);

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / canvas.height;
      const proj = m4Perspective((50 * Math.PI) / 180, aspect, 0.5, 200);

      const half = GRID / 2;
      const camRadius = GRID * 1.55;
      const camAngle = Math.PI * 0.25; // fixed 3/4 view, no full orbit
      const camY = GRID * 0.55;
      const eye: V3 = [Math.cos(camAngle) * camRadius, camY, Math.sin(camAngle) * camRadius];
      const view = m4LookAt(eye, [0, 0, 0], [0, 1, 0]);

      gl.uniformMatrix4fv(uProj, false, proj);
      gl.uniformMatrix4fv(uView, false, view);
      gl.uniform3f(uLightDir, -0.5, -0.8, -0.4);
      gl.uniform3f(uViewPos, eye[0], eye[1], eye[2]);

      const center = m4Translate(-half + 0.5, -half + 0.5, -half + 0.5);

      // Cylinders.
      bindMesh(cylinder);
      for (const pipe of pipes) {
        for (const seg of pipe.segments) {
          const start: V3 = [seg.from[0], seg.from[1], seg.from[2]];
          const length = seg.grow;
          if (length <= 0.001) continue;
          const align = m4AlignZ(seg.dir);
          const scale = m4Scale(TUBE_RADIUS, TUBE_RADIUS, length);
          const trans = m4Translate(start[0], start[1], start[2]);
          const local = m4Multiply(trans, m4Multiply(align, scale));
          const model = m4Multiply(center, local);
          drawMesh(cylinder, model, pipe.color, pipe.shininess, pipe.specular);
        }
      }

      // Ball joints (and pipe heads).
      bindMesh(sphere);
      for (const pipe of pipes) {
        for (const j of pipe.joints) {
          const trans = m4Translate(j[0], j[1], j[2]);
          const scale = m4Scale(JOINT_RADIUS, JOINT_RADIUS, JOINT_RADIUS);
          const model = m4Multiply(center, m4Multiply(trans, scale));
          drawMesh(sphere, model, pipe.color, pipe.shininess, pipe.specular);
        }
        // Animated head: a sphere at the leading edge of the latest segment.
        const last = pipe.segments[pipe.segments.length - 1];
        if (last && last.grow < 1) {
          const hx = last.from[0] + last.dir[0] * last.grow;
          const hy = last.from[1] + last.dir[1] * last.grow;
          const hz = last.from[2] + last.dir[2] * last.grow;
          const trans = m4Translate(hx, hy, hz);
          const scale = m4Scale(TUBE_RADIUS, TUBE_RADIUS, TUBE_RADIUS);
          const model = m4Multiply(center, m4Multiply(trans, scale));
          drawMesh(sphere, model, pipe.color, pipe.shininess, pipe.specular);
        }
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(cylinder.vbo);
      gl.deleteBuffer(cylinder.nbo);
      gl.deleteBuffer(cylinder.ibo);
      gl.deleteBuffer(sphere.vbo);
      gl.deleteBuffer(sphere.nbo);
      gl.deleteBuffer(sphere.ibo);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#000', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: isFullScreen ? 'auto' : 'pixelated',
        }}
      />
    </div>
  );
}
