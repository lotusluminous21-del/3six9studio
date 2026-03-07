import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
    precision mediump float;
    uniform float uTime;
    uniform float uEntrance; 
    uniform float uIsFlora;  
    uniform float uIsBridge; 
    uniform float uIsFilament;
    uniform float uScrollVelocity;
    uniform float uFlowSpeed; 
    uniform float uSurfaceScale; 
    uniform float uAudioLow;
    uniform float uAudioMid;
    uniform float uAudioHigh;
    uniform float uAudioStrength;
    
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
        #ifdef USE_INSTANCING
            mat3 m = mat3(instanceMatrix);
            vNormal = normalize(normalMatrix * m * normal);
        #else
            vNormal = normalize(normalMatrix * normal);
        #endif
        
        float time = uTime * uFlowSpeed * (1.0 / 9.0) * 3.14159; 
        
        vec3 wPos;
        #ifdef USE_INSTANCING
            wPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz * uSurfaceScale;
        #else
            wPos = (modelMatrix * vec4(position, 1.0)).xyz * uSurfaceScale;
        #endif
        
        float noise = snoise(wPos * 0.5 + time) * 0.5;
        noise += sin(wPos.x * 3.0 + wPos.y * 2.0 - time * 3.0) * 0.15;
        vNoise = noise;
        
        vec3 newPos = position;

        // Flora Particles - Organic quivering & Blossoming
        if (uIsFlora > 0.5 && uIsFilament < 0.5) {
            newPos += normal * noise * 0.5;
            
            #ifdef USE_INSTANCING
                // Use instance matrix to get a unique seed per particle
                float particleSeed = instanceMatrix[3][0] + instanceMatrix[3][1];
                // Gently swell and contract to look like a breathing blossom
                float blossomPulse = sin(uTime * 1.5 + particleSeed) * 0.5 + 0.5;
                newPos += normal * blossomPulse * 0.3;
            #endif
        } else if (uIsFilament < 0.5) {
            // Main helix displacement - react to bass (uAudioLow)
            float bassBounce = uAudioLow * 0.8 * uAudioStrength; // Stronger bounce multiplier
            newPos += normal * (noise * (0.6 + bassBounce) + bassBounce * 0.4); // Push the normals outward forcefully
            
            // Expand radius aggressively on bass hits
            newPos.xz *= 1.0 + bassBounce * 0.12; // Sophisticated, visible expansion
        }
        
        if (uIsBridge > 0.5) {
            float pulseFrequency = 9.0 * 3.14159 * 2.0;
            float pulseAmount = sin(uTime * pulseFrequency) * 0.5 + 0.5; 
            float bridgeMask = sin(vUv.x * 3.14159); 
            newPos = position + normal * (noise * 0.1 + pulseAmount * bridgeMask * 0.05);
        }

        // --- FILAMENT PHYSICS (Vertex shader pinning) ---
        if (uIsFilament > 0.5) {
            // The top is attached to the flora, meaning it shouldn't move. 
            // In a LineCurve3 TubeGeometry, vUv.x goes from 0 at start point to 1 at end point.
            float pinMask = vUv.x * vUv.x; // quadratic increase so only bottom half really bends
            
            // Limit severe bending so it doesn't snap abruptly
            // Add subtle ambient wind/sway so they don't look dead when stopped
            // Using world pos offsets so they don't all sway in unison
            vec3 worldSeed = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float swayX = sin(uTime * 1.5 + worldSeed.y) * 0.2;
            float swayZ = cos(uTime * 1.2 + worldSeed.x) * 0.2;
            
            newPos.x += swayX * pinMask;
            newPos.z += swayZ * pinMask;
            
            // We use no noise displacement on the thin strings so they stay elegant
        }

        if (uIsFlora < 0.5 && uIsBridge < 0.5 && uIsFilament < 0.5) {
            vec3 origin = vec3(0.0, 5.0, 0.0); 
            float distFromCenter = length(position - origin) * 0.005;
            // Removed the old bloom/twist entrance logic as we are substituting it with the rooting mechanic
        }
        
        vec4 worldPosition;
        #ifdef USE_INSTANCING
            worldPosition = modelMatrix * instanceMatrix * vec4(newPos, 1.0);
            
            // Add subtle ambient swarming drift to flora particles
            if (uIsFlora > 0.5 && uIsFilament < 0.5) {
                float seed = worldPosition.y + worldPosition.x;
                worldPosition.y += sin(uTime * 0.4 + seed) * 0.3;
                worldPosition.x += cos(uTime * 0.3 + seed) * 0.2;
                worldPosition.z += sin(uTime * 0.5 - seed) * 0.2;
            }
        #else
            worldPosition = modelMatrix * vec4(newPos, 1.0);
        #endif
        
        vWorldPosition = worldPosition.xyz;
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const fragmentShader = `
    precision mediump float;
    uniform float uTime;
    uniform float uIsFlora;
    uniform float uIsBridge;
    uniform float uIsFilament;
    uniform float uFlowSpeed;
    uniform float uSurfaceScale;
    uniform float uAudioLow;
    
    uniform vec3 uColorBase;
    uniform vec3 uColorAccent;
    uniform vec3 uColorGlance;
    uniform float uAudioHigh;
    uniform float uAudioMid;
    uniform float uAudioStrength;
    uniform float uEntrance;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    varying float vNoise;

    // Fast 2D noise mapping
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
        
        // Base color mixed with glance
        vec3 color = mix(uColorBase, uColorGlance, smoothstep(0.2, 0.9, fresnel));
        
        vec3 lightDir = normalize(vec3(0.8, 0.5, 0.5)); // Match key light direction roughly
        vec3 backLightDir = normalize(vec3(-0.5, -1.0, -1.0)); // Match rim light 
        
        // Deep shadows: Darken areas facing away from light
        float shadowCore = smoothstep(0.5, -0.5, dot(vNormal, lightDir));
        color = mix(color, vec3(0.0, 0.0, 0.0), shadowCore * 0.95); // Near black in deep shadow
        
        // Specular / Scatter light with tighter wrap for high contrast
        float wrap = 0.3; 
        float scatter = max(0.0, (dot(vNormal, lightDir) + wrap) / (1.0 + wrap));
        float backScatter = max(0.0, (dot(vNormal, backLightDir) + wrap) / (1.0 + wrap));
        
        scatter = pow(scatter, 4.0); // Sharper, punchier core highlight
        backScatter = pow(smoothstep(0.4, 1.0, backScatter), 2.0); // Thinner, sharper rim
        
        // Boost the strength of the lights dramatically so they bloom against the dark base
        color += uColorAccent * scatter * 2.5;
        color += uColorGlance * backScatter * 3.0 * fresnel;
        
        vec3 basePos = vWorldPosition * 3.5;
        basePos.y -= uTime * 0.15;
        
        vec2 warpP = basePos.xz + basePos.y;
        vec2 warpOffset = vec2(
            sin(warpP.x * 0.7 + uTime * 0.05),
            cos(warpP.y * 0.7 + uTime * 0.07)
        ) * 0.5;
        
        float warpedNoise = noise2D(warpP + warpOffset);
        // Blend vertex noise to add depth without extra FS compute
        warpedNoise = mix(warpedNoise, vNoise, 0.3);
        float veins = smoothstep(0.4, 0.45, abs(warpedNoise));
        
        float veinPulse = 1.0 + uAudioMid * 2.0 * uAudioStrength;
        color += (1.0 - veins) * 0.05 * uColorAccent * veinPulse;
        
        // High frequency glimmer
        color += uColorAccent * pow(max(0.0, warpedNoise), 4.0) * uAudioHigh * 1.2 * uAudioStrength;
        
        if (uIsFlora > 0.5) {
            float timeEffect = uTime * uFlowSpeed * 0.1;
            float worldScale = uSurfaceScale * 1.5;
            
            float bandFreq = 8.0 * uSurfaceScale;
            float bandNoise = noise2D(vWorldPosition.xy * worldScale + timeEffect);
            float bands = sin((vUv.x * 20.0 + vUv.y * 4.0) * bandFreq + bandNoise * 4.0) * 0.5 + 0.5;
            bands = smoothstep(0.2, 0.8, bands); 
            
            float cells = sin((vUv.x * 8.0 - vUv.y * 12.0) * bandFreq * 1.5) * 0.5 + 0.5;
            float pattern = bands * cells * 1.5;

            // High-Contrast Psychedelic Palette (DMT Image Inspired)
            vec3 blossomMagenta = vec3(0.95, 0.10, 0.40); // Searing magenta
            vec3 blossomGold    = vec3(1.00, 0.60, 0.10); // Hyper gold/orange
            vec3 blossomLavender= vec3(0.20, 0.85, 0.75); // Vibrant teal/cyan replacing lavender
            vec3 blossomPeach   = vec3(0.95, 0.35, 0.20); // Deep rich orange
            
            float paletteMix = noise2D(warpP * 0.3 + uTime * 0.1) * 0.5 + 0.5;
            vec3 blossomAccent = mix(blossomMagenta, blossomLavender, smoothstep(0.2, 0.7, paletteMix));
            blossomAccent = mix(blossomAccent, blossomGold, smoothstep(0.8, 1.0, paletteMix));
            blossomAccent = mix(blossomAccent, blossomPeach, smoothstep(0.0, 0.2, noise2D(warpP * 1.5)));
            
            // Retain the green strings for filaments
            vec3 tetherTeal = vec3(0.15, 0.60, 0.55);
            vec3 tetherSage = vec3(0.50, 0.65, 0.55);
            
            // If it is a thin filament, it should just be purely glowing accent color
            if (uIsFilament > 0.5) {
                 if (uEntrance <= 0.0) {
                     discard;
                 }
                 float pulse = sin(uTime * 3.0 - vUv.x * 20.0) * 0.5 + 0.5;
                 color = mix(tetherTeal, tetherSage, pulse) * 1.5; // Vibrant glowing strings
                 
                 // Make the tips glow intensly with a touch of gold
                 color += blossomGold * smoothstep(0.7, 1.0, vUv.x) * 2.0;

                 // Fade in during Germination stage
                 color *= uEntrance;
            } else {
                 // Spores / Blossoming Particles
                 color = mix(color * 0.4, blossomAccent * 1.2, pattern);
                 
                 // Reuse warpedNoise for grain instead of extra noise2D call
                 float floraGrain = warpedNoise * sin(warpP.x * 12.0 + warpP.y * 8.0 + warpedNoise * 3.0);
                 color += floraGrain * 0.3 * blossomAccent;
                 
                 // Derive inner pattern from paletteMix instead of extra noise2D call
                 float innerPattern = smoothstep(0.5, 1.0, sin(warpP.x * 4.0 + warpP.y * 3.0 - uTime * 0.3));
                 color += innerPattern * 0.2 * blossomGold;
                 
                 // Rim glow to make them look softer and ethereal
                 color += smoothstep(0.3, 1.0, 1.0 - facingRatio) * blossomMagenta * 1.5;
            }
        }
        
        // Default alpha
        float alpha = 1.0;

        // ======== SYNTHESIS STATE & DIGITAL OVERLAY (Main Strands only) ========
        if (uIsFlora < 0.5 && uIsFilament < 0.5 && uIsBridge < 0.5) {
            
            // SYNTHESIS STATE (PERFORMANCE OPTIMIZED): 
            // Replace expensive 2D noise with layered sinusoidal wave interference
            float timeBlock = uTime * 0.5;
            
            // Wave 1: Large sweeping waves
            float wave1 = sin(vWorldPosition.y * 0.15 - timeBlock) * cos(vWorldPosition.x * 0.15 + vWorldPosition.z * 0.15);
            // Wave 2: High frequency disruption
            float wave2 = sin(vWorldPosition.x * 0.8 + timeBlock) * cos(vWorldPosition.z * 0.8 - timeBlock * 0.5);
            // Combine waves to approximate pseudo-random scattered noise
            // Multiply the result to give it slightly stronger contrast
            float synthNoise = (wave1 + wave2 * 0.5) * 1.2; 
            
            // Bias the waves: positive favors organic
            synthNoise += 0.1; // Reduced from 0.35 to bring back more holographic areas
            
            // Add sophisticated complexity to the transition edge using warped noise
            float edgeDistortion = warpedNoise * 0.4 * sin(vWorldPosition.y * 3.0 - uTime * 2.0);
            
            // isOrganic goes from 0.0 (forming, digital) to 1.0 (formed, flesh)
            // Use perturbation to create fractured/bleeding edges at the boundary
            float isOrganic = smoothstep(-0.1, 0.4, synthNoise + edgeDistortion); 
            
            vec2 gridUv = vec2(vUv.x * 1800.0, vUv.y * 24.0); // Dense grid for long strands
            
            // Flowing data stream effect
            gridUv.x -= uTime * 8.0;
            
            // Integrate with organic structural noise (reusing already calculated warpedNoise)
            gridUv += warpedNoise * 2.0;
            
            float dotPattern = sin(gridUv.x) * sin(gridUv.y);
            
            // In forming areas (isOrganic near 0), particles are thicker and densely packed
            float particleThreshold = mix(0.6, 0.95, isOrganic); 
            float digitalDots = smoothstep(particleThreshold, particleThreshold + 0.05, dotPattern);
            
            // Data clustering (PERFORMANCE OPTIMIZED):
            // Replace noise2D with a fast hash/sine combo for the blocky data clusters
            float clusterScale = 150.0;
            vec2 clusterUv = vec2(vUv.x * clusterScale - uTime * 0.5, vUv.y * 4.0);
            
            // Fast fake noise using sine
            float dataClusters = sin(clusterUv.x) * cos(clusterUv.y) + sin(clusterUv.x * 2.1 + clusterUv.y * 1.3) * 0.5;
            
            // Less clustering in forming areas (more chaotic and full)
            digitalDots *= mix(smoothstep(-1.0, 0.5, dataClusters), smoothstep(0.0, 0.5, dataClusters), isOrganic);
            
            // Scanning laser pass
            float scanScale = 50.0;
            float scanner = sin(vUv.x * scanScale - uTime * 4.0) * 0.5 + 0.5;
            scanner = pow(scanner, 8.0);
            
            // Synthetic Blue/Cyan palette - strictly controlled brightness to avoid fx engine blowout
            vec3 techCyan = vec3(0.0, 0.6, 0.9); // Vivid cyan but contained
            vec3 techBlue = vec3(0.0, 0.1, 0.8);  // Deep rich blue
            vec3 techColor = mix(techBlue, techCyan, scanner + fresnel);
            
            // Reactivity & Visibility
            // Measured pulse in forming areas
            float techPulse = mix(0.9, 0.2, isOrganic) + scanner * 1.0 + (uAudioHigh * 1.5 * uAudioStrength);
            float holoRim = smoothstep(0.0, 1.0, fresnel);
            
            float dotGlow = digitalDots * techPulse * (holoRim + mix(0.5, 0.2, isOrganic));
            
            // BLENDING:
            // Where forming (isOrganic = 0): base color is dark/transparent, walls are made of bright blue particles
            // Where formed (isOrganic = 1): base color is organic meat, subtle particles on top
            
            // Avoid extreme multipliers
            vec3 formingWallColor = techBlue * 0.02 + techCyan * digitalDots * 1.5; 
            color = mix(formingWallColor, color, isOrganic);
            
            // Add the extra overlay particles with a safe multiplier
            color += techColor * dotGlow * mix(1.4, 0.5, isOrganic); 
            
            // Sophisticated transition energy: visual "heat" at the boundary of synthesis
            // isOrganic = 0.5 hits the peak (1.0)
            float boundaryHeat = pow(4.0 * isOrganic * (1.0 - isOrganic), 4.0);
            // Glows cyan on the digital side, bleeding into accent (gold/orange) on the organic side
            vec3 heatColor = mix(techCyan + vec3(0.5, 0.5, 1.0), uColorAccent + vec3(1.0, 0.5, 0.0), isOrganic);
            color += heatColor * boundaryHeat * 1.4;
            
            // Transparency
            // Fully transparent where not organic, except where there are particles or a holographic rim
            float formingAlpha = max(digitalDots * 0.9, holoRim * 0.3); 
            alpha = clamp(mix(formingAlpha, 1.0, isOrganic), 0.0, 1.0); // Strict clamp against NaN/artifacts
            
            // Thin contour line at the tube silhouette edge
            // facingRatio ~ 0 at the exact geometric edge; narrow band = clean line, not glow
            float edgeLine = 1.0 - smoothstep(0.0, 0.12, abs(facingRatio));
            float outlineStrength = edgeLine * (1.0 - isOrganic) * 0.4;
            color += vec3(0.3, 0.7, 1.0) * outlineStrength;
            alpha = max(alpha, outlineStrength * 0.5);
        }

        float coreGlow = smoothstep(0.7, 1.0, facingRatio);
        coreGlow *= mix(1.0, 0.1, uIsFlora); 
        
        // --- NARRATIVE ENTRANCE (Rooting & Nexus) ---
        if (uIsBridge < 0.5 && uIsFlora < 0.5 && uIsFilament < 0.5) {
            // Main Strand - Rooting mechanic
            float totalHeight = 250.0;
            float startY = 15.0; // The top Y position from CentralSpine.tsx
            
            // For a dramatic drop, we need to map uEntrance (0 to 1) to the Y space (15.0 to -235.0)
            float dropLevel = startY - (uEntrance * totalHeight);
            
            if (vWorldPosition.y < dropLevel) {
                // If the pixel is below the current drop level, clip it
                discard;
            }
            
            // Add a burning/glowing tip right at the growth front
            float tipDistance = vWorldPosition.y - dropLevel; // Positive value, 0 at the very bottom
            float tipGlow = smoothstep(3.0, 0.0, tipDistance); // Strongest at 0, fades out 3 units up
            
            // Hot tip color
            vec3 tipColor = vec3(1.0, 0.8, 0.3); // Bright hot gold/white
            color += tipColor * pow(tipGlow, 2.0) * 5.0 * uEntrance; // Intensely bright at the tip
        }

        if (uIsBridge > 0.5) {
             // Nexus Bridges - fade in gradually
             if (uEntrance <= 0.0) {
                 discard;
             }
             
             float pulse = sin(uTime * 9.0 * 3.14159 * 2.0 - vUv.x * 10.0) * 0.5 + 0.5;
             vec3 energyColor = mix(uColorAccent, vec3(0.9, 0.95, 1.0), pulse);
             color = mix(color, energyColor, 0.6);
             color += energyColor * fresnel * 0.8;
             coreGlow *= 0.3; 
             
             // Multiply alpha/brightness by uEntrance for a smooth fade-in
             color *= uEntrance;
             alpha *= uEntrance;
        }

        color += coreGlow * uColorAccent * 0.5;

        gl_FragColor = vec4(color, alpha);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export const HelixMaterial = shaderMaterial(
    {
        uTime: 0,
        uScrollDepth: 0,
        uScrollVelocity: 0,
        uEntrance: 1.0,
        uIsFlora: 0.0,
        uIsBridge: 0.0,
        uIsFilament: 0.0,
        uFlowSpeed: 1.0,
        uSurfaceScale: 1.0,
        uAudioLow: 0.0,
        uAudioMid: 0.0,
        uAudioHigh: 0.0,
        uAudioStrength: 1.0,
        uColorBase: new THREE.Color('#0a0508').convertLinearToSRGB(), // Almost black
        uColorAccent: new THREE.Color('#ffb347').convertLinearToSRGB(), // Glowing orange key
        uColorGlance: new THREE.Color('#ff1a66').convertLinearToSRGB(), // Piercing pink/magenta rim
    },
    vertexShader,
    fragmentShader
);
