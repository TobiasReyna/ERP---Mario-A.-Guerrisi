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