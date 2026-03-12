'use client';

import { useEffect, useState } from 'react';

/**
 * DebugTools adds a hidden mobile console (Eruda) that can be activated 
 * by adding ?debug=true to the URL.
 * 
 * Also provides a basic WebGL report in the console.
 */
export default function DebugTools() {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        // Activate via URL parameter
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'true') {
            setIsActive(true);
        }
    }, []);

    useEffect(() => {
        if (!isActive) return;

        // Load Eruda (Mobile Console)
        const script = document.createElement('script');
        script.src = '//cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
            // @ts-ignore
            window.eruda.init();
            console.log('[Debug] Eruda initialized. Checking WebGL capabilities...');
            
            // Basic WebGL Diagnostic
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl instanceof WebGLRenderingContext) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                const report = {
                    vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
                    renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
                    extensions: gl.getSupportedExtensions()?.length || 0,
                    pixelRatio: window.devicePixelRatio,
                };
                console.table(report);
            } else {
                console.error('WebGL not supported on this device/browser');
            }
        };
        document.body.appendChild(script);

        return () => {
            // Cleanup if needed
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [isActive]);

    return null; // This component doesn't render anything itself
}
