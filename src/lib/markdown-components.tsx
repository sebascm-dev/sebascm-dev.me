import type { Components } from 'react-markdown'

/** Envuelve <table> en un contenedor con scroll horizontal — el <table> en sí no puede llevar
 * overflow/display:block sin romper su layout nativo de columnas. */
export const MARKDOWN_COMPONENTS: Components = {
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
}
