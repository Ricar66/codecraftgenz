import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import styles from './TiltCard.module.css';

const TiltCard = ({
  children,
  className = '',
  accentColor = '#00E4F2',
  as: Tag = 'div',
  variants,
  ...rest
}) => {
  const ref = useRef(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-6, 6]), { stiffness: 150, damping: 20 });

  const handleMouseMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  const MotionTag = typeof Tag === 'string' ? motion[Tag] || motion.div : motion.create(Tag);

  return (
    <MotionTag
      ref={ref}
      className={`${styles.tiltCard} ${className}`}
      style={{
        rotateX,
        rotateY,
        '--accent': accentColor,
      }}
      variants={variants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      <div className={styles.cardInner}>
        {children}
      </div>
    </MotionTag>
  );
};

export default TiltCard;
