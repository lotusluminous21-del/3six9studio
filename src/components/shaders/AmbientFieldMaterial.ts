import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
    precision mediump float;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const fragmentShader = `
    precision mediump float;
    uniform float uTime;
    uniform float uScrollProgress;
    uniform float uEntrance;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // ---- Simplex 3D noise ----
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return vec4(1.79284291400159) - vec4(0.85373472095314) * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    // ---- Day-Cycle Palette (Deepened for high contrast) ----
    // Dawn (top) → Midday (middle) → Twilight (bottom)
    vec3 dawnWarm    = vec3(0.12, 0.04, 0.02);   // Deep rust / dark mahogany
    vec3 dawnGold    = vec3(0.15, 0.08, 0.02);   // Dark amber 
    vec3 middayBlue  = vec3(0.02, 0.08, 0.15);   // Deep ocean / midnight cyan
    vec3 middaySage  = vec3(0.02, 0.10, 0.06);   // Deep moss / dark teal
    vec3 duskViolet  = vec3(0.08, 0.02, 0.15);   // Deep indigo
    vec3 duskRose    = vec3(0.12, 0.02, 0.08);   // Dark velvet rose
    vec3 deepNight   = vec3(0.0, 0.0, 0.0);      // Pure black

    vec3 getPaletteColor(float t) {
        // t: 0 = top (dawn), 1 = bottom (twilight)
        // 5-stop gradient with smooth blending
        vec3 c;
        if (t < 0.2) {
            c = mix(dawnWarm, dawnGold, t / 0.2);
        } else if (t < 0.4) {
            c = mix(dawnGold, middaySage, (t - 0.2) / 0.2);
        } else if (t < 0.6) {
            c = mix(middaySage, middayBlue, (t - 0.4) / 0.2);
        } else if (t < 0.8) {
            c = mix(middayBlue, duskViolet, (t - 0.6) / 0.2);
        } else {
            c = mix(duskViolet, duskRose, (t - 0.8) / 0.2);
        }
        return c;
    }

    void main() {
        // ---- 1. Volumetric Gradient (Ambient Field) ----
        // Use world position for 3D noise so parallax naturally occurs
        vec3 noiseCoord = vWorldPosition * 0.02 + vec3(0.0, uTime * 0.008, uTime * 0.005);

        // Multi-octave noise for rich, cloudy variation
        float n1 = snoise(noiseCoord) * 0.5 + 0.5;
        float n2 = snoise(noiseCoord * 2.3 + 17.0) * 0.5 + 0.5;
        float noiseField = n1 * 0.65 + n2 * 0.35;

        // Scroll-mapped palette position (0 = dawn at top, 1 = twilight at bottom)
        // Add noise displacement so the gradient isn't a flat horizontal band
        float paletteT = clamp(uScrollProgress + (noiseField - 0.5) * 0.25, 0.0, 1.0);
        vec3 gradientColor = getPaletteColor(paletteT);

        // Modulate brightness with noise to create volumetric fog feel
        float fogDensity = 0.6 + noiseField * 0.4;
        // Pushing the mix deeper into deepNight for high contrast
        vec3 baseColor = mix(deepNight, gradientColor, fogDensity * 0.15); 

        // ---- 2. Micro-Patterns ----
        // These are intentionally very subtle — visible only on close inspection

        // 2a. Concentric ripples (radial sine waves emanating from center)
        vec2 centered = vUv - 0.5;
        float dist = length(centered);
        float ripplePhase = dist * 40.0 - uTime * 0.3;
        float ripples = sin(ripplePhase) * 0.5 + 0.5;
        ripples *= smoothstep(0.5, 0.1, dist); // Fade near edges so they're center-focused
        ripples *= 0.025; // Very faint

        // 2b. Flow-field lines (sine-based approximation of domain-warped streaks)
        float flowNoise = sin(vUv.x * 6.0 + uTime * 0.04 + sin(vUv.y * 8.0) * 1.8)
                        * cos(vUv.y * 6.0 - uTime * 0.03);
        // Create thin flowing lines by taking derivative-like sharpening
        float flowLines = smoothstep(0.35, 0.40, abs(flowNoise));
        flowLines = (1.0 - flowLines) * 0.04; // Invert and keep very subtle

        // 2c. Moiré interference (two overlapping fine patterns)
        float moire1 = sin((vUv.x * 80.0 + vUv.y * 30.0) + uTime * 0.1);
        float moire2 = sin((vUv.x * 30.0 - vUv.y * 80.0) - uTime * 0.08);
        float moire = (moire1 * moire2) * 0.5 + 0.5;
        moire *= 0.02; // Extremely faint

        // Combine micro-patterns
        float microPattern = ripples + flowLines + moire;

        // Blend patterns into the base — they inherit the gradient's warm/cool tint
        // Intensify pattern slightly against darker background
        vec3 patternColor = gradientColor * 2.5; 
        vec3 finalColor = baseColor + patternColor * microPattern;

        // Soft vignette to darken edges and focus attention on center
        // Tighter and darker vignette to sink the background away
        float vignette = 1.0 - smoothstep(0.1, 0.6, dist * 1.5);
        finalColor *= mix(0.0, 1.0, vignette);

        // Narrative Entrance Fade
        finalColor *= uEntrance;

        gl_FragColor = vec4(finalColor, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const AmbientFieldMaterial = shaderMaterial(
    {
        uTime: 0,
        uScrollProgress: 0,
        uEntrance: 0.0,
    },
    vertexShader,
    fragmentShader
);
