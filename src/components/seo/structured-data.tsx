import React from "react";

/**
 * Renders one or more JSON-LD <script> tags for structured data.
 *
 * Usage:
 *   <StructuredData data={getOrganizationSchema()} />
 *   <StructuredData data={[schema1, schema2]} />
 *
 * The script tags are rendered in the server response so search engines
 * can parse them without executing JavaScript.
 */
export function StructuredData({
  data,
}: {
  data: object | object[];
}) {
  const schemas = Array.isArray(data) ? data : [data];
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
