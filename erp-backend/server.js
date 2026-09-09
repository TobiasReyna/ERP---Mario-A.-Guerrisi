require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stockRoutes = require('./routes/stockRoutes');
const articleRoutes = require('./routes/articleRoutes');
const masterRoutes = require('./routes/masterRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const app = express();
const PORT = process.env.PORT || 3001;
const creditNoteRoutes = require('./routes/creditNoteRoutes');
const creditLimitRoutes = require('./routes/creditLimitRoutes');
const clientRoutes = require('./routes/clientRoutes');
const creditNoteRoutes = require('./routes/creditNoteRoutes');

app.use('/api/clients', clientRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
// Montar endpoints de Límites de Crédito
app.use('/api/credit-limits', creditLimitRoutes);
// Montar endpoints de notas de crédito y débito
app.use('/api/credit-notes', creditNoteRoutes);
 // Middlewares
app.use(cors());
app.use(express.json());

// Registro de Rutas
app.use('/api/stock', stockRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api', masterRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
});