import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export async function generarExcelAutorizaciones(
  registros: any[],
  nombreArchivo: string
): Promise<string> {
  const encabezado = [
    'Fecha Proceso', 'Fecha y hora de la Transacción', 'Cuenta', 'Número de Tarjeta', 'Fecha Expiración',
    'Tipo Mensaje', 'Moneda Destino', 'Monto Destino', 'Respuesta', 'Tipo Transacción',
    'Número Autorización', 'Modo Captura', 'Código Comercio', 'Nombre Comercio', 'Nombre Cadena',
    'Giro', 'Descripción Giro', 'Cod.Proceso Online', 'Ciudad', 'País',
    'Ind. Cvv2', 'Tipo Franquicia', 'Monto Fuente', 'Producto (Marca)', 'TID / Código Terminal',
    'Tipo Diferido', 'Num.Cuot. Pactadas', 'BIN Adq', 'BIN Emisor', 'Desc BIN Emisor',
    'Respuesta Interna', 'Recurrente', 'ECI', 'TermEntryCapab', 'Voucher',
    'ChipCondCode', 'Tipo Emisor', 'Tipo Factura', 'Procesado', 'Tipo Producto',
    'Num. Transacción', 'ATC_actual', 'ATC_autorizacion', 'Campo34', 'Campo55', 'Campo56'
  ];

  const outputDir = path.join('/var/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, nombreArchivo);
  const workbook = new ExcelJS.Workbook();

  const hoja = workbook.addWorksheet('Autorizaciones');
  hoja.addRow(encabezado);

  // Todos los registros sin paginar
  registros.forEach((reg: any) => {
    hoja.addRow([
      String(reg.fechaProceso ?? ''),
      String(reg.fechaHoraTransaccion ?? ''),
      String(reg.cuenta ?? ''),
      String(reg.numeroTarjeta ?? ''),
      String(reg.fechaExpiracion ?? ''),
      String(reg.tipoMensaje ?? ''),
      String(reg.monedaDestino ?? ''),
      String(reg.montoAutorizado ?? ''),
      String(reg.respuestaIso?.descripcion ?? ''),
      String(reg.tipoTransaccion?.codigo ?? ''),
      String(reg.numeroAutorizacion ?? ''),
      String(reg.modoEntradaCaptura ?? ''),
      String(reg.codigoComercio ?? ''),
      String(reg.nombreComercio ?? ''),
      String(reg.nombreCadena ?? ''),
      String(reg.giro ?? ''),
      String(reg.descripcionGiro ?? ''),
      String(reg.codigoProcesoOnline ?? ''),
      String(reg.ciudad ?? ''),
      String(reg.pais ?? ''),
      String(reg.indicadorPresenciaCvv2 ?? ''),
      String(reg.tipoFranquicia ?? ''),
      String(reg.montoOrigen ?? ''),
      String(reg.productoMarca ?? ''),
      String(reg.tidTerminal ?? ''),
      String(reg.tipoDiferido ?? ''),
      String(reg.numeroCuotasPactadas ?? ''),
      String(reg.binAdquirente ?? ''),
      String(reg.binEmisor ?? ''),
      String(reg.descripcionBinEmisor ?? ''),
      String(reg.respuestaInterna ?? ''),
      String(reg.recurrente ?? ''),
      String(reg.eci ?? ''),
      String(reg.termEntryCapab ?? ''),
      String(reg.voucher ?? ''),
      String(reg.chipCondicionCode ?? ''),
      String(reg.tipoEmisor ?? ''),
      String(reg.tipoFactura ?? ''),
      String(reg.procesado ?? ''),
      String(reg.tipoProducto ?? ''),
      String(reg.numeroTransaccion ?? ''),
      String(reg.atcActual ?? ''),
      String(reg.atcAutorizacion ?? ''),
      String(reg.campo34 ?? ''),
      String(reg.campo55 ?? ''),
      String(reg.campo56 ?? '')
    ]);
  });

  await workbook.xlsx.writeFile(outputPath);
  console.log('Excel generado en:', outputPath);
  return outputPath;
}
