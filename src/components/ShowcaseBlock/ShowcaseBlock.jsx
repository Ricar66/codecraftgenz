// src/components/ShowcaseBlock/ShowcaseBlock.jsx
import { motion } from 'framer-motion';
import styles from './ShowcaseBlock.module.css';

const sectionReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function ShowcaseBlock({ badge, title, description, features, image, imageAlt, reverse = false }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={sectionReveal}
    >
      <div className={`${styles.row} ${reverse ? styles.reverse : ''}`}>
        <div className={styles.image}>
          <img src={image} alt={imageAlt} loading="lazy" />
        </div>
        <div className={styles.content}>
          <span className={styles.badge}>{badge}</span>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.desc}>{description}</p>
          {features && features.length > 0 && (
            <ul className={styles.features}>
              {features.map((feat, i) => (
                <li key={i}>
                  <span className={styles.featureIcon}>{feat.icon}</span>
                  {feat.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
