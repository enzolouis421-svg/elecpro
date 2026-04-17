// Génération PDF devis/facture via html2canvas + jsPDF
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generatePDF(elementId, filename = 'document.pdf') {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Élément introuvable pour la capture PDF')

  // Capture haute résolution
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const ratio = pdfWidth / (imgWidth / 2) // div par 2 car scale=2

  const scaledHeight = (imgHeight / 2) * ratio

  // Pagination si le document dépasse une page
  let heightLeft = scaledHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight)
  heightLeft -= pdfHeight

  while (heightLeft > 0) {
    position = heightLeft - scaledHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight)
    heightLeft -= pdfHeight
  }

  pdf.save(filename)
  return pdf
}

// Téléchargement + récupération blob pour email
export async function getPDFBlob(elementId) {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Élément introuvable')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const ratio = pdfWidth / (canvas.width / 2)
  const scaledHeight = (canvas.height / 2) * ratio

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight)
  return pdf.output('blob')
}
