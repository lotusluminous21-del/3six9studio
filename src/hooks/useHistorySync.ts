import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';

export function useHistorySync() {
    const selectedProject = useAppStore((state) => state.selectedProject);
    const isWorkContactOpen = useAppStore((state) => state.isWorkContactOpen);

    // Track the previous state to detect what changed
    const prevState = useRef({
        selectedProject: !!selectedProject,
        isWorkContactOpen
    });

    // Handle Browser Back/Forward buttons (hashchange events)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            
            if (hash === '' || hash === '#home') {
                // User navigated back to root
                if (useAppStore.getState().isWorkContactOpen) {
                    useAppStore.getState().setIsWorkContactOpen(false);
                }
                if (useAppStore.getState().selectedProject) {
                    useAppStore.getState().setSelectedProject(null);
                }
            } else if (hash === '#project') {
                // User navigated back from contact to project, or forward to project
                if (useAppStore.getState().isWorkContactOpen) {
                    useAppStore.getState().setIsWorkContactOpen(false);
                }
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Push/Replace State on UI changes
    useEffect(() => {
        const hash = window.location.hash;
        const wasProjectOpen = prevState.current.selectedProject;
        const wasContactOpen = prevState.current.isWorkContactOpen;
        const isProjectOpen = !!selectedProject;
        const isContactOpen = isWorkContactOpen;

        if (!wasProjectOpen && isProjectOpen && !isContactOpen) {
            // Project was just opened programmatically
            window.history.pushState({ internal: true }, '', '#project');
        } else if (!wasContactOpen && isContactOpen) {
            // Contact was just opened programmatically
            window.history.pushState({ internal: true }, '', '#contact');
        } else if (wasProjectOpen && !isProjectOpen && hash === '#project') {
            // Project was closed programmatically (e.g. Escape or X button)
            if (window.history.state?.internal) {
                // If we placed it in history, safely go back
                window.history.back();
            } else {
                // Otherwise stealthily clear the hash to avoid a ghost entry
                window.history.replaceState(null, '', window.location.pathname);
            }
        } else if (wasContactOpen && !isContactOpen && hash === '#contact') {
            // Contact was closed programmatically (e.g. Escape or X button)
            if (window.history.state?.internal) {
                // If we placed it in history, safely go back
                window.history.back();
            } else {
                if (isProjectOpen) {
                    window.history.replaceState(null, '', '#project');
                } else {
                    window.history.replaceState(null, '', window.location.pathname);
                }
            }
        }

        prevState.current = { selectedProject: isProjectOpen, isWorkContactOpen: isContactOpen };
    }, [selectedProject, isWorkContactOpen]);
}
