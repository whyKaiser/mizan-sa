import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { reportBody, logo, e, statementBody } from "./ui.js";
import { ledger } from "./domain.js";

// Render Arabic with the browser's text shaper; no data leaves the device.
// A page is scaled as one unit so rows are never cut across page boundaries.
export async function downloadReport(project, date = new Date().toISOString()) {
  await document.fonts.ready;
  const stage = document.createElement("div");
  stage.className = "pdf-stage";
  stage.setAttribute("aria-hidden", "true");
  stage.innerHTML = reportBody(project, date);
  const planning = stage.firstElementChild;
  planning.querySelector(".report-statements").remove();
  const balances = ledger(project);
  for (const type of ["income", "balance"]) {
    const page = document.createElement("article");
    page.className = "report-document panel";
    page.innerHTML = `<header class="report-header">${logo()}<time>${e(date.slice(0, 10))}</time></header><h2>${e(project.name)}</h2>${statementBody(balances, type)}<footer>ميزان.. أكثر من مجرد حسابات.<small>حسب العمليات المسجلة في المحاكي.</small></footer>`;
    stage.append(page);
  }
  document.body.append(stage);
  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    pdf.setProperties({
      title: "Mizan Financial Report",
      author: "Mizan",
      subject: "Project planning and recorded accounting transactions",
    });
    for (const [index, page] of [...stage.children].entries()) {
      const bitmap = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1100,
        scrollX: 0,
        scrollY: 0,
      });
      if (index) pdf.addPage();
      const scale = Math.min(186 / bitmap.width, 263 / bitmap.height);
      const width = bitmap.width * scale,
        height = bitmap.height * scale;
      pdf.addImage(
        bitmap.toDataURL("image/png"),
        "PNG",
        (210 - width) / 2,
        12,
        width,
        height,
      );
      pdf.setFontSize(9);
      pdf.setTextColor(80, 100, 86);
      pdf.text(`${index + 1} / ${stage.children.length}`, 105, 289, {
        align: "center",
      });
    }
    pdf.save(`Mizan-report-${date.slice(0, 10)}.pdf`);
  } finally {
    stage.remove();
  }
}
