/** Placeholder simplified ship data */
export const SHIPS = [
  /** The free ship provided to players with no resources */
  {
    id: 'S-CR49',
    name: 'S-CR49',
    description: "It's... uh... it's a ship.",
    fuelCapacity: 2000,
    weightCapacity: 40,
    price: [],
  },
  {
    id: '5T33-L',
    name: '5T33-L',
    description: 'Made of super strong steel.',
    fuelCapacity: 4000,
    weightCapacity: 60,
    price: [
      {
        type: 'ore-iron',
        amount: 20,
      },
    ],
  },
  {
    id: 'C0-993R',
    name: 'C0-993R',
    description: 'Slick looking copper extraction vessel.',
    fuelCapacity: 6000,
    weightCapacity: 100,
    price: [
      {
        type: 'ore-copper',
        amount: 30,
      },
    ],
  },
  {
    id: 'G0LD3N',
    name: 'G0LD3N',
    description: "It's f*king gold!",
    fuelCapacity: 10000,
    weightCapacity: 200,
    price: [
      {
        type: 'coins',
        amount: 250,
      },
    ],
  },
];
