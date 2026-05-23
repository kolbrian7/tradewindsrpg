import React, { useRef, useEffect } from 'react';

interface WebGLParallaxProps {
    imageSrc: string;
    depthMapSrc: string;
    mousePos: { x: number; y: number };
    className?: string;
}

export const WebGLParallax: React.FC<WebGLParallaxProps> = ({
    imageSrc,
    depthMapSrc,
    mousePos,
    className
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);

    // Store mouse position states and current animation time
    const stateRef = useRef({
        currentMouse: { x: 0, y: 0 },
        targetMouse: { x: 0, y: 0 },
        time: 0,
    });

    // Update target mouse coordinate values from props
    useEffect(() => {
        stateRef.current.targetMouse = mousePos;
    }, [mousePos]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported in this browser.');
            return;
        }

        // Vertex Shader: Maps a standard quad grid to texture coordinates
        const vsSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                v_uv.y = 1.0 - v_uv.y; // Flip texture y-axis for standard image coordinates
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment Shader: Applies wave distortion to water area and mouse-driven displacement
        const fsSource = `
            precision mediump float;
            varying vec2 v_uv;
            
            uniform sampler2D u_colorMap;
            uniform sampler2D u_depthMap;
            uniform vec2 u_mouse;
            uniform float u_time;
            
            void main() {
                // Apply dynamic waves to the water portion (bottom 42% of the screen)
                vec2 fgUv = v_uv;
                float waterThreshold = 0.58;
                
                if (v_uv.y > waterThreshold) {
                    // Smoothly fade in waves near the horizon threshold to prevent sudden cuts
                    float waveFactor = smoothstep(waterThreshold, 0.75, v_uv.y);
                    
                    // Create subtle ripples using overlapping sine/cosine waves
                    float waveX = sin(v_uv.y * 32.0 + u_time * 1.6) * 0.0016
                                + cos(v_uv.x * 20.0 + u_time * 1.1) * 0.0010;
                    float waveY = cos(v_uv.x * 28.0 + u_time * 1.3) * 0.0012
                                + sin(v_uv.y * 18.0 + u_time * 0.8) * 0.0006;
                                
                    fgUv.x += waveX * waveFactor;
                    fgUv.y += waveY * waveFactor * 0.6; // Scale down vertical motion
                }
                
                fgUv = clamp(fgUv, 0.0, 1.0);
                
                // Sample the depth layers alpha channel at fgUv for the cutout mask
                vec4 depthColor = texture2D(u_depthMap, fgUv);
                float mask = depthColor.a;
                
                // Calculate moving background sky coordinates
                vec2 bgUv = v_uv + u_mouse * -0.025;
                bgUv = clamp(bgUv, 0.0, 1.0);
                
                // Sample the color map at both coordinates
                vec4 bgColor = texture2D(u_colorMap, bgUv);
                vec4 fgColor = texture2D(u_colorMap, fgUv);
                
                // Blend bgColor and fgColor using the mask alpha
                gl_FragColor = mix(bgColor, fgColor, mask);
            }
        `;

        const compileShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        // Define a full-viewport quad
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Uniform locations
        const colorMapLoc = gl.getUniformLocation(program, 'u_colorMap');
        const depthMapLoc = gl.getUniformLocation(program, 'u_depthMap');
        const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
        const timeLoc = gl.getUniformLocation(program, 'u_time');

        // Assign textures to separate image texture units (0 and 1)
        gl.uniform1i(colorMapLoc, 0);
        gl.uniform1i(depthMapLoc, 1);

        let texturesLoaded = 0;
        const checkRender = () => {
            texturesLoaded++;
            if (texturesLoaded === 2) {
                render();
            }
        };

        const loadGLTexture = (src: string, textureUnit: number) => {
            const texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, texture);

            // Start with a dummy 1x1 black texture pixel to prevent warnings before image loads
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 255])
            );

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            const img = new Image();
            img.onload = () => {
                gl.activeTexture(gl.TEXTURE0 + textureUnit);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                checkRender();
            };
            img.onerror = (e) => {
                console.error(`Failed to load texture: ${src}`, e);
            };
            img.src = src;
            return texture;
        };

        const colorTexture = loadGLTexture(imageSrc, 0);
        const depthTexture = loadGLTexture(depthMapSrc, 1);

        // Adjust canvas resolution dynamically based on device display dimensions
        const resizeCanvas = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                gl.viewport(0, 0, w, h);
            }
        };

        let lastTime = performance.now();

        const render = () => {
            if (texturesLoaded < 2) return;
            
            resizeCanvas();

            const now = performance.now();
            const deltaTime = (now - lastTime) / 1000;
            lastTime = now;

            stateRef.current.time += deltaTime;

            // Smooth interpolation (easing) on mouse coordinates
            const current = stateRef.current.currentMouse;
            const target = stateRef.current.targetMouse;
            current.x += (target.x - current.x) * 0.08;
            current.y += (target.y - current.y) * 0.08;

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(program);

            gl.uniform2f(mouseLoc, current.x, current.y);
            gl.uniform1f(timeLoc, stateRef.current.time);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            requestRef.current = requestAnimationFrame(render);
        };

        resizeCanvas();

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            gl.deleteTexture(colorTexture);
            gl.deleteTexture(depthTexture);
            gl.deleteBuffer(vertexBuffer);
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
        };
    }, [imageSrc, depthMapSrc]);

    return (
        <canvas 
            ref={canvasRef} 
            className={`w-full h-full block ${className || ''}`}
        />
    );
};
