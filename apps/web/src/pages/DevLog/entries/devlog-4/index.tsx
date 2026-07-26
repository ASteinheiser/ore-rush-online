import { Link } from 'react-router-dom';
import { DevLogEntry } from '../../../../components/DevLogEntry';

export const DevLogEntry4 = () => {
  return (
    <DevLogEntry id={4} title="Improved Performance & CSP" date="July 26, 2026" author="Andrew Steinheiser">
      <p>
        <code>v0.0.6</code> adds optimizations for the game logic on the server as well as improvements to the
        client-side prediction system. When I load-tested this patch, I was able to get ~35-60ms ping with 200
        players active at once; down from ~50-200ms in <code>v0.0.5</code>! CPU usage is also down: now at
        ~70% from 100%. The full load-test results can be seen in{' '}
        <Link
          to="https://github.com/asteinheiser/ore-rush-online#v006-snapshot"
          target="_blank"
          className="text-primary underline"
        >
          the snapshot here
        </Link>
        .
      </p>

      <p>
        On the server-side, &quot;vision&quot; was being calculated every tick, even though clients can only
        render vision changes once per server patch. Vision is now calculated per server patch, which appears
        to have drastically improved performance (as seen in the numbers above). Vision will also now scale
        based on a player&apos;s vertical velocity (<code>vY</code>). This is to ensure fast-falling/flying
        players don&apos;t experience laggy block loading. Depending on the magnitude of their <code>vY</code>
        , they will receive a few extra rows of vision in the direction of their movement. For example, a
        player&apos;s standard vision range should include 11 rows of 11 blocks (121). When moving at maximum
        velocity, this will scale up to 13 rows of 11 blocks (143).
      </p>

      <p>
        The CSP system now uses the same drill logic as the server&apos;s simulation, so <code>block</code>{' '}
        damage and removal can be predicted. Functionally, this makes the game feel a lot smoother. Players no
        longer snap forward or down as they mine, because the client optimistically applies the result of a
        drill action, later reconciling with the server.
      </p>

      <p>
        Now that the core game mechanic is playable and (somewhat) optimized, I want to flesh out a few basic
        systems around it, such as: rework the main menu into a home base, add a crafting/upgrade system,
        implement inventory persistence....
      </p>
    </DevLogEntry>
  );
};
