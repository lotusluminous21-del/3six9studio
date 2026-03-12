'use client';

import dynamic from 'next/dynamic';
import HeaderUI from '@/components/HeaderUI';
import SidebarUI from '@/components/SidebarUI';
import LoadingScreen from '@/components/LoadingScreen';
import ProjectExpandedView from '@/components/ProjectExpandedView';
import WorkContactView from '@/components/WorkContactView';
import DebugTools from '@/components/DebugTools';

// Dynamically import the Scene to avoid SSR issues with Three.js
const Scene = dynamic(() => import('@/components/Scene'), {
    ssr: false,
});

export default function Home() {
    return (
        <main>
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

        </main>
    );
}
