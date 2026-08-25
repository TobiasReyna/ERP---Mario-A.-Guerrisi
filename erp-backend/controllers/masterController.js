const MasterService = require('../services/masterService');

const getCategorias = async (req, res) => {
    try {
        const data = await MasterService.getCategorias();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/categories:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getMarcas = async (req, res) => {
    try {
        const data = await MasterService.getMarcas();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/brands:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getPaises = async (req, res) => {
    try {
        const data = await MasterService.getPaises();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/countries:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getDepositosActivos = async (req, res) => {
    try {
        const data = await MasterService.getDepositosActivos();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/deposits:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getMotivosAjuste = async (req, res) => {
    try {
        const data = await MasterService.getMotivosAjuste();
        return res.status(200).json({ data });
    } catch (error) {
        console.error('[API] Error GET /api/adjustment-reasons:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getCategorias,
    getMarcas,
    getPaises,
    getDepositosActivos,
    getMotivosAjuste
};
