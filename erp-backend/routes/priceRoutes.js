import { Router } from 'express';
import {
  actualizarPrecioIndividual,
  aplicarAumentoMasivo,
  listarAumentosProgramados,
  cancelarAumentoProgramado,
  sincronizarPreciosProgramados,
} from '../controllers/priceController.js';

const router = Router();

// Endpoint que ejecuta la sincronización automática
router.get('/sync', async (req, res) => {
  await sincronizarPreciosProgramados();
  res.json({ ok: true });
});

router.post('/single', actualizarPrecioIndividual);
router.post('/bulk', aplicarAumentoMasivo);
router.get('/scheduled', listarAumentosProgramados);
router.delete('/scheduled/:id', cancelarAumentoProgramado);

export default router;