import { PropsWithChildren } from "react";
import styles from "./MacosWindow.module.css";
import clsx from "clsx";

interface Props extends PropsWithChildren {
  header: string;
}

export default function MacosWindow({ children, header }: Props) {
  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <span className={styles.buttons}>
          <span className={clsx(styles.button, styles.button_close)}></span>
          <span className={clsx(styles.button, styles.button_minimize)}></span>
          <span className={clsx(styles.button, styles.button_expand)}></span>
        </span>
        <span className={styles.header__text}>{header}</span>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
