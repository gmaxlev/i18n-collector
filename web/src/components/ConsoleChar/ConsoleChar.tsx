interface Props {
  children: string | string[];
  bg?: string;
}

export default function ConsoleChar({ children, bg }: Props) {
  const string = Array.isArray(children) ? children.flat().join("") : children;
  return (
    <span data-bg={bg} style={{ opacity: 0 }}>
      {string}
    </span>
  );
}
