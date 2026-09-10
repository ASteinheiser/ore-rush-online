// Disable linting errors for Three props on primitives
/* eslint react/no-unknown-property: "off" */
import { Canvas } from '@react-three/fiber';
import { Person } from '@repo/ui/icons';
import { SpinningCoin } from './SpinningCoin';

interface HomeBaseOverlayProps {
  isVisible: boolean;
}

export const HomeBaseOverlay = ({ isVisible }: HomeBaseOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-6 inset-x-0 z-2 flex items-center justify-between px-8 pointer-events-none">
      <div className="flex items-center gap-2">
        <Person className="text-muted" size={32} />
        <span className="font-label text-lg">PlayerName</span>
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
