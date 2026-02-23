import { Link } from 'react-router-dom';
import { DevLogEntry } from '../../../../components/DevLogEntry';
import clientWithDropletGraphs from './images/client-with-droplet-graphs.jpg';
import loadTestScript from './images/load-test-script.png';
import loadTestDebugSSH from './images/load-test-debug-ssh.png';

export const DevLogEntry1 = () => {
  return (
    <DevLogEntry id={1} title="Systems Overhaul" date="February 22, 2026" author="Andrew Steinheiser">
      <p>
        v0.0.2 is now released, which includes logic for &quot;fog of war&quot; and a map comprised of
        &quot;blocks&quot; that fill the area. The other major change in this version is that I completely
        overhauled the &quot;systems&quot; on both the client and server. Previously, everything was pretty
        much jammed into the single Scene and Room files. This new setup should help keep things more
        organized and easier to extend as I add more features.
      </p>

      <img src={clientWithDropletGraphs} alt="Client with Droplet Graphs" />

      <p>
        This version is primarily for network/load testing the capabilities of Colyseus StateView. The way
        it&apos;s set up in v0.0.2, each tick will check the nearby blocks and players to update each
        client&apos;s &quot;view&quot;. I haven&apos;t done real optimizations of this &quot;vision&quot;
        mechanic yet, but I&apos;m hoping that will help with the memory/CPU usage.
      </p>

      <img src={loadTestDebugSSH} alt="Load Test Debug SSH" />

      <p>
        I created a snapshot of this load test series, which can be viewed in the README.md of{' '}
        <Link
          to="https://github.com/asteinheiser/ore-rush-online?tab=readme-ov-file#v002-snapshot"
          target="_blank"
          className="text-primary underline"
        >
          this project
        </Link>
        . There you can see the CPU and memory usage (both in percentage and absolute values) per load test
        performed.
      </p>

      <img src={loadTestScript} alt="Load Test Script" />

      <p>
        Also worth noting is that the new server logic takes considerably more memory to store the block map,
        even though only partial maps are shared with each client. This causes the process to hold more memory
        open than is available on the cheapest Droplet. This is why I moved to the $6 Droplet (from $4), which
        has double the memory. I did find the game stable for up to 100 players in 10-player rooms on this
        setup.
      </p>
    </DevLogEntry>
  );
};
