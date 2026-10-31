type EmailInvoice = {
  number: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  lines: { description: string; quantity: number; unitPrice: string; discount: string; amount: string }[];
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The invoice as a self-contained HTML email. Every piece of user data is escaped. */
export function renderInvoiceEmail(invoice: EmailInvoice): { subject: string; html: string } {
  const rows = invoice.lines
    .map(
      (l) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd">${escapeHtml(l.description)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">${l.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">${l.unitPrice}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">${l.discount}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">${l.amount}</td>
      </tr>`,
    )
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#111">
    <h2>Invoice ${escapeHtml(invoice.number)}</h2>
    <p>Hello ${escapeHtml(invoice.customerName)}, here is your invoice from Brightloop.</p>
    <p>Invoice date: ${invoice.invoiceDate}<br>Due date: ${invoice.dueDate}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead><tr>
        <th style="text-align:left;padding:6px 8px">Description</th>
        <th style="text-align:right;padding:6px 8px">Qty</th>
        <th style="text-align:right;padding:6px 8px">Unit price</th>
        <th style="text-align:right;padding:6px 8px">Discount</th>
        <th style="text-align:right;padding:6px 8px">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right">Subtotal: ${invoice.subtotal}<br>Discount: ${invoice.discountTotal}<br>Tax: ${invoice.taxTotal}<br><strong>Total: ${invoice.total}</strong></p>
  </div>`;
  return { subject: `Invoice ${invoice.number} from Brightloop`, html };
}
