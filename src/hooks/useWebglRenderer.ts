// src/hooks/useWebglRenderer.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';

// --- Shader Programs ---
// These are programs that run on the GPU.

// The Vertex Shader positions each vertex.
const vsSource = `
  attribute vec2 a_position;
  attribute vec4 a_color;

  uniform mat3 u_matrix;

  varying vec4 v_color;

  void main() {
    gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);
    v_color = a_color;
  }
`;

// The Fragment Shader colors each pixel.
const fsSource = `
  precision mediump float;
  varying vec4 v_color;

  void main() {
    gl_FragColor = v_color;
  }
`;

// Helper function to compile a shader
function compileShader(gl: WebGLRenderingContext, source: string, type: number) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Helper function to link shaders into a program
function createShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER)!;
  const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER)!;
  const shaderProgram = gl.createProgram()!;
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

export function useWebglRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const buffersRef = useRef<{ position: WebGLBuffer | null; color: WebGLBuffer | null }>({ position: null, color: null });
  const numVerticesToDraw = useRef(0);
  
  const [viewState, setViewState] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);

  // --- Initialize WebGL context and shaders ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      alert('Unable to initialize WebGL. Your browser may not support it.');
      return;
    }
    glRef.current = gl;
    programRef.current = createShaderProgram(gl, vsSource, fsSource)!;
  }, []);

  // --- Initialize Web Worker and Message Handler (Vite Method) ---
  useEffect(() => {
    // --- THE FIX ---
    // This is the modern Vite way to create a worker from a TypeScript file.
    // It handles bundling, paths, and type module resolution automatically.
    const newWorker = new Worker(new URL('../workers/renderer.worker.ts', import.meta.url), {
      type: 'module',
    });
    setWorker(newWorker);

    newWorker.onmessage = (event) => {
      const gl = glRef.current;
      if (!gl) return;
      const { type, payload } = event.data;

      switch (type) {
        case 'initialize':
          setIsLoading(true);
          console.log(`Initializing GPU buffers for ${payload.totalLines} lines.`);
          const positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, payload.totalLines * 4 * 4, gl.DYNAMIC_DRAW);
          buffersRef.current.position = positionBuffer;

          const colorBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, payload.totalLines * 8 * 1, gl.DYNAMIC_DRAW);
          buffersRef.current.color = colorBuffer;
          numVerticesToDraw.current = 0;
          break;

        case 'chunk':
          const { positions, colors, offset } = payload;
          gl.bindBuffer(gl.ARRAY_BUFFER, buffersRef.current.position!);
          gl.bufferSubData(gl.ARRAY_BUFFER, offset * 4 * 4, positions);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffersRef.current.color!);
          gl.bufferSubData(gl.ARRAY_BUFFER, offset * 8 * 1, colors);
          numVerticesToDraw.current += positions.length / 2;
          draw();
          break;

        case 'done':
          console.log('All chunks received and uploaded.');
          setIsLoading(false);
          break;
        
        case 'error':
          alert(`Worker Error: ${payload}`);
          setIsLoading(false);
          break;
      }
    };

    return () => newWorker.terminate();
  }, []); // Empty dependency array is correct here.

  const handleJsonFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !worker) return;
    
    numVerticesToDraw.current = 0;
    setIsLoading(true);

    file.text().then(text => {
        // Send the parsed data to the worker
        worker.postMessage(JSON.parse(text));
    });
  };
  
  const draw = useCallback(() => {
    // ... (draw function remains exactly the same) ...
    const gl = glRef.current;
    const program = programRef.current;
    const buffers = buffersRef.current;
    if (!gl || !program || !buffers.position || !buffers.color || numVerticesToDraw.current === 0) return;
    
    gl.canvas.width = (gl.canvas as HTMLCanvasElement).clientWidth;
    gl.canvas.height = (gl.canvas as HTMLCanvasElement).clientHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.95, 0.95, 0.95, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(program);
    
    const { scale, offsetX, offsetY } = viewState;
    // Now correctly uses offsetX/offsetY
    const matrix = [
        scale, 0, 0,
        0, scale, 0,
        offsetX, offsetY, 1
    ];
    
    const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    const colorLocation = gl.getAttribLocation(program, 'a_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(colorLocation, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.enableVertexAttribArray(colorLocation);
    
    gl.drawArrays(gl.LINES, 0, numVerticesToDraw.current);
  }, [viewState]);

  useEffect(() => {
    draw();
  }, [viewState, draw]);

  const zoomIn = () => setViewState(v => ({...v, scale: v.scale * 1.5}));
  const zoomOut = () => setViewState(v => ({...v, scale: v.scale / 1.5}));
  const pan = (deltaX: number, deltaY: number) => {
    const gl = glRef.current;
    if (!gl) return;

    // Correct logic: The panning speed is relative to the screen, not the world.
    // This ensures a consistent "feel" at any zoom level.
    setViewState(v => ({ 
        ...v, 
        offsetX: v.offsetX + (deltaX * 2 / gl.canvas.width), 
        offsetY: v.offsetY - (deltaY * 2 / gl.canvas.height) 
    }));
  };
  
  return { canvasRef, handleJsonFile, isLoading, zoomIn, zoomOut, pan };
}