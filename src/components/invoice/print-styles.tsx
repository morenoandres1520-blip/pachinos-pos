'use client';

/**
 * Injects @media print CSS optimized for 58mm and 80mm thermal printers.
 * Include this component once in the layout or page that handles printing.
 */
export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        /* Hide everything except the invoice */
        body * {
          visibility: hidden;
        }

        #invoice-print-area,
        #invoice-print-area * {
          visibility: visible;
        }

        #invoice-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          margin: 0;
          padding: 2mm;
        }

        /* Hide non-print elements */
        [data-no-print],
        nav,
        header,
        footer,
        button,
        .no-print {
          display: none !important;
        }

        /* General print resets */
        @page {
          margin: 0;
          padding: 0;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          font-size: 10px !important;
        }

        /* 80mm thermal paper */
        @page {
          size: 80mm auto;
        }

        #invoice-print-area {
          max-width: 80mm;
          font-family: monospace;
          font-size: 10px;
          line-height: 1.3;
          color: black;
          background: white;
        }

        #invoice-print-area table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }

        #invoice-print-area th,
        #invoice-print-area td {
          padding: 1px 2px;
        }

        #invoice-print-area hr {
          border: none;
          border-top: 1px dashed black;
          margin: 2mm 0;
        }

        #invoice-print-area img {
          max-height: 10mm;
          filter: grayscale(100%);
        }
      }

      /* 58mm variant — use a body class or data attribute to switch */
      @media print {
        body.print-58mm #invoice-print-area,
        body[data-paper='58mm'] #invoice-print-area {
          max-width: 58mm;
          font-size: 8px;
        }

        body.print-58mm #invoice-print-area table,
        body[data-paper='58mm'] #invoice-print-area table {
          font-size: 7px;
        }
      }
    `}</style>
  );
}
