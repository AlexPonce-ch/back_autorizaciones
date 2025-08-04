import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';



export async function generarExcelAutorizaciones(
  registros: any[],
  tamanioPagina: number,
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

  if (!fs.existsSync(outputDir )) {
    fs.mkdirSync(outputDir , { recursive: true });
  }

  const outputPath = path.join(outputDir , nombreArchivo);
  const workbook = new ExcelJS.Workbook();
  const totalPaginas = Math.ceil(registros.length / tamanioPagina);

  for (let i = 0; i < totalPaginas; i++) {
    const hoja = workbook.addWorksheet(`Página ${i + 1}`);
    hoja.addRow(encabezado);

    const pagina = registros.slice(i * tamanioPagina, (i + 1) * tamanioPagina);
    pagina.forEach((reg: any) => {
      hoja.addRow([
        reg.fechaProceso, reg.fechaHoraTransaccion, reg.cuenta, reg.numeroTarjetaEnmascarada, reg.fechaExpiracion,
        reg.tipoMensaje, reg.monedaDestino, reg.montoAutorizado, reg.respuestaIso?.descripcion, reg.tipoTransaccion?.codigo,
        reg.numeroAutorizacion, reg.modoEntradaCaptura, reg.codigoComercio, reg.nombreComercio, reg.nombreCadena,
        reg.giro, reg.descripcionGiro, reg.codigoProcesoOnline, reg.ciudad, reg.pais,
        reg.indicadorPresenciaCvv2, reg.tipoFranquicia, reg.montoOrigen, reg.productoMarca, reg.tidTerminal,
        reg.tipoDiferido, reg.numeroCuotasPactadas, reg.binAdquirente, reg.binEmisor, reg.descripcionBinEmisor,
        reg.respuestaInterna, reg.recurrente, reg.eci, reg.termEntryCapab, reg.voucher,
        reg.chipCondicionCode, reg.tipoEmisor, reg.tipoFactura, reg.procesado, reg.tipoProducto,
        reg.numeroTransaccion, reg.atcActual, reg.atcAutorizacion, reg.campo34, reg.campo55, reg.campo56
      ]);
    });
  }

  await workbook.xlsx.writeFile(outputPath);
  console.log('✅ Excel generado en:', outputPath);
  return outputPath;
}
