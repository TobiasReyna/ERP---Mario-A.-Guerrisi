import * as XLSX from 'xlsx';

/**
 * Genera un archivo Excel y abre la ventana "Guardar como..." para elegir la ubicación.
 * @param {Array<Object>} data - Datos formateados con nombres de columnas amigables
 * @param {string} fileName - Nombre sugerido del archivo
 * @param {string} sheetName - Nombre de la pestaña
 */
export const exportToExcel = async (data, fileName = 'Reporte_Reposicion.xlsx', sheetName = 'Reposición') => {
  if (!data || data.length === 0) {
    throw new Error('No hay datos para exportar.');
  }

  // 1. Convertir JSON a hoja de cálculo
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. Ajustar el ancho de las columnas automáticamente
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== null && row[key] !== undefined ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });
  worksheet['!cols'] = colWidths;

  // 3. Crear el libro de trabajo
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

  // 4. Intentar abrir la ventana nativa del sistema operativo ("Guardar como")
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: finalName,
        types: [
          {
            description: 'Libro de Excel (*.xlsx)',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            },
          },
        ],
      });

      // Generar el buffer binario y escribirlo en la ruta seleccionada
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const writableStream = await handle.createWritable();
      await writableStream.write(
        new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      await writableStream.close();
      return;
    } catch (err) {
      // Si el usuario cancela la ventana de selección, se aborta sin error
      if (err.name === 'AbortError') return;
      console.warn('showSaveFilePicker no completado, usando descarga estándar:', err);
    }
  }

  // 5. Fallback para navegadores sin soporte a la API File System
  XLSX.writeFile(workbook, finalName);
};