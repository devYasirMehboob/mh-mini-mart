import qz from "qz-tray";

let connectionPromise = null;

// Provide a dummy certificate to prevent console errors.
// This will trigger the manual "Allow Connection" popup on the user's PC.
qz.security.setCertificatePromise((resolve) => {
    resolve();
});

qz.security.setSignaturePromise(() => {
    return (resolve) => {
        resolve();
    };
});

export const connectToQZ = () => {
  if (qz.websocket.isActive()) {
    return Promise.resolve();
  }
  
  if (!connectionPromise) {
    connectionPromise = qz.websocket.connect({ retries: 2, delay: 1 }).then(() => {
      connectionPromise = null;
    }).catch(() => {
      connectionPromise = null;
      throw new Error("QZ Tray is not running or printer machine is not connected. Please start QZ Tray and try again.");
    });
  }
  
  return connectionPromise;
};

export const printHtmlViaQZ = async (printerName, htmlContent) => {
  await connectToQZ();
  
  let printers;
  try {
    // Find printer by partial name
    printers = await qz.printers.find(printerName);
  } catch (_) {
    throw new Error(`Printer "${printerName}" is not connected or not found by QZ Tray.`);
  }

  const matchedPrinter = Array.isArray(printers) ? printers[0] : printers;

  const config = qz.configs.create(matchedPrinter, {
    margins: 0,
    colorType: 'color',
  });
  
  const data = [{
    type: 'pixel',
    format: 'html',
    flavor: 'plain',
    data: htmlContent
  }];
  
  return qz.print(config, data);
};
