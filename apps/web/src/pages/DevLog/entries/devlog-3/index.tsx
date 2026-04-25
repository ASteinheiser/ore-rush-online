import { DevLogEntry } from '../../../../components/DevLogEntry';
import v005Screenshot from './images/v0.0.5-screenshot.png';

export const DevLogEntry3 = () => {
  return (
    <DevLogEntry id={3} title="Fuel + Capacity Systems" date="April 25, 2026" author="Andrew Steinheiser">
      <p>
        With the <code>v0.0.5</code> update, I added a simple fuel system and a max capacity to the
        player&apos;s inventory. The goal is to deliver simple vertical slices until a basic game loop is
        complete, which is why these are both very primitive systems at the moment. However, they do stop the
        player from moving or obtaining ore under the proper conditions. In addition to the new fuel/weight
        UI, I added the ability to see the other player&apos;s &quot;signals&quot; (if they&apos;re present in
        the room).
      </p>

      <img src={v005Screenshot} alt="v0.0.5 Screenshot" />

      <p>
        I also updated the server logic for input handling, which greatly improves security and consistency
        across clients. This change decouples the game simulation (server-side) from the rate of input
        messages, meaning all players will be processed at the same rate.
      </p>

      <p>
        After load-testing this version, I discovered that the server logic will need optimizations to
        continue to support the &quot;200 players at once&quot; baseline (which is what I&apos;ve been aiming
        for). I think this is largely due to previous input handling logic that would process players at the
        speed of their messages. For the load test, this is slower than the game&apos;s fixed tick rate
        because load test bots send a message when they receive an update (server <code>patchRate</code> is
        slower than <code>fixedTick</code>). I believe this was causing previous load tests to consume less
        CPU (false positive).
      </p>

      <p>I&apos;m stoked to optimize this a bit and flesh out some more minimal slices of the game loop!</p>
    </DevLogEntry>
  );
};
