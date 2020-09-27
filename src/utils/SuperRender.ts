import { FrameData } from '../structure/local';

const vertexYUVShader = ['#version 300 es', 'layout(location = 0) in vec4 vertexPos;',
  'layout(location = 1) in vec2 texturePos;', 'out vec2 textureCoord;', 'void main()', '{', 'gl_Position = vertexPos;',
  'textureCoord = texturePos;', '}'].join('\n');
const fragmentYUVShader = ['#version 300 es', 'precision highp float;', 'in vec2 textureCoord;', 'out vec4 fragColor;',
  'uniform sampler2D ySampler;', 'uniform sampler2D uSampler;', 'uniform sampler2D vSampler;',
  'const mat4 YUV2RGB = mat4', '(', '1.1643828125, 0, 1.59602734375, -.87078515625,',
  '1.1643828125, -.39176171875, -.81296875, .52959375,', '1.1643828125, 2.017234375, 0, -1.081390625,', '0, 0, 0, 1',
  ');', 'void main(void) {', 'float y = texture(ySampler,  textureCoord).r;',
  'float u = texture(uSampler,  textureCoord).r;', 'float v = texture(vSampler,  textureCoord).r;',
  'fragColor = vec4(y, u, v, 1) * YUV2RGB;', '}'].join('\n');
const vertexLineShader = ['#version 300 es', 'layout(location = 0) in vec4 vertexPosLine;', 'void main()', '{',
  'gl_Position = vertexPosLine;', '}'].join('\n');
const fragmentLineShader = ['#version 300 es', 'precision highp float;', 'uniform mediump float fRcom;',
  'uniform mediump float fGcom;', 'uniform mediump float fBcom;', 'out vec4 fragColor;', 'void main()', '{',
  'fragColor = vec4(fRcom,fGcom,fBcom,1.0);', '}'].join('\n');

export class SuperRender {
  private readonly canvasElement: HTMLCanvasElement;
  private readonly contextGL: WebGL2RenderingContext | null = null;
  private readonly YUVProgram!: WebGLProgram;
  private readonly LineProgram!: WebGLProgram;
  private vertexPosBuffer: WebGLBuffer | null = null;
  private texturePosBuffer: WebGLBuffer | null = null;
  private vertexLineBuffer: WebGLBuffer | null = null;
  private yTextureRef: WebGLTexture | null = null;
  private uTextureRef: WebGLTexture | null = null;
  private vTextureRef: WebGLTexture | null = null;
  private nWindowWidth: number = 0;
  private nWindowHeight: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;
    try {
      this.contextGL = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
      this.YUVProgram = this.initProgram(vertexYUVShader, fragmentYUVShader);
      this.LineProgram = this.initProgram(vertexLineShader, fragmentLineShader);
      this.initBuffers();
      this.initTextures();
    } catch (e) {
      this.contextGL = null;
    }
    if (!this.contextGL || typeof this.contextGL.getParameter !== 'function') {
      this.contextGL = null;
    }
  }

  private initProgram(vertex: string, fragment: string) {
    const gl = this.contextGL!;
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertex);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.log('Vertex shader failed to compile: ' + gl.getShaderInfoLog(vertexShader));
    }
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragment);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.log('Fragment shader failed to compile: ' + gl.getShaderInfoLog(fragmentShader));
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.log('Program failed to compile: ' + gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  };

  private initBuffers() {
    const gl = this.contextGL;
    if (gl) {
      const vertexPosBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      const texturePosBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texturePosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      const vertexLineBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexLineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, 16, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.vertexPosBuffer = vertexPosBuffer;
      this.texturePosBuffer = texturePosBuffer;
      this.vertexLineBuffer = vertexLineBuffer;
    }
  };

  private initTextures() {
    const gl = this.contextGL;
    if (gl) {
      gl.useProgram(this.YUVProgram);
      const yTexture = this.initTexture();
      gl.uniform1i(gl.getUniformLocation(this.YUVProgram, 'ySampler'), 0);
      this.yTextureRef = yTexture;
      const uTexture = this.initTexture();
      gl.uniform1i(gl.getUniformLocation(this.YUVProgram, 'uSampler'), 1);
      this.uTextureRef = uTexture;
      const vTexture = this.initTexture();
      gl.uniform1i(gl.getUniformLocation(this.YUVProgram, 'vSampler'), 2);
      this.vTextureRef = vTexture;
      gl.useProgram(null);
    }
  };

  private initTexture() {
    const gl = this.contextGL!;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  };

  public displayFrameData(frame: FrameData) {
    const { width, height, data } = frame;
    if (width <= 0 || height <= 0) {
      return;
    }
    const gl = this.contextGL;
    if (gl) {
      const canvas = this.canvasElement;
      const canvasWidth = this.nWindowWidth = canvas.width;
      const canvasHeight = this.nWindowHeight = canvas.height;
      gl.clearColor(0.8, 0.8, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      this.updateFrameData(width, height, new Uint8Array(data));
      gl.useProgram(this.YUVProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPosBuffer);
      const vertexPos = gl.getAttribLocation(this.YUVProgram, 'vertexPos');
      gl.enableVertexAttribArray(vertexPos);
      gl.vertexAttribPointer(vertexPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texturePosBuffer);
      const texturePos = gl.getAttribLocation(this.YUVProgram, 'texturePos');
      gl.enableVertexAttribArray(texturePos);
      gl.vertexAttribPointer(texturePos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(vertexPos);
      gl.disableVertexAttribArray(texturePos);
      gl.useProgram(null);
    }
  };

  private updateFrameData(width: number, height: number, data: Uint8Array) {
    const gl = this.contextGL;
    if (gl) {
      const ySize = width * height;
      const yData = data.subarray(0, ySize);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.yTextureRef);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, yData);
      const uSize = width / 2 * height / 2;
      const uData = data.subarray(ySize, ySize + uSize);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.uTextureRef);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width / 2, height / 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, uData);
      const m = data.subarray(ySize + uSize, ySize + uSize + uSize);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.vTextureRef);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width / 2, height / 2, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, m);
    }
  };

  public setDisplayRect(e: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  } | null) {
    const r = this.contextGL!;
    const t = this.nWindowWidth;
    const a = this.nWindowHeight;
    let i;
    if (e && t > 0 && a > 0) {
      const o = e.left / t;
      const n = e.top / a;
      const f = e.right / t;
      const u = e.bottom / a;
      i = new Float32Array([f, n, o, n, f, u, o, u]);
    } else {
      i = new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]);
    }
    const s = this.texturePosBuffer;
    r.bindBuffer(r.ARRAY_BUFFER, s);
    r.bufferSubData(r.ARRAY_BUFFER, 0, i);
    r.bindBuffer(r.ARRAY_BUFFER, null);
  };

  public destroy() {
    const gl = this.contextGL;
    if (gl) {
      gl.deleteProgram(this.YUVProgram);
      gl.deleteProgram(this.LineProgram);
      gl.deleteBuffer(this.vertexPosBuffer);
      gl.deleteBuffer(this.texturePosBuffer);
      gl.deleteBuffer(this.vertexLineBuffer);
      gl.deleteTexture(this.yTextureRef);
      gl.deleteTexture(this.uTextureRef);
      gl.deleteTexture(this.vTextureRef);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  };
}
