import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uHover;
    uniform float uOpacity;
    uniform vec3 uColor;
    varying vec2 vUv;

    // Simple noise function for grain and distortion
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Basic 2D noise for organic edges
    float noise2d(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
        vec2 uv = vUv;
        
        // Organic distortion for the mask
        float distortion = noise2d(uv * 5.0 + uTime * 0.2) * 0.05;
        vec2 distortedUv = uv + distortion;

        // Organic edge masking (vignette/soft edges)
        float d = distance(distortedUv, vec2(0.5));
        float mask = smoothstep(0.8, 0.45, d);
        
        // Rectangular soft edges to blend with card body
        float edgeSoftness = 0.2;
        float rectMask = smoothstep(0.0, edgeSoftness, distortedUv.x) * 
                         smoothstep(1.0, 1.0 - edgeSoftness, distortedUv.x) * 
                         smoothstep(0.0, edgeSoftness, distortedUv.y) * 
                         smoothstep(1.0, 1.0 - edgeSoftness, distortedUv.y);
        
        // Combine masks
        float finalMask = mask * rectMask;

        // Texture lookup (using original uv for sharpness, or distorted for trippy feel)
        // Let's use subtle distortion for the texture too
        vec4 texColor = texture2D(uTexture, uv + distortion * 0.2);
        texColor.rgb *= uColor;
        
        // Apply hover effect (brightness & subtle saturation boost)
        float brightness = mix(0.6, 1.1, uHover);
        texColor.rgb *= brightness;
        
        // Add subtle grain/noise to hide artifacts and add texture
        float grain = random(uv + uTime * 0.05) * 0.08;
        texColor.rgb += grain * (1.0 - uHover * 0.5); // Less noise when hovered

        // Vignette effect (darken corners)
        float vignette = smoothstep(0.7, 0.3, distance(uv, vec2(0.5)));
        texColor.rgb *= mix(0.7, 1.0, vignette);

        float alpha = texColor.a * uOpacity * finalMask;
        
        gl_FragColor = vec4(texColor.rgb, alpha);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const ThumbnailMaterial = shaderMaterial(
    {
        uTexture: null,
        uTime: 0,
        uHover: 0,
        uOpacity: 0,
        uColor: new THREE.Color('#ffffff'),
    },
    vertexShader,
    fragmentShader
);
