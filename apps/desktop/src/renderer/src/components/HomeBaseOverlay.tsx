// Disable linting errors for Three props on primitives
/* eslint react/no-unknown-property: "off" */
import { useEffect, useState } from 'react';
import { useSession } from '@repo/client-auth/provider';
import { Person } from '@repo/ui/icons';
import { Canvas } from '@react-three/fiber';
import { SpinningCoin } from './SpinningCoin';

interface HomeBaseOverlayProps {
  isVisible: boolean;
}

/** How long the fade in/out transition takes (ms) */
const FADE_DURATION_MS = 500;

export const HomeBaseOverlay = ({ isVisible }: HomeBaseOverlayProps) => {
  const { profile } = useSession();

  // keep the overlay mounted for the duration of the fade-out before removing it
  const [shouldRender, setShouldRender] = useState(isVisible);
  // drives the opacity transition; toggled a frame after mount so fade-in animates
  const [isShown, setIsShown] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setIsShown(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsShown(false);
    const timeout = setTimeout(() => setShouldRender(false), FADE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed top-6 inset-x-0 z-2 flex items-center justify-between px-8 pointer-events-none transition-opacity duration-${FADE_DURATION_MS} ${
        isShown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center gap-2">
        <Person className="text-muted" size={32} />
        <span className="font-label text-lg">{profile?.userName}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-pixel text-2xl">0</span>
        <div className="h-12 w-12">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[3, 3, 5]} intensity={0.8} />
            <directionalLight position={[-3, -2, 4]} intensity={0.6} />
            <SpinningCoin scale={3.2} />
          </Canvas>
        </div>
      </div>
    </div>
  );
};
