import styles from "@site/src/components/Console/Console.module.css";
import clsx from "clsx";
import ConsoleChar from "@site/src/components/ConsoleChar/ConsoleChar";
import ConsoleText from "@site/src/components/ConsoleText/ConsoleText";

interface Props {
  number: string;
  file: string;
  changed?: string | false;
  size: string;
}

export default function ConsoleItem({ number, changed, file, size }: Props) {
  const status = changed ? "changed" : "unchanged";

  const bg = changed ? "#5A5128" : "#424242";

  const sizeText = changed ? `${changed} -> ${size}` : size;

  return (
    <p className={styles.line}>
      <span className={clsx(styles.dark, styles.bold)}>
        <ConsoleChar>{number}. </ConsoleChar>
      </span>
      <span className={styles.bold}>
        <ConsoleChar>{file} </ConsoleChar>
      </span>
      <span className={clsx(styles.light)}>
        <ConsoleText bg={bg}>{status}</ConsoleText>{" "}
      </span>
      <span className={styles.dark}>
        <ConsoleChar>{sizeText} kB</ConsoleChar>
      </span>
    </p>
  );
}
