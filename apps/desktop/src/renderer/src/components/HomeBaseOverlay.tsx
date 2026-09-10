// Disable linting errors for Three props on primitives
/* eslint react/no-unknown-property: "off" */
import { Canvas } from '@react-three/fiber';
import { SpinningCoin } from './SpinningCoin';

interface HomeBaseOverlayProps {
  isVisible: boolean;
}

export const HomeBaseOverlay = ({ isVisible }: HomeBaseOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-6 right-6 z-2 h-24 w-24 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} decay={0} intensity={Math.PI * 2} />
        <SpinningCoin scale={2.2} />
      </Canvas>
    </div>
  );
};
