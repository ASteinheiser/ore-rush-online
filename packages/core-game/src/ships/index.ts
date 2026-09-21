/** Placeholder simplified ship data */
export const SHIPS = [
  /** The free ship provided to players with no resources */
  {
    id: '5C-R4P',
    name: '5C-R4P',
    description: "It's... uh... it's a ship.",
    color: {
      fill: 0x666666,
      outline: 0x999999,
    },
    fuelCapacity: 2000,
    weightCapacity: 40,
    price: null,
  },
  {
    id: '5T33-L',
    name: '5T33-L',
    description: 'Made of super strong steel.',
    color: {
      fill: 0x999999,
      outline: 0xcccccc,
    },
    fuelCapacity: 4000,
    weightCapacity: 60,
    price: {
      type: 'ore-iron',
      amount: 20,
    },
  },
  {
    id: 'C0-993R',
    name: 'C0-993R',
    description: 'Slick looking copper extraction vessel.',
    color: {
      fill: 0x966622,
      outline: 0xcd7f32,
    },
    fuelCapacity: 6000,
    weightCapacity: 100,
    price: {
      type: 'ore-copper',
      amount: 30,
    },
  },
  {
    id: 'G0LD3-N',
    name: 'G0LD3-N',
    description: "It's f*king gold!",
    color: {
      fill: 0xccaa00,
      outline: 0xffdd00,
    },
    fuelCapacity: 10000,
    weightCapacity: 200,
    price: {
      type: 'coins',
      amount: 250,
    },
  },
] as const;
