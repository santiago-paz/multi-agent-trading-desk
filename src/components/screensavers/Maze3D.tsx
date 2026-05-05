'use client';

import React, { useEffect, useRef } from 'react';

interface Maze3DProps {
  isFullScreen?: boolean;
}

type V3 = [number, number, number];
type M4 = Float32Array;

const VERT_TEX_SRC = `
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
varying vec3 vPos;
varying vec2 vUV;
void main() {
  vec4 wp = uModel * vec4(aPosition, 1.0);
  vPos = wp.xyz;
  vUV = aUV;
  gl_Position = uProj * uView * wp;
}`;

const FRAG_TEX_SRC = `
precision mediump float;
varying vec3 vPos;
varying vec2 vUV;
uniform sampler2D uTex;
uniform vec3 uViewPos;
uniform float uFogNear;
uniform float uFogFar;
void main() {
  vec4 base = texture2D(uTex, vUV);
  float dist = length(uViewPos - vPos);
  float t = clamp((uFogFar - dist) / (uFogFar - uFogNear), 0.0, 1.0);
  vec3 col = base.rgb * (0.18 + 0.82 * t);
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT_FLAT_SRC = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform mat3 uNormalMat;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec4 wp = uModel * vec4(aPosition, 1.0);
  vPos = wp.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  gl_Position = uProj * uView * wp;
}`;

