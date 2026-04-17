// Template devis pour génération PDF
import DocumentPreview from './DocumentPreview'

export default function DevisTemplate({ devis }) {
  return <DocumentPreview doc={devis} type="devis" id="devis-pdf-template" />
}
