import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './Masonry.css';

const GAP = 12;

const useMedia = (queries, values, defaultValue) => {
  const get = () => values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;
  const [value, setValue] = useState(get);
  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]);
  return value;
};

const useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
};

const Masonry = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.97,
  blurToFocus = true,
  onItemClick = null,
}) => {
  const columns = useMedia(
    ['(min-width:1200px)', '(min-width:800px)', '(min-width:500px)'],
    [3, 2, 2],
    1
  );

  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);
  const [imageDims, setImageDims] = useState({});

  // Preload images and capture natural dimensions
  useEffect(() => {
    setImagesReady(false);
    const dims = {};
    Promise.all(
      items.map(item =>
        new Promise(resolve => {
          const img = new Image();
          img.src = item.img;
          img.onload = () => {
            dims[item.id] = { w: img.naturalWidth, h: img.naturalHeight };
            resolve();
          };
          img.onerror = () => {
            dims[item.id] = { w: 4, h: 3 };
            resolve();
          };
        })
      )
    ).then(() => {
      setImageDims(dims);
      setImagesReady(true);
    });
  }, [items]);

  const getInitialPosition = item => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };
    let direction = animateFrom;
    if (animateFrom === 'random') {
      const dirs = ['top', 'bottom', 'left', 'right'];
      direction = dirs[Math.floor(Math.random() * dirs.length)];
    }
    switch (direction) {
      case 'top':    return { x: item.x, y: -200 };
      case 'bottom': return { x: item.x, y: window.innerHeight + 200 };
      case 'left':   return { x: -200, y: item.y };
      case 'right':  return { x: window.innerWidth + 200, y: item.y };
      case 'center': return { x: containerRect.width / 2 - item.w / 2, y: containerRect.height / 2 - item.h / 2 };
      default:       return { x: item.x, y: item.y + 100 };
    }
  };

  const grid = useMemo(() => {
    if (!width || !Object.keys(imageDims).length) return [];

    const colHeights = new Array(columns).fill(0);
    const columnWidth = (width - GAP * (columns - 1)) / columns;

    return items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + GAP);
      const dims = imageDims[child.id] || { w: 4, h: 3 };
      const height = columnWidth * (dims.h / dims.w);
      const y = colHeights[col];
      colHeights[col] += height + GAP;
      return { ...child, x, y, w: columnWidth, h: height };
    });
  }, [columns, items, width, imageDims]);

  const hasMounted = useRef(false);

  useLayoutEffect(() => {
    if (!imagesReady || !grid.length) return;

    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const target = { x: item.x, y: item.y, width: item.w, height: item.h };

      if (!hasMounted.current) {
        const init = getInitialPosition(item, index);
        gsap.fromTo(selector,
          { opacity: 0, x: init.x, y: init.y, width: item.w, height: item.h, ...(blurToFocus && { filter: 'blur(10px)' }) },
          { opacity: 1, ...target, ...(blurToFocus && { filter: 'blur(0px)' }), duration: 0.8, ease: 'power3.out', delay: index * stagger }
        );
      } else {
        gsap.to(selector, { ...target, duration, ease, overwrite: 'auto' });
      }
    });

    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease]);

  const handlePointerMove = e => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const angle = ((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360).toFixed(2);
    const proximity = Math.min(1, Math.hypot(Math.abs(dx) / (rect.width / 2), Math.abs(dy) / (rect.height / 2)));
    el.style.setProperty('--cursor-angle', `${angle}deg`);
    el.style.setProperty('--glow-proximity', proximity.toFixed(3));
  };

  const handleMouseEnter = (e, item) => {
    if (scaleOnHover) gsap.to(`[data-key="${item.id}"]`, { scale: hoverScale, duration: 0.3, ease: 'power2.out' });
  };

  const handleMouseLeave = (e, item) => {
    e.currentTarget.style.setProperty('--glow-proximity', '0');
    if (scaleOnHover) gsap.to(`[data-key="${item.id}"]`, { scale: 1, duration: 0.3, ease: 'power2.out' });
  };

  const totalHeight = grid.length ? Math.max(...grid.map(i => i.y + i.h)) : 0;

  return (
    <div ref={containerRef} className="masonry-list" style={{ height: totalHeight }}>
      {grid.map(item => (
        <div
          key={item.id}
          data-key={item.id}
          className="masonry-item-wrapper"
          onClick={() => onItemClick ? onItemClick(item) : window.open(item.url, '_blank', 'noopener')}
          onPointerMove={handlePointerMove}
          onMouseEnter={e => handleMouseEnter(e, item)}
          onMouseLeave={e => handleMouseLeave(e, item)}
        >
          <div className="masonry-item-inner">
            <img src={item.img} alt="" loading="lazy" className="masonry-item-img" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Masonry;