const FRAG_FLAT_SRC = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPos;
uniform vec3 uColor;
uniform vec3 uViewPos;
uniform vec3 uLightDir;
uniform float uFogNear;
uniform float uFogFar;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(-uLightDir);
  float diff = max(dot(N, L), 0.0);
  vec3 V = normalize(uViewPos - vPos);
  vec3 R = reflect(-L, N);
  float spec = pow(max(dot(R, V), 0.0), 28.0);
  vec3 col = uColor * (0.28 + 0.72 * diff) + vec3(1.0) * spec * 0.55;
  float dist = length(uViewPos - vPos);
  float t = clamp((uFogFar - dist) / (uFogFar - uFogNear), 0.0, 1.0);
  gl_FragColor = vec4(col * (0.15 + 0.85 * t), 1.0);
}`;

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
  const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  const xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
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

function m4RotateY(rad: number): M4 {
  const c = Math.cos(rad), s = Math.sin(rad);
  const m = m4Identity();
  m[0] = c; m[2] = -s;
  m[8] = s; m[10] = c;
  return m;
}

function m4RotateAxis(axis: V3, angle: number): M4 {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const x = axis[0] / len, y = axis[1] / len, z = axis[2] / len;
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  const m = m4Identity();
  m[0] = t * x * x + c;
  m[1] = t * x * y + s * z;
  m[2] = t * x * z - s * y;
  m[4] = t * x * y - s * z;
  m[5] = t * y * y + c;
  m[6] = t * y * z + s * x;
  m[8] = t * x * z + s * y;
  m[9] = t * y * z - s * x;
  m[10] = t * z * z + c;
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

function rotateAroundAxis(v: V3, axis: V3, angle: number): V3 {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const kx = axis[0] / len, ky = axis[1] / len, kz = axis[2] / len;
  const c = Math.cos(angle), s = Math.sin(angle);
  const dot = kx * v[0] + ky * v[1] + kz * v[2];
  const cx = ky * v[2] - kz * v[1];
  const cy = kz * v[0] - kx * v[2];
  const cz = kx * v[1] - ky * v[0];
  return [
    v[0] * c + cx * s + kx * dot * (1 - c),
    v[1] * c + cy * s + ky * dot * (1 - c),
    v[2] * c + cz * s + kz * dot * (1 - c),
  ];
}

function loadTexture(
  gl: WebGLRenderingContext,
  url: string,
  options: { wrap?: number; placeholder?: [number, number, number, number] } = {},
  onLoad?: () => void
): WebGLTexture {
  const wrap = options.wrap ?? gl.REPEAT;
  const placeholder = options.placeholder ?? [60, 30, 25, 255];
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(placeholder));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const isPow2 = (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0;
    if (isPow2) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    onLoad?.();
  };
  img.src = url;
  return tex;
}

interface Cell { N: number; E: number; S: number; W: number; }
type Maze = Cell[][];

function generateMaze(rows: number, cols: number): Maze {
  const cells: Maze = [];
  const visited: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    cells.push([]);
    visited.push([]);
    for (let c = 0; c < cols; c++) {
      cells[r].push({ N: 0, E: 0, S: 0, W: 0 });
      visited[r].push(false);
    }
  }
  const startR = Math.floor(Math.random() * rows);
  const startC = Math.floor(Math.random() * cols);
  const stack: Array<[number, number]> = [[startR, startC]];
  visited[startR][startC] = true;
  let count = 1;
  const total = rows * cols;
  while (count < total) {
    const [r, c] = stack[stack.length - 1];
    const candidates: Array<[number, number, keyof Cell, keyof Cell]> = [];
    if (r > 0 && !visited[r - 1][c]) candidates.push([r - 1, c, 'N', 'S']);
    if (c < cols - 1 && !visited[r][c + 1]) candidates.push([r, c + 1, 'E', 'W']);
    if (r < rows - 1 && !visited[r + 1][c]) candidates.push([r + 1, c, 'S', 'N']);
    if (c > 0 && !visited[r][c - 1]) candidates.push([r, c - 1, 'W', 'E']);
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const [nr, nc, fwd, back] = candidates[Math.floor(Math.random() * candidates.length)];
    cells[r][c][fwd] = 1;
    cells[nr][nc][back] = 1;
    visited[nr][nc] = true;
    stack.push([nr, nc]);
    count++;
  }
  return cells;
}

interface TexMesh { vbo: WebGLBuffer; tbo: WebGLBuffer; count: number; }
interface FlatMesh { vbo: WebGLBuffer; nbo: WebGLBuffer; count: number; }

function uploadTexMesh(gl: WebGLRenderingContext, positions: number[], uvs: number[]): TexMesh {
  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const tbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  return { vbo, tbo, count: positions.length / 3 };
}

function uploadFlatMesh(gl: WebGLRenderingContext, positions: number[], normals: number[]): FlatMesh {
  const vbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const nbo = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  return { vbo, nbo, count: positions.length / 3 };
}

function pushQuad(positions: number[], uvs: number[], a: V3, b: V3, c: V3, d: V3, uvScale = 1) {
  positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  uvs.push(0, 0, uvScale, 0, uvScale, uvScale, 0, 0, uvScale, uvScale, 0, uvScale);
}

interface WallQuad { a: V3; b: V3; c: V3; d: V3; }

function buildMazeWalls(gl: WebGLRenderingContext, maze: Maze, picCount: number): { normal: TexMesh; pic: TexMesh } {
  const rows = maze.length;
  const cols = maze[0].length;
  const HEIGHT = 1;
  // Walls are rendered with CULL_FACE disabled, so each wall is a single
  // double-sided quad. Interior walls are emitted once (from the cell where
  // they sit on the N or W side); outer-boundary E and S walls live only on
  // the last column/row.
  const all: WallQuad[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = maze[r][c];
      const x0 = c, x1 = c + 1, z0 = r, z1 = r + 1;
      if (cell.N === 0) {
        all.push({ a: [x1, 0, z0], b: [x0, 0, z0], c: [x0, HEIGHT, z0], d: [x1, HEIGHT, z0] });
      }
      if (cell.W === 0) {
        all.push({ a: [x0, 0, z0], b: [x0, 0, z1], c: [x0, HEIGHT, z1], d: [x0, HEIGHT, z0] });
      }
      if (cell.E === 0 && c === cols - 1) {
        all.push({ a: [x1, 0, z1], b: [x1, 0, z0], c: [x1, HEIGHT, z0], d: [x1, HEIGHT, z1] });
      }
      if (cell.S === 0 && r === rows - 1) {
        all.push({ a: [x0, 0, z1], b: [x1, 0, z1], c: [x1, HEIGHT, z1], d: [x0, HEIGHT, z1] });
      }
    }
  }
  const picSet = new Set<number>();
  const remaining = Array.from({ length: all.length }, (_, i) => i);
  const target = Math.min(picCount, all.length);
  for (let i = 0; i < target; i++) {
    const j = Math.floor(Math.random() * remaining.length);
    picSet.add(remaining[j]);
    remaining.splice(j, 1);
  }
  const nPos: number[] = [], nUV: number[] = [];
  const pPos: number[] = [], pUV: number[] = [];
  for (let i = 0; i < all.length; i++) {
    const w = all[i];
    if (picSet.has(i)) {
      pushQuad(pPos, pUV, w.a, w.b, w.c, w.d);
    } else {
      pushQuad(nPos, nUV, w.a, w.b, w.c, w.d);
    }
  }
  return {
    normal: uploadTexMesh(gl, nPos, nUV),
    pic: uploadTexMesh(gl, pPos, pUV),
  };
}

function buildFloor(gl: WebGLRenderingContext, cols: number, rows: number): TexMesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  positions.push(
    0, 0, 0,
    cols, 0, 0,
    cols, 0, rows,
    0, 0, 0,
    cols, 0, rows,
    0, 0, rows,
  );
  uvs.push(0, 0, cols, 0, cols, rows, 0, 0, cols, rows, 0, rows);
  return uploadTexMesh(gl, positions, uvs);
}

function buildCeiling(gl: WebGLRenderingContext, cols: number, rows: number): TexMesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  positions.push(
    0, 1, 0,
    cols, 1, rows,
    cols, 1, 0,
    0, 1, 0,
    0, 1, rows,
    cols, 1, rows,
  );
  uvs.push(0, 0, cols, rows, cols, 0, 0, 0, 0, rows, cols, rows);
  return uploadTexMesh(gl, positions, uvs);
}

function buildPolyhedronFromVertsAndTris(gl: WebGLRenderingContext, verts: V3[], tris: number[]): FlatMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i < tris.length; i += 3) {
    const a = verts[tris[i]];
    const b = verts[tris[i + 1]];
    const c = verts[tris[i + 2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    positions.push(...a, ...b, ...c);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  return uploadFlatMesh(gl, positions, normals);
}

function buildTetra(gl: WebGLRenderingContext): FlatMesh {
  const verts: V3[] = [
    [0, 1.225, 0],
    [-0.5774, -0.4082, -1],
    [-0.5774, -0.4082, 1],
    [1.155, -0.4082, 0],
  ];
  const tris = [0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2];
  return buildPolyhedronFromVertsAndTris(gl, verts, tris);
}

function buildOcta(gl: WebGLRenderingContext): FlatMesh {
  const verts: V3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const tris = [
    0, 2, 4, 4, 2, 1, 1, 2, 5, 5, 2, 0,
    4, 3, 0, 1, 3, 4, 5, 3, 1, 0, 3, 5,
  ];
  return buildPolyhedronFromVertsAndTris(gl, verts, tris);
}

function buildIcosa(gl: WebGLRenderingContext): FlatMesh {
  const phi = (1 + Math.sqrt(5)) / 2;
  const verts: V3[] = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];
  const tris = [
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
    1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
    4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ];
  return buildPolyhedronFromVertsAndTris(gl, verts, tris);
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

function linkProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || 'program link error');
  }
  return prog;
}

const ROWS = 10;
const COLS = 10;
const WALK_MS = 750;
const TURN_MS = 480;
const FLIP_MS = 900;
const POLYHEDRON_COUNT = 5;
const PIC_WALL_COUNT = 3;
const FOG_NEAR = 0.5;
const FOG_FAR = 6.5;

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const DIR_NAMES: Array<keyof Cell> = ['N', 'E', 'S', 'W'];

function dirToTheta(dir: number): number {
  // 0=N=-Z, 1=E=+X, 2=S=+Z, 3=W=-X
  // theta=0 -> +X (E); we look at (cos, 0, sin)
  return [-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir];
}

function shortestAngleTarget(from: number, to: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return from + diff;
}

interface Polyhedron {
  row: number;
  col: number;
  type: 0 | 1 | 2;
  color: V3;
  spinOffset: number;
  alive: boolean;
}

export function Maze3D({ isFullScreen = false }: Maze3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    let disposed = false;
    let raf = 0;

    const texProgram = linkProgram(gl, VERT_TEX_SRC, FRAG_TEX_SRC);
    const flatProgram = linkProgram(gl, VERT_FLAT_SRC, FRAG_FLAT_SRC);

    const tex_aPos = gl.getAttribLocation(texProgram, 'aPosition');
    const tex_aUV = gl.getAttribLocation(texProgram, 'aUV');
    const tex_uModel = gl.getUniformLocation(texProgram, 'uModel');
    const tex_uView = gl.getUniformLocation(texProgram, 'uView');
    const tex_uProj = gl.getUniformLocation(texProgram, 'uProj');
    const tex_uTex = gl.getUniformLocation(texProgram, 'uTex');
    const tex_uViewPos = gl.getUniformLocation(texProgram, 'uViewPos');
    const tex_uFogNear = gl.getUniformLocation(texProgram, 'uFogNear');
    const tex_uFogFar = gl.getUniformLocation(texProgram, 'uFogFar');

    const flat_aPos = gl.getAttribLocation(flatProgram, 'aPosition');
    const flat_aNor = gl.getAttribLocation(flatProgram, 'aNormal');
    const flat_uModel = gl.getUniformLocation(flatProgram, 'uModel');
    const flat_uView = gl.getUniformLocation(flatProgram, 'uView');
    const flat_uProj = gl.getUniformLocation(flatProgram, 'uProj');
    const flat_uNormalMat = gl.getUniformLocation(flatProgram, 'uNormalMat');
    const flat_uColor = gl.getUniformLocation(flatProgram, 'uColor');
    const flat_uViewPos = gl.getUniformLocation(flatProgram, 'uViewPos');
    const flat_uLightDir = gl.getUniformLocation(flatProgram, 'uLightDir');
    const flat_uFogNear = gl.getUniformLocation(flatProgram, 'uFogNear');
    const flat_uFogFar = gl.getUniformLocation(flatProgram, 'uFogFar');

    const wallTex = loadTexture(gl, '/screensavers/maze/wall.png');
    const floorTex = loadTexture(gl, '/screensavers/maze/floor.png');
    const ceilingTex = loadTexture(gl, '/screensavers/maze/ceiling2.png');
    const picTex = loadTexture(gl, '/screensavers/maze/pic.png', { wrap: gl.CLAMP_TO_EDGE });

    const tetra = buildTetra(gl);
    const octa = buildOcta(gl);
    const icosa = buildIcosa(gl);
    const polyMeshes = [tetra, octa, icosa];
    const polyScales = [0.18, 0.22, 0.18];

    let maze: Maze = generateMaze(ROWS, COLS);
    let wallMeshes = buildMazeWalls(gl, maze, PIC_WALL_COUNT);
    const floor = buildFloor(gl, COLS, ROWS);
    const ceiling = buildCeiling(gl, COLS, ROWS);

    let polyhedra: Polyhedron[] = [];
    let cellRow = 0, cellCol = 0;
    let dir = 0;
    let theta = 0;
    let startTheta = 0;
    let targetTheta = 0;
    let nextRow = 0, nextCol = 0;
    let phase: 'walk' | 'turn' | 'flip' = 'walk';
    let phaseStart = 0;
    let justTurned = false;
    let up: V3 = [0, 1, 0];
    let flipAxis: V3 = [1, 0, 0];
    let flipFrom: V3 = [0, 1, 0];
    let flipTo: V3 = [0, 1, 0];
    let cycleStart = performance.now();
    const CYCLE_MAX_MS = 90000;

    const seedAtCell = (r: number, c: number, type: 0 | 1 | 2): Polyhedron => {
      const palette: V3[] = [
        [1.0, 0.85, 0.25],
        [0.35, 0.75, 1.0],
        [1.0, 0.4, 0.55],
        [0.55, 1.0, 0.55],
        [1.0, 0.6, 0.25],
        [0.85, 0.55, 1.0],
      ];
      const color = palette[Math.floor(Math.random() * palette.length)];
      return { row: r, col: c, type, color, spinOffset: Math.random() * Math.PI * 2, alive: true };
    };

    const placePolyhedra = () => {
      polyhedra = [];
      const used = new Set<number>();
      used.add(cellRow * COLS + cellCol);
      let attempts = 0;
      while (polyhedra.length < POLYHEDRON_COUNT && attempts < 200) {
        attempts++;
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        const key = r * COLS + c;
        if (used.has(key)) continue;
        used.add(key);
        const type = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        polyhedra.push(seedAtCell(r, c, type));
      }
    };

    const initCycle = () => {
      maze = generateMaze(ROWS, COLS);
      gl.deleteBuffer(wallMeshes.normal.vbo);
      gl.deleteBuffer(wallMeshes.normal.tbo);
      gl.deleteBuffer(wallMeshes.pic.vbo);
      gl.deleteBuffer(wallMeshes.pic.tbo);
      wallMeshes = buildMazeWalls(gl, maze, PIC_WALL_COUNT);
      cellRow = Math.floor(Math.random() * ROWS);
      cellCol = Math.floor(Math.random() * COLS);
      const cell = maze[cellRow][cellCol];
      for (let i = 0; i < 4; i++) {
        const k = DIR_NAMES[i];
        if (cell[k] === 1) { dir = i; break; }
      }
      theta = dirToTheta(dir);
      up = [0, 1, 0];
      cycleStart = performance.now();
      placePolyhedra();
      startWalkOrTurn(performance.now(), true);
    };

    const startWalkOrTurn = (now: number, fromInit: boolean) => {
      const cell = maze[cellRow][cellCol];
      // After a turn, prefer forward if open
      if (justTurned && cell[DIR_NAMES[dir]] === 1) {
        nextRow = cellRow + DR[dir];
        nextCol = cellCol + DC[dir];
        startTheta = theta;
        phase = 'walk';
        phaseStart = now;
        justTurned = false;
        return;
      }
      // Right-hand wall follower priority: right, forward, left, back
      const order = [(dir + 1) % 4, dir, (dir + 3) % 4, (dir + 2) % 4];
      if (fromInit) order.unshift(dir); // prefer forward on init
      for (const d of order) {
        if (cell[DIR_NAMES[d]] === 1) {
          if (d === dir) {
            nextRow = cellRow + DR[d];
            nextCol = cellCol + DC[d];
            // Clamp to maze bounds (defensive)
            if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) continue;
            startTheta = theta;
            phase = 'walk';
            phaseStart = now;
            justTurned = false;
            return;
          } else {
            startTheta = theta;
            targetTheta = shortestAngleTarget(theta, dirToTheta(d));
            dir = d;
            phase = 'turn';
            phaseStart = now;
            justTurned = true;
            return;
          }
        }
      }
      // No way out (shouldn't happen in a connected maze) — regenerate
      initCycle();
    };

    const startFlip = (now: number) => {
      flipAxis = [Math.cos(theta), 0, Math.sin(theta)];
      flipFrom = [...up] as V3;
      flipTo = rotateAroundAxis(up, flipAxis, Math.PI);
      // snap target to nearest unit
      flipTo = [Math.round(flipTo[0]), Math.round(flipTo[1]), Math.round(flipTo[2])] as V3;
      phase = 'flip';
      phaseStart = now;
    };

    const checkPolyhedronCollision = (now: number): boolean => {
      for (const p of polyhedra) {
        if (!p.alive) continue;
        if (p.row === cellRow && p.col === cellCol) {
          p.alive = false;
          startFlip(now);
          return true;
        }
      }
      return false;
    };

    initCycle();

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

    gl.enable(gl.DEPTH_TEST);

    const bindTexMesh = (mesh: TexMesh) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.enableVertexAttribArray(tex_aPos);
      gl.vertexAttribPointer(tex_aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.tbo);
      gl.enableVertexAttribArray(tex_aUV);
      gl.vertexAttribPointer(tex_aUV, 2, gl.FLOAT, false, 0, 0);
    };

    const bindFlatMesh = (mesh: FlatMesh) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.enableVertexAttribArray(flat_aPos);
      gl.vertexAttribPointer(flat_aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nbo);
      gl.enableVertexAttribArray(flat_aNor);
      gl.vertexAttribPointer(flat_aNor, 3, gl.FLOAT, false, 0, 0);
    };

    const render = () => {
      if (disposed) return;
      const now = performance.now();
      let eyeX = cellCol + 0.5;
      let eyeZ = cellRow + 0.5;

      if (phase === 'walk') {
        const t = Math.min(1, (now - phaseStart) / WALK_MS);
        // ease in/out for smoother motion at cell boundaries
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        eyeX = (cellCol + 0.5) + ((nextCol - cellCol) * e);
        eyeZ = (cellRow + 0.5) + ((nextRow - cellRow) * e);
        if (t >= 1) {
          cellRow = nextRow;
          cellCol = nextCol;
          if (!checkPolyhedronCollision(now)) {
            startWalkOrTurn(now, false);
          }
        }
      } else if (phase === 'turn') {
        const t = Math.min(1, (now - phaseStart) / TURN_MS);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        theta = startTheta + (targetTheta - startTheta) * e;
        if (t >= 1) {
          theta = targetTheta;
          startWalkOrTurn(now, false);
        }
      } else if (phase === 'flip') {
        const t = Math.min(1, (now - phaseStart) / FLIP_MS);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        up = rotateAroundAxis(flipFrom, flipAxis, Math.PI * e);
        if (t >= 1) {
          up = flipTo;
          if (!polyhedra.some(p => p.alive)) {
            initCycle();
          } else {
            startWalkOrTurn(now, false);
          }
        }
      }

      if (now - cycleStart > CYCLE_MAX_MS) {
        initCycle();
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / canvas.height;
      const proj = m4Perspective((75 * Math.PI) / 180, aspect, 0.05, 50);

      const eye: V3 = [eyeX, 0.5, eyeZ];
      const fwd: V3 = [Math.cos(theta), 0, Math.sin(theta)];
      const target: V3 = [eye[0] + fwd[0], eye[1] + fwd[1], eye[2] + fwd[2]];
      const view = m4LookAt(eye, target, up);

      // Disable culling for walls/floor/ceiling (we want both sides visible
      // for internal walls, and avoid orientation worries when the camera flips).
      gl.disable(gl.CULL_FACE);

      gl.useProgram(texProgram);
      gl.uniformMatrix4fv(tex_uProj, false, proj);
      gl.uniformMatrix4fv(tex_uView, false, view);
      gl.uniform3f(tex_uViewPos, eye[0], eye[1], eye[2]);
      gl.uniform1f(tex_uFogNear, FOG_NEAR);
      gl.uniform1f(tex_uFogFar, FOG_FAR);
      gl.uniform1i(tex_uTex, 0);

      const identity = m4Identity();

      gl.uniformMatrix4fv(tex_uModel, false, identity);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, wallTex);
      bindTexMesh(wallMeshes.normal);
      gl.drawArrays(gl.TRIANGLES, 0, wallMeshes.normal.count);

      if (wallMeshes.pic.count > 0) {
        gl.bindTexture(gl.TEXTURE_2D, picTex);
        bindTexMesh(wallMeshes.pic);
        gl.drawArrays(gl.TRIANGLES, 0, wallMeshes.pic.count);
      }

      gl.bindTexture(gl.TEXTURE_2D, floorTex);
      bindTexMesh(floor);
      gl.drawArrays(gl.TRIANGLES, 0, floor.count);

      gl.bindTexture(gl.TEXTURE_2D, ceilingTex);
      bindTexMesh(ceiling);
      gl.drawArrays(gl.TRIANGLES, 0, ceiling.count);

      // Polyhedra: lit, with face culling enabled.
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.useProgram(flatProgram);
      gl.uniformMatrix4fv(flat_uProj, false, proj);
      gl.uniformMatrix4fv(flat_uView, false, view);
      gl.uniform3f(flat_uViewPos, eye[0], eye[1], eye[2]);
      gl.uniform3f(flat_uLightDir, -0.4, -0.7, -0.4);
      gl.uniform1f(flat_uFogNear, FOG_NEAR);
      gl.uniform1f(flat_uFogFar, FOG_FAR);

      const spin = (now / 1000) * 1.6;
      for (const p of polyhedra) {
        if (!p.alive) continue;
        const mesh = polyMeshes[p.type];
        const scale = polyScales[p.type];
        const trans = m4Translate(p.col + 0.5, 0.5, p.row + 0.5);
        const rotY = m4RotateY(spin + p.spinOffset);
        const rotX = m4RotateAxis([1, 0, 0], spin * 0.6 + p.spinOffset);
        const sc = m4Scale(scale, scale, scale);
        const model = m4Multiply(trans, m4Multiply(rotY, m4Multiply(rotX, sc)));
        gl.uniformMatrix4fv(flat_uModel, false, model);
        gl.uniformMatrix3fv(flat_uNormalMat, false, m3NormalFromM4(model));
        gl.uniform3f(flat_uColor, p.color[0], p.color[1], p.color[2]);
        bindFlatMesh(mesh);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(wallMeshes.normal.vbo);
      gl.deleteBuffer(wallMeshes.normal.tbo);
      gl.deleteBuffer(wallMeshes.pic.vbo);
      gl.deleteBuffer(wallMeshes.pic.tbo);
      gl.deleteBuffer(floor.vbo);
      gl.deleteBuffer(floor.tbo);
      gl.deleteBuffer(ceiling.vbo);
      gl.deleteBuffer(ceiling.tbo);
      gl.deleteBuffer(tetra.vbo);
      gl.deleteBuffer(tetra.nbo);
      gl.deleteBuffer(octa.vbo);
      gl.deleteBuffer(octa.nbo);
      gl.deleteBuffer(icosa.vbo);
      gl.deleteBuffer(icosa.nbo);
      gl.deleteTexture(wallTex);
      gl.deleteTexture(floorTex);
      gl.deleteTexture(ceilingTex);
      gl.deleteTexture(picTex);
      gl.deleteProgram(texProgram);
      gl.deleteProgram(flatProgram);
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
