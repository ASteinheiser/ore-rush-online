import { createContext, useContext, useState } from 'react';

interface ShipContextType {
  selectedShipId: string | null;
  setSelectedShipId: (shipId: string | null) => void;
}

const ShipContext = createContext<ShipContextType>({
  selectedShipId: null,
  setSelectedShipId: () => {},
});

export const useShip = () => {
  const context = useContext(ShipContext);
  if (!context) {
    throw new Error('useShip must be used within a ShipProvider');
  }
  return context;
};

export const ShipProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  return (
    <ShipContext.Provider value={{ selectedShipId, setSelectedShipId }}>{children}</ShipContext.Provider>
  );
};
