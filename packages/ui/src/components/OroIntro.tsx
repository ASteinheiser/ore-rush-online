import { cn } from '../utils';

interface OroIntroProps {
  className?: string;
}

/** Animated "ORE RUSH ONLINE" title reveal (O / R / O columns pop in, then the rest of each word fades in underneath) */
export const OroIntro = ({ className }: OroIntroProps) => {
  return (
    <div
      className={cn('h-screen flex flex-col items-center justify-center oro-intro-fade', className)}
      style={{ userSelect: 'none' }}
    >
      <div className="oro-intro-letter-container font-pixel text-primary">
        <div className="oro-intro-letter-group">
          <span className="oro-intro-letter">O</span>
          <span className="oro-intro-subtext text-5xl text-muted">R</span>
          <span className="oro-intro-subtext text-5xl text-muted">E</span>
        </div>
        <div className="oro-intro-letter-group">
          <span className="oro-intro-letter">R</span>
          <span className="oro-intro-subtext text-5xl text-muted">U</span>
          <span className="oro-intro-subtext text-5xl text-muted">S</span>
          <span className="oro-intro-subtext text-5xl text-muted">H</span>
        </div>
        <div className="oro-intro-letter-group">
          <span className="oro-intro-letter">O</span>
          <span className="oro-intro-subtext text-5xl text-muted">N</span>
          <span className="oro-intro-subtext text-5xl text-muted">L</span>
          <span className="oro-intro-subtext text-5xl text-muted">I</span>
          <span className="oro-intro-subtext text-5xl text-muted">N</span>
          <span className="oro-intro-subtext text-5xl text-muted">E</span>
        </div>
      </div>
    </div>
  );
};
