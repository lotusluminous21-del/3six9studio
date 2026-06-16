'use client';

import dynamic from 'next/dynamic';
import HeaderUI from '@/components/HeaderUI';
import SidebarUI from '@/components/SidebarUI';
import LoadingScreen from '@/components/LoadingScreen';
import ProjectExpandedView from '@/components/ProjectExpandedView';
import WorkContactView from '@/components/WorkContactView';
import DebugTools from '@/components/DebugTools';
import { useHistorySync } from '@/hooks/useHistorySync';

// Dynamically import the Scene to avoid SSR issues with Three.js.
// This stays ssr:false — the WebGL experience remains a pure client island.
const Scene = dynamic(() => import('@/components/Scene'), {
    ssr: false,
});

/**
 * The immersive WebGL experience, extracted verbatim from the old page.tsx so
 * that page.tsx can become a Server Component (which is required for metadata,
 * JSON-LD and server-rendered marketing copy). Behaviour is unchanged.
 */
export default function ImmersiveApp() {
    useHistorySync();

    return (
        <>
            <LoadingScreen />
            <DebugTools />
            <div className="canvas-container">
                {/* The Scene component will initialize R3F Canvas */}
                <Scene />
            </div>

            <div className="ui-container">
                <ProjectExpandedView />
                <WorkContactView />
                <HeaderUI />
                <SidebarUI />
            </div>
        </>
    );
}
