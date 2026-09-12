import { ORE } from '@repo/core-game';
import { ORE_COLORS, DIRT_COLORS } from '../game/objects/Block';
import BASIC_ORE_BG from '../assets/basic-ore-bg.png';
import BASIC_ORE_FG from '../assets/basic-ore-fg.png';

const ORE_ICON_SIZE = 64;

/** Converts a Phaser-style numeric color (e.g. 0xcd7f32) into a CSS hex string */
const toCssColor = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

interface OreItemProps {
  oreId: string;
  quantity: number;
}

export const OreItem = ({ oreId, quantity }: OreItemProps) => {
  const oreEntry = Object.entries(ORE).find(([, ore]) => ore.id === oreId);
  const [oreType, ore] = oreEntry ?? [];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative shrink-0" style={{ width: ORE_ICON_SIZE, height: ORE_ICON_SIZE }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: toCssColor(DIRT_COLORS[2]),
            maskImage: `url(${BASIC_ORE_BG})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: toCssColor(ORE_COLORS[oreType as keyof typeof ORE_COLORS]),
            maskImage: `url(${BASIC_ORE_FG})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
          }}
        />

        <p className="absolute bottom-0 right-0 font-label text-lg leading-none text-muted-foreground">
          {quantity}
        </p>
      </div>

      <p className="font-title text-xl text-muted-foreground">{ore?.name}</p>
    </div>
  );
};
