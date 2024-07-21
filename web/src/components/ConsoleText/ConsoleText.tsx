import ConsoleChar from "@site/src/components/ConsoleChar/ConsoleChar";

interface Props {
  children: string | string[];
  bg?: string;
}

export default function ConsoleText({ children, bg }: Props) {
  const string = Array.isArray(children) ? children.flat().join("") : children;
  return string.split("").map((item, index) => {
    return (
      <ConsoleChar key={index} bg={bg}>
        {item}
      </ConsoleChar>
    );
  });
}
