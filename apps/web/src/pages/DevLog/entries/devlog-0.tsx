import { Link } from 'react-router-dom';
import { DevLogEntry } from '../../../components/DevLogEntry';

export const DevLogEntry0 = () => {
  return (
    <DevLogEntry id={0} title="Project Setup" date="February 2, 2026" author="Andrew Steinheiser">
      <p>
        This will be my first attempt at creating an online game! So far I have the basic infrastructure in
        place for a session-based game; consisting of an API server, desktop client, and marketing site. I
        used the{' '}
        <Link
          to="https://github.com/asteinheiser/ts-online-game-template"
          target="_blank"
          className="text-primary underline"
        >
          ts-online-game-template
        </Link>
        {', '}
        which I created and will be dog-fooding for this project.
      </p>
      <p>
        I was able to get everything setup while sitting in a car on a 6-hour drive to California, with only a
        hotspot connection! The site is hosted (you are reading this right?), the desktop client is available
        for download, and the API server is running. Blah blah, boring stuff... but hey it needs to be done.
      </p>
      <p>
        I am stoked to try out different ideas, share my progress and hear your feedback! The goal is, and
        always will be: make a fun online world that people truly enjoy spending time in.
      </p>
    </DevLogEntry>
  );
};
