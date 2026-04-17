// Template facture pour génération PDF
import DocumentPreview from './DocumentPreview'

export default function FactureTemplate({ facture }) {
  return <DocumentPreview doc={facture} type="facture" id="facture-pdf-template" />
}
