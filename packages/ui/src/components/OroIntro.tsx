import { cn } from '../utils';

interface OroIntroProps {
  /** Default: `true` */
  fade?: boolean;
}

/** Animated "ORE RUSH ONLINE" title reveal (O / R / O columns pop in, then the rest of each word fades in underneath) */
export const OroIntro = ({ fade = true }: OroIntroProps) => {
  const fadeClass = fade ? 'oro-intro-fade' : '';

  return (
    <div
      className={cn('h-screen flex flex-col items-center justify-center', fadeClass)}
      style={{ userSelect: 'none' }}
    >
      <div className="oro-intro-letter-container font-pixel text-primary pl-4">
        <div className="oro-intro-letter-group">
          <span className="oro-intro-letter">O</span>
          <span className="oro-intro-subtext text-muted">R</span>
          <span className="oro-intro-subtext text-muted">E</span>
        </div>
        <div className="oro-intro-letter-group">
          <span className="oro-intro-letter">R</span>
          <span className="oro-intro-subtext text-muted">U</span>
          <span className="oro-intro-subtext text-muted">S</span>
          <span className="oro-intro-subtext text-muted">H</span>
        </div>
        <div className="oro-intro-letter-group">
          <span className="oro-intro-letter">O</span>
          <span className="oro-intro-subtext text-muted">N</span>
          <span className="oro-intro-subtext text-muted">L</span>
          <span className="oro-intro-subtext text-muted">I</span>
          <span className="oro-intro-subtext text-muted">N</span>
          <span className="oro-intro-subtext text-muted">E</span>
        </div>
      </div>
    </div>
  );
};
