'use client';

import { useEffect, useState } from 'react';
import { useScrollStore } from '../store/glitchStore';
import { useAppStore } from '../store/appStore';

export default function SidebarUI() {
  const [opacity, setOpacity] = useState(0);
  const [transitionSpeed, setTransitionSpeed] = useState('1.5s');
  const { isEntered, categories, selectedProject } = useAppStore();
  const setScrollToIndex = useScrollStore(state => state.setScrollToIndex);

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

        // Subscribe to global scroll store outside of React render cycle 
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
    <aside
      className="sidebar-ui pointer-events-auto"
      style={{ 
        opacity, 
        transition: `opacity ${transitionSpeed} ease`,
        visibility: opacity === 0 ? 'hidden' : 'visible'
      }}
    >
      <h2 className="sidebar-title">WHAT ARE YOU LOOKING FOR?</h2>

      <ul className="category-list">
        {categories.length > 0 ? categories.map((cat, i) => (
          <li key={i}>
            <button 
                className="category-btn"
                onClick={() => {
                    // +2 because 0 is Logo, 1 is Text, projects start at 2
                    setScrollToIndex(i + 2);
                }}
            >
              <span className="arrow">-&gt;</span> {cat.title}
            </button>
          </li>
        )) : (
            <li><span className="category-btn">...</span></li>
        )}
      </ul>

      <button className="ask-btn">
        ASK ME ANYTHING...
      </button>

      <style jsx>{`
        .sidebar-ui {
          position: absolute;
          bottom: 4rem;
          left: 3rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          z-index: 100;
        }

        @media (max-width: 768px) {
          .sidebar-ui {
            bottom: 1.5rem;
            left: 0;
            right: 0;
            width: 100%;
            padding: 0 1.5rem;
            gap: 1rem;
            align-items: center;
          }
        }

        .sidebar-title {
          font-family: 'Inter', 'Outfit', 'Satoshi', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.9);
        }

        @media (max-width: 768px) {
          .sidebar-title {
            font-size: 0.7rem;
            text-align: center;
            opacity: 0.7;
          }
        }

        .category-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .category-list {
            flex-direction: row;
            overflow-x: auto;
            width: 100%;
            padding: 0.5rem 0;
            gap: 1.5rem;
            scroll-snap-type: x mandatory;
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
          .category-list::-webkit-scrollbar {
            display: none; /* Chrome, Safari and Opera */
          }
          .category-list li {
            scroll-snap-align: center;
            flex-shrink: 0;
          }
        }

        .category-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-family: 'Inter', 'Outfit', 'Satoshi', sans-serif;
          font-weight: 300;
          font-size: 0.85rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.3s ease;
          display: flex;
          gap: 0.5rem;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .category-btn {
            font-size: 0.75rem;
            padding: 0.5rem 0.25rem;
          }
        }

        .category-btn:hover {
          color: rgba(255, 255, 255, 1);
          transform: translateX(5px);
        }

        @media (max-width: 768px) {
          .category-btn:hover {
            transform: translateY(-2px);
          }
        }

        .arrow {
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .arrow {
            display: none;
          }
        }

        .ask-btn {
          margin-top: 1rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 30px;
          padding: 0.75rem 1.5rem;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Inter', 'Outfit', 'Satoshi', sans-serif;
          font-weight: 400;
          font-size: 0.8rem;
          cursor: pointer;
          align-self: flex-start;
          transition: all 0.3s ease;
        }

        @media (max-width: 768px) {
          .ask-btn {
            align-self: center;
            padding: 0.5rem 1.25rem;
            font-size: 0.7rem;
            margin-top: 0.5rem;
          }
        }

        .ask-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.8);
          color: rgba(255, 255, 255, 1);
        }
      `}</style>
    </aside>
  );
}
