import { ElementRef, useEffect, useRef } from "react";
import styles from "./Console.module.css";
import MacosWindow from "@site/src/components/MacosWindow/MacosWindow";
import ConsoleChar from "@site/src/components/ConsoleChar/ConsoleChar";
import ConsoleText from "@site/src/components/ConsoleText/ConsoleText";
import ConsoleItem from "@site/src/components/ConsoleItem/ConsoleItem";
import { quadraticBezier } from "@site/src/interpolation";

function findTextNodes(el: any) {
  const children = []; // Type: Node[]
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    children.push(walker.currentNode);
  }
  return children;
}

export default function Console() {
  const ref = useRef<ElementRef<"div">>();

  useEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const result = findTextNodes(el);

    let lastShowedIndex = 0;

    function showLetter(index: number) {
      const item = result[index].parentElement;

      const bg = item.dataset.bg;

      item.style.opacity = 1;

      if (bg) {
        item.style.backgroundColor = bg;
      }
    }

    let TOTAL = 2500;
    let start = 0;
    let progress = 0;

    let active = true;

    function frame() {
      requestAnimationFrame((num) => {
        start = start <= 0 ? num : start;

        let time = num - start;

        progress = Math.min(1, time / TOTAL);

        let curve = quadraticBezier(progress, 0, 0.99, 1);

        const newIndex = Math.floor((result.length - 1) * curve);

        for (let i = lastShowedIndex; i <= newIndex; i++) {
          showLetter(i);
        }

        lastShowedIndex = newIndex;

        if (active && progress !== 1) {
          frame();
        }
      });
    }

    frame();

    return () => {
      active = false;
    };
  }, []);

  return (
    <MacosWindow header={"Terminal"}>
      <div ref={ref} className={styles.console}>
        <p className={styles.line}>
          <ConsoleChar>👀 </ConsoleChar>
          <ConsoleText>Detected changes in locales</ConsoleText>
        </p>
        <p className={styles.line}>
          <ConsoleChar>💫 </ConsoleChar>
          <ConsoleText>Starting i18n-collector</ConsoleText>
        </p>
        <p className={styles.line}>
          <ConsoleChar>📝 </ConsoleChar>
          <ConsoleText>Found</ConsoleText>{" "}
          <span className={styles.highlight}>
            <ConsoleText>126</ConsoleText>
          </span>{" "}
          <ConsoleText>files in</ConsoleText>{" "}
          <span className={styles.bold}>
            <ConsoleText>src</ConsoleText>
          </span>{" "}
          <ConsoleText>to process</ConsoleText>
        </p>
        <p className={styles.line}>&#8203;</p>
        <p className={styles.line}>
          <ConsoleChar>📁</ConsoleChar>{" "}
          <ConsoleText>Compiled files in</ConsoleText>{" "}
          <span className={styles.bold}>
            <ConsoleText>public/locales</ConsoleText>
          </span>
          <ConsoleText>:</ConsoleText>
        </p>
        <ConsoleItem
          number={"1"}
          file={"en.json"}
          changed={false}
          size={"18.41"}
        />
        <ConsoleItem
          number={"2"}
          file={"de.json"}
          changed={false}
          size={"22.84"}
        />
        <ConsoleItem
          number={"3"}
          file={"fr.json"}
          changed={"19.12"}
          size={"19.87"}
        />
        <ConsoleItem
          number={"4"}
          file={"es.json"}
          changed={false}
          size={"20.65"}
        />
        <ConsoleItem
          number={"5"}
          file={"pt.json"}
          changed={false}
          size={"19.78"}
        />
        <ConsoleItem
          number={"6"}
          file={"it.json"}
          changed={false}
          size={"19.12"}
        />
        <p className={styles.line}>&#8203;</p>
        <p className={styles.line}>
          <ConsoleChar>🏁 </ConsoleChar>{" "}
          <ConsoleText>Finished in 32.08 ms</ConsoleText>
        </p>
      </div>
    </MacosWindow>
  );
}
