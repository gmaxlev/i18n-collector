import Console from "@site/src/components/Console/Console";
import styles from "./Intro.module.css";
import clsx from "clsx";
import Link from "@docusaurus/Link";

export default function Intro() {
  return (
    <div className={clsx(styles.intro, "container")}>
      <div className={styles.brand}>
        <h1 className={styles.header}>
          <img className={styles.logo} src="img/logo.svg" alt="" />
          i18n-collector
        </h1>
        <p className={styles.comment}>
          A tool for managing and compiling locale files.
        </p>
        <Link
          to={"/docs/overview"}
          className={"button button--primary button--lg"}
        >
          Overview
        </Link>
      </div>
      <div className={styles.console}>
        <Console />
      </div>
    </div>
  );
}
