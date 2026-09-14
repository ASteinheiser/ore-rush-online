import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { OroIntro } from '@repo/ui';
import { ChevronDown } from '@repo/ui/icons';
import { cn } from '@repo/ui/utils';

export const Home = () => {
  const homeContentRef = useRef<HTMLDivElement>(null);

  const handleScollToContent = () => {
    homeContentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col md:flex-row justify-center items-center gap-8 h-screen mt-nav">
        <OroIntro fade={false} />

        <button
          className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer"
          onClick={handleScollToContent}
        >
          <ChevronDown size={48} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-20 px-6 py-8" ref={homeContentRef}>
        <div className="text-center max-w-lg px-4 pt-14">
          <p className="text-xl text-muted pb-2">
            {`Ore Rush Online (ORO: "gold" in Spanish) is a real-time online mining game. It's `}
            <Link
              to="https://github.com/asteinheiser/ore-rush-online"
              target="_blank"
              className="font-pixel text-xl text-primary underline"
            >
              source available on GitHub
            </Link>
            {`, meaning first-class support for private (and possibly modded) servers. You'll always be able to play!`}
          </p>
        </div>

        <HomeSection
          isFlipped
          image="/logo.svg"
          title="Build Your Game"
          description={
            <>
              Create your game inside of <code>apps/desktop</code> (Electron/React/Phaser client) and{' '}
              <code>apps/game-api</code> (Colyseus/Apollo server).
            </>
          }
        />
        <HomeSection
          image="/logo.svg"
          title="Adjust To Your Needs"
          description={
            <>
              Depending on your target platform (Mobile vs Web vs Desktop), you may want to consider hosting
              your game as a SPA (with PWA support), or React Native.
            </>
          }
        />
        <HomeSection
          isFlipped
          image="/logo.svg"
          title="Publish It Yourself"
          description={
            <>
              Publish your game yourself! Allow users to download straight from your website. You can also
              easily distribute via Steam, itch.io, etc.
            </>
          }
        />
      </div>
    </div>
  );
};

interface HomeSectionProps {
  image: string;
  title: string;
  description: React.ReactNode;
  isFlipped?: boolean;
}

const HomeSection = ({ image, title, description, isFlipped }: HomeSectionProps) => {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-center gap-20 max-w-4xl',
        isFlipped && 'md:flex-row-reverse'
      )}
    >
      <img
        src={image}
        alt={title}
        className="w-50 h-50 md:w-75 md:h-75 lg:w-100 lg:h-100 hover:animate-spin"
      />

      <div className="flex flex-col gap-6">
        <h2
          className={cn(
            'text-3xl lg:text-4xl font-title text-center md:text-left',
            isFlipped && 'md:text-right'
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            'max-w-sm lg:max-w-md text-lg text-muted text-center md:text-left',
            isFlipped && 'md:text-right'
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
