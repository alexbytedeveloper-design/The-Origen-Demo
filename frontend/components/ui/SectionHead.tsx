type SectionHeadProps = {
  index: string;
  label: string;
  title: string;
  lead?: string;
  /** Conserva el tamaño de títulos ya afinados por sección. */
  titleClass?: string;
};

/**
 * Cabecera editorial: capítulo en oro, título en Prata y filete con rombo.
 * El número no anuncia una sección del menú: ordena el recorrido de la casa.
 */
export function SectionHead({
  index,
  label,
  title,
  lead,
  titleClass,
}: SectionHeadProps) {
  return (
    <header className="section__head">
      <p className="section__meta">
        <span className="section__index" aria-hidden="true">
          {index}
        </span>
        <span className="section__label">{label}</span>
        <span className="section__meta-rule" aria-hidden="true" />
      </p>

      <h2 className={`section__title${titleClass ? ` ${titleClass}` : ""}`}>
        {title}
      </h2>

      {lead && <p className="section__lead">{lead}</p>}

      {lead && (
        <span className="section__ornament" aria-hidden="true">
          <span className="section__ornament-diamond" />
        </span>
      )}
    </header>
  );
}
