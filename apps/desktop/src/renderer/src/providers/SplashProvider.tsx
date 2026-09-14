import { useEffect, useState } from 'react';
import { OroIntro } from '@repo/ui';
import logo from '../assets/logo.png';

/** This is how long to show the developer screen. Should match 'developer-fade' animation in theme.css (4s) */
const DEVELOPER_DURATION = 4 * 1000;
/** This is how long to show the title screen. Should match 'oro-intro-fade' animation in @repo/ui (6s) */
const TITLE_DURATION = 6 * 1000;

interface SplashProviderProps {
  children: React.ReactNode;
}

/**
 * This will play only once when the app is first opened.
 * Good place to put developer and/or publisher logos.
 */
export const SplashProvider = ({ children }: SplashProviderProps) => {
  const [isDeveloperVisible, setIsDeveloperVisible] = useState(true);
  const [isTitleVisible, setIsTitleVisible] = useState(false);

  useEffect(() => {
    const developerTimeout = setTimeout(() => {
      setIsDeveloperVisible(false);
      setIsTitleVisible(true);
    }, DEVELOPER_DURATION);
    const titleTimeout = setTimeout(() => setIsTitleVisible(false), DEVELOPER_DURATION + TITLE_DURATION);

    return () => {
      clearTimeout(developerTimeout);
      clearTimeout(titleTimeout);
    };
  }, []);

  if (isDeveloperVisible) {
    return (
      <div className="fullscreen-center developer-fade" style={{ userSelect: 'none' }}>
        <h1 className="text-3xl font-label text-muted">developed by</h1>
        <img src={logo} className="h-40 w-auto mb-10 mt-10" />
        <h1 className="text-5xl font-pixel text-primary">iamandrew.io</h1>
      </div>
    );
  }

  if (isTitleVisible) return <OroIntro />;

  return children;
};
