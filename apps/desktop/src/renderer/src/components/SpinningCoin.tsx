// Disable linting errors for Three props on primitives
/* eslint react/no-unknown-property: "off" */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import coinModel3D from '../assets/Coin.glb?url';

useGLTF.preload(coinModel3D);

interface SpinningCoinProps {
  position?: [number, number, number];
  scale?: number;
}

/** A gold-tinted "Coin" model that spins continuously on its Y axis. Must be rendered inside a react-three-fiber `<Canvas>` */
export const SpinningCoin = ({ position = [0, 0, 0], scale = 1 }: SpinningCoinProps) => {
  const { scene } = useGLTF(coinModel3D);
  const ref = useRef<THREE.Object3D>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 3;
  });

  useMemo(() => {
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 1,
      roughness: 0.3,
    });

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = gold;
      }
    });
  }, [scene]);

  return <primitive object={scene} ref={ref} position={position} scale={scale} dispose={null} />;
};
