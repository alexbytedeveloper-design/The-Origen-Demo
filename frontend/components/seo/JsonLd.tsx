/**
 * Datos estructurados JSON-LD.
 *
 * Es un bloque de datos, no código ejecutable. Se escapa `<` para que un texto
 * del menú nunca pueda cerrar la etiqueta `<script>`.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
