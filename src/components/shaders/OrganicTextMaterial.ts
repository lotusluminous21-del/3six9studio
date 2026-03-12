import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
    uniform float uTime;
    uniform float uRadius;
    uniform float uCurvature;
    uniform float uWobble;
    uniform float uFlowSpeed;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    varying float vNoise;

    // Simplex noise helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return vec4(1.79284291400159) - vec4(0.85373472095314) * r; }

    float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        vec3 newPos = position;
        
        // Organic surface displacement
        float noise = snoise(newPos * 2.0 + uTime * uFlowSpeed) * 0.1 * uWobble;
        newPos += normal * noise;
        vNoise = noise;
        
        // Cylindrical Curvature wrap
        if(uCurvature > 0.5) {
            float r = uRadius;
            float theta = newPos.x / r;
            float d = r + newPos.z;
            newPos.x = d * sin(theta);
            newPos.z = d * cos(theta) - r;
        }

        vec4 worldPosition = modelMatrix * vec4(newPos, 1.0);
        vWorldPosition = worldPosition.xyz;
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const fragmentShader = `
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColorOrganic;
    uniform vec3 uColorSynthesis;
    uniform float uSynthesisProgress;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    varying float vNoise;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float res = mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
        return res * 2.0 - 1.0;
    }

    void main() {
        float facingRatio = dot(normalize(vNormal), normalize(vViewDirection));
        float fresnel = clamp(1.0 - facingRatio, 0.0, 1.0);
        
        // --- MATTE BLACK CORE ---
        // Force the face of the letters to be absolute black for maximum legibility
        vec3 color = vec3(0.0, 0.0, 0.0);
        
        // --- THIN SHARP OUTER GLOW ---
        // Very tight Fresnel mask for a sharp rim line rather than a broad glow
        // We use a high power and a narrow smoothstep to compress the effect to the edges
        float rimMask = smoothstep(0.75, 0.98, fresnel);
        float sharpRim = pow(rimMask, 2.0);
        
        // Synthesis patterns restricted to the rim area
        float timeBlock = uTime * 1.5;
        float synWave = sin(vWorldPosition.y * 5.0 - timeBlock) * cos(vWorldPosition.x * 2.0 + timeBlock);
        
        // Synthesis Dots pattern (high frequency, small dots)
        vec2 gridUv = vUv * 120.0;
        gridUv.x -= uTime * 5.0;
        float dots = smoothstep(0.85, 0.98, sin(gridUv.x) * sin(gridUv.y));
        
        // Synthesis Scanning line (very thin)
        float scanner = pow(sin(vUv.y * 30.0 - uTime * 8.0) * 0.5 + 0.5, 24.0);
        
        // Combine effects into the rim glow - reduced base multiplier (1.2 -> 0.8)
        vec3 rimColor = uColorSynthesis * (0.6 + dots * 2.5 + scanner * 1.5);
        
        // Add a "heat" boundary right at the transition from black to glow
        float boundary = pow(4.0 * rimMask * (1.0 - rimMask), 4.0);
        rimColor += mix(uColorSynthesis, vec3(1.0, 1.0, 1.0), 0.5) * boundary * 1.5;

        // Apply sharp rim color over the black core
        color = mix(color, rimColor, sharpRim);
        
        // Final silhouette outline for extra crispness - reduced intensity
        float edgeLine = 1.0 - smoothstep(0.0, 0.02, abs(facingRatio));
        color += uColorSynthesis * edgeLine * 0.5;
        
        gl_FragColor = vec4(color, uOpacity);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const OrganicTextMaterial = shaderMaterial(
    {
        uTime: 0,
        uOpacity: 1,
        uRadius: 10.0,
        uCurvature: 0.0,
        uWobble: 1.0,
        uFlowSpeed: 0.1,
        uColorOrganic: new THREE.Color('#8d6e63'),  // Muted Earthy Brown
        uColorSynthesis: new THREE.Color('#ffccbc'), // Muted Skin/Peach tone
        uSynthesisProgress: 0.2,
    },
    vertexShader,
    fragmentShader
);
