import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
    uniform float uTime;
    uniform float uRadius;
    uniform float uCurvature;
    uniform float uWobble;
    uniform float uFlowSpeed;
    uniform float uExpansion;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;

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

        // Geometrically sensible horizontal expansion from center
        newPos.x *= uExpansion;
        
        // Organic surface displacement
        float noise = snoise(newPos * 1.5 + uTime * uFlowSpeed) * 0.08 * uWobble;
        newPos += normal * noise;
        
        // Cylindrical Curvature wrap
        if(uCurvature > 0.0) {
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
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDirection;

    void main() {
        // Subtle vertical fade to soften edges top and bottom
        float edgeSoftness = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        
        // Horizontal fade for a wide banner look that dissolves at ends
        // We make this tighter since the width is going to be massive
        float sideSoftness = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        
        // Base color is a pure, flat black/dark grey for HUD look
        // No reaction to scene light or fresnel
        vec3 color = vec3(0.02, 0.005, 0.01);
        
        // Optional: Very subtle scanline pattern for AR feel
        float scanline = sin(vUv.y * 200.0) * 0.02;
        color += scanline;
        
        float alpha = uOpacity * 0.85 * edgeSoftness * sideSoftness;
        
        gl_FragColor = vec4(color, alpha);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const BannerMaterial = shaderMaterial(
    {
        uTime: 0,
        uOpacity: 1,
        uRadius: 10.0,
        uCurvature: 1.0,
        uWobble: 1.0,
        uFlowSpeed: 0.1,
        uExpansion: 1.0,
    },
    vertexShader,
    fragmentShader
);
