'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import DebugTools from '@/components/DebugTools';

export default function GlobalErrorLogger({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('[Global App Error Boundary Caught Exception]:', error);
    }, [error]);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            color: 'white',
            zIndex: 99999,
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff4444' }}>
                Something went wrong!
            </h2>
            <p style={{ marginBottom: '2rem', maxWidth: '600px', opacity: 0.8 }}>
                The application encountered an unexpected error. We have logged this issue.
            </p>
            <div style={{ 
                background: '#1a1a1a', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '2rem',
                maxWidth: '80%',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: '#ff8888',
                textAlign: 'left'
            }}>
                {error.message || 'Unknown error occurred'}
            </div>
            <button
                onClick={() => reset()}
                style={{
                    padding: '0.8rem 1.5rem',
                    backgroundColor: 'white',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
                Try to recover
            </button>
            <DebugTools />
        </div>
    );
}
