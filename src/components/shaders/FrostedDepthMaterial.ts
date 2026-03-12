import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const sharedVertexLogic = `
        // 1. Buoyancy (Gentle Flowing Bob)
        float bobbing = sin(uTime * 1.5 + pos.x * 0.5) * 0.05;
        pos.y += bobbing * (1.0 - uHover * 0.5); // Calm down when hovered

        // 2. Jelly Bend & Stretch (Reaction to Scroll Velocity)
        float vel = clamp(uScrollVelocity * 0.05, -0.4, 0.4);
        pos.y *= 1.0 + abs(vel) * 0.3;
        pos.x *= 1.0 - abs(vel) * 0.15;
        
        float distFromXCenter = pos.x;
        float dragBend = (distFromXCenter * distFromXCenter) * vel * 0.03;
        pos.z -= dragBend;

        // 3. Subtle edge irregularity (vertex displacement)
        float edgeDist = length(pos.xy);
        float edgeMask = smoothstep(1.0, 3.0, edgeDist);
        float noise = sin(pos.x * 5.0 + uTime) * cos(pos.y * 5.0 + uTime) * 0.02;
        pos.xy += noise * edgeMask;
`;

const vertexShader = `
    uniform float uTime;
    uniform float uScrollVelocity;
    uniform float uHover;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
        vUv = uv;
        vec3 pos = position;

${sharedVertexLogic}

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const fragmentShader = `
    uniform float uHover;
    uniform sampler2D uTexture;
    uniform float uVisibility;
    uniform float uImageMargin;
    uniform float uAudioKick;
    uniform float uAudioHigh;

    varying vec2 vUv;

    void main() {
        vec2 uv = vUv;
        
        // We calculate the inner image bounds based on the margin
        // The margin acts as a transparent pad around the image for the pill shape
        float innerScale = 1.0 / (1.0 - 2.0 * uImageMargin);
        vec2 imgUV = (uv - uImageMargin) * innerScale;

        // Check if we are inside the image bounds
        float inBounds = step(0.0, imgUV.x) * step(imgUV.x, 1.0) * step(0.0, imgUV.y) * step(imgUV.y, 1.0);
        
        if (inBounds < 0.5) {
            // Outside the image bounds — fully transparent, no visible rectangle
            discard;
        }

        // Sample the actual image
        vec3 color = texture2D(uTexture, imgUV).rgb;

        // 1. Frosted Glass Tint (Warm milky opacity)
        // Use a deeper, cooler tint to sink into the dark background naturally
        vec3 glassTint = vec3(0.05, 0.05, 0.08);
        color = mix(color, glassTint, 0.25); 

        // Increase contrast of the image slightly
        color = pow(color, vec3(1.15));

        // 2. Hover Focus
        // Deepen the image when idle so it blends with background, pop brightly on hover
        float darkenFactor = mix(0.5, 1.25, uHover); 
        color *= darkenFactor;

        // Add a punchy warm ambient light when hovered
        color += uHover * vec3(0.25, 0.10, 0.05);

        // Soft edge fade — blend image edges into the glass smoothly
        float edgeFade = smoothstep(0.0, 0.03, imgUV.x) * smoothstep(1.0, 0.97, imgUV.x)
                       * smoothstep(0.0, 0.03, imgUV.y) * smoothstep(1.0, 0.97, imgUV.y);

        // Keep alpha tied to visibility and soft edges
        gl_FragColor = vec4(color, uVisibility * edgeFade);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const FrostedDepthMaterial = shaderMaterial(
    {
        uTime: 0,
        uHover: 0,
        uTexture: null,
        uVisibility: 0,
        uImageMargin: 0.0,
        uScrollVelocity: 0,
        uAudioKick: 0,
        uAudioHigh: 0,
    },
    vertexShader,
    fragmentShader,
    (m: any) => {
        m.transparent = true;
        // Ensure image writes to depth buffer so it correctly occludes objects behind it
        m.depthWrite = true;
    }
);

const auraVertexShader = `
    uniform float uTime;
    uniform float uScrollVelocity;
    uniform float uHover;

    varying vec2 vUv;

    void main() {
        vUv = uv;
        vec3 pos = position;

${sharedVertexLogic}

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const auraFragmentShader = `
    uniform float uHover;
    uniform float uVisibility;
    uniform float uAudioKick;
    uniform float uAudioHigh;
    varying vec2 vUv;

    void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        
        // Soft gradient from center outwards (shape adjusted for pill aspect ratio)
        float dist = length(p * vec2(1.0, 1.5)); 
        float glow = smoothstep(1.2, 0.2, dist);
        
        vec3 color = vec3(1.0, 0.35, 0.15); // Intense neon orange/peach light leaking
        
        float alpha = glow * uHover * 1.5 * uVisibility;
        
        if (alpha < 0.01) discard;
        
        gl_FragColor = vec4(color, alpha);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const CardAuraMaterial = shaderMaterial(
    {
        uTime: 0,
        uHover: 0,
        uScrollVelocity: 0,
        uVisibility: 0,
        uAudioKick: 0,
        uAudioHigh: 0,
    },
    auraVertexShader,
    auraFragmentShader,
    (m: any) => {
        m.transparent = true;
        m.depthWrite = false;
        m.blending = THREE.AdditiveBlending;
    }
);

