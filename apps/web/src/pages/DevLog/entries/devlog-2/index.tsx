import { DevLogEntry } from '../../../../components/DevLogEntry';
import v003Screenshot from './images/v0.0.3-screenshot.png';

export const DevLogEntry2 = () => {
  return (
    <DevLogEntry id={2} title="Basic Mining Mechanics" date="April 10, 2026" author="Andrew Steinheiser">
      <p>
        In this latest release: <code>v0.0.3</code>, I added some basic mining mechanics and improved the
        movement system. When moving now, there&apos;s gravity, thrust and walls to collide with. I also added
        logic to allow for &quot;nudging&quot; the player when barely clipping an edge. This should result in
        the movement, especially around single-block-wide spaces, feeling more natural.
      </p>

      <p>
        The current mining system is really simple, but I think it&apos;s a good start! Right now, you must be
        grounded to start drilling. When you hold a direction key down, if you are pressed against a block
        (left/right/down), you will start to drill. After a short cooldown, the block will be damaged. If you
        destroy a block, ore will be added to your inventory.
      </p>

      <img src={v003Screenshot} alt="v0.0.3 Screenshot" />

      <p>
        I&apos;m really looking forward to fleshing out the game loop. At the very least, I want a more
        natural way to end the &quot;sessions&quot;, the ability to see results at the end of a session, and a
        main menu that is more of a hub (where you can use your ore).
      </p>

      <p> Stay tuned for more updates!</p>
    </DevLogEntry>
  );
};
