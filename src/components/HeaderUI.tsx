'use client';

import { useEffect, useState } from 'react';
import { useScrollStore } from '../store/glitchStore';
import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';

export default function HeaderUI() {
  const [opacity, setOpacity] = useState(0);
  const [transitionSpeed, setTransitionSpeed] = useState('1.5s');
  const isEntered = useAppStore((state) => state.isEntered);
  const selectedProject = useAppStore((state) => state.selectedProject);

  useEffect(() => {
    let unsub = () => { };
    let isMounted = true;

    if (!isEntered || selectedProject) {
      setOpacity(0);
      return;
    }

    // Narrow entrance delay ONLY on initial entrance
    // We check if it's been more than 5 seconds since entrance
    const timeSinceEntrance = (performance.now() / 1000) - (useAppStore.getState().entranceStartTime || 0);
    const delay = timeSinceEntrance < 5 ? 2800 : 0;

    const entranceTimer = setTimeout(() => {
      if (isMounted) {
        setOpacity(1);

        // After the slow entrance fade, revert to snappy transitions for scroll fades
        setTimeout(() => {
          if (isMounted) setTransitionSpeed('0.4s');
        }, 1500);

        unsub = useScrollStore.subscribe((state) => {
          const isScrollingFast = state.scrollVelocity > 0.05;
          setOpacity(isScrollingFast ? 0.3 : 1.0);
        });
      }
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(entranceTimer);
      unsub();
    };
  }, [isEntered, selectedProject]);

  return (
    <header
      className="header-ui pointer-events-none"
      style={{ 
        opacity, 
        transition: `opacity ${transitionSpeed} ease`,
        visibility: opacity === 0 ? 'hidden' : 'visible'
      }}
    >
      <div className="nav-container pointer-events-auto">
        <button className="nav-pill" onClick={() => useAppStore.getState().setIsWorkContactOpen(true)}>
          WORK <span className="squiggle">—</span> CONTACT
        </button>
      </div>
      {/* The tracker was from the retro concept. This is replaced by spatial info */}
      <div className="location-container pointer-events-auto">
        <div className="location-pill">
          <span className="slide-name">ARCHIVE // 369</span>
        </div>
      </div>

      <div className="audio-control pointer-events-auto" style={{ marginTop: '0.5rem' }}>
        <button
          className={`audio-pill ${useAudioStore((s) => s.isPlaying) ? 'playing' : ''}`}
          onClick={() => useAudioStore.getState().setPlaying(!useAudioStore.getState().isPlaying)}
        >
          {useAudioStore((s) => s.isPlaying) ? 'AUDIO: ON' : 'AUDIO: OFF'}
        </button>
      </div>

      <style jsx>{`
        .header-ui {
          position: absolute;
          top: 2rem;
          right: 3rem;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1rem;
          z-index: 100;
        }

        @media (max-width: 768px) {
          .header-ui {
            top: 1rem;
            right: 1rem;
            gap: 0.5rem;
          }
        }

        .nav-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          padding: 0.75rem 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          font-family: 'Inter', 'Outfit', 'Satoshi', sans-serif;
          font-weight: 400;
          font-size: 0.8rem;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .nav-pill {
            padding: 0.5rem 1rem;
            font-size: 0.7rem;
            gap: 0.5rem;
          }
        }

        .nav-pill:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.4);
          color: rgba(255, 255, 255, 1);
        }

        .squiggle {
          color: rgba(255, 255, 255, 0.3);
        }

        .location-pill {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'Inter', 'Outfit', 'Satoshi', sans-serif;
          font-weight: 300;
          font-size: 0.7rem;
          padding: 0.5rem 1rem;
          backdrop-filter: blur(8px);
        }

        @media (max-width: 768px) {
          .location-pill {
            padding: 0.4rem 0.8rem;
            font-size: 0.6rem;
          }
        }

        .slide-name {
          letter-spacing: 0.1em;
        }

        .audio-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 0.5rem 1rem;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }

        @media (max-width: 768px) {
          .audio-pill {
            padding: 0.4rem 0.8rem;
            font-size: 0.55rem;
          }
        }

        .audio-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
        }

        .audio-pill.playing {
          border-color: rgba(180, 212, 255, 0.4);
          color: rgba(180, 212, 255, 0.9);
          background: rgba(180, 212, 255, 0.05);
          box-shadow: 0 0 15px rgba(180, 212, 255, 0.1);
        }
      `}</style>
    </header>
  );
}
