import './GradientText.css';

export default function GradientText({
  children,
  className = '',
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  animationSpeed = 8,
  showBorder = false,
  pauseOnHover = false,
}) {
  const gradientColors = [...colors, colors[0]].join(', ');
  const style = {
    backgroundImage: `linear-gradient(to right, ${gradientColors})`,
    backgroundSize: '300% 100%',
    animationDuration: `${animationSpeed}s`,
  };

  return (
    <div className={`animated-gradient-text ${className}`}>
      {showBorder && <div className="gradient-overlay" style={style} />}
      <div
        className={`text-content gradient-animate${pauseOnHover ? ' gradient-pause-hover' : ''}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
