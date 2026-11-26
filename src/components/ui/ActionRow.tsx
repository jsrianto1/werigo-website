import type {ReactNode} from 'react';
import styles from './action-row.module.css';

export function ActionRow({children, align = 'start'}: {children: ReactNode; align?: 'start' | 'end'}) {
  return <div className={align === 'end' ? `${styles.row} ${styles.end}` : styles.row}>{children}</div>;
}
