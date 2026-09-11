const AccountPayableService = require('../services/accountPayableService');

const getAllAccountsPayable = async (req, res) => {
    try {
        const result = await AccountPayableService.getAllAccountsPayable();
        return res.status(200).json({ data: result });
    } catch (error) {
        console.error('[API] Error GET /api/accounts-payable:', error);
        return res.status(500).json({ error: error.message });
    }
};

const registerPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { monto_pagado } = req.body;
        // Hardcodeamos usuario_id como se hizo en las otras llamadas
        const usuario_id = "7ab3d65c-eecc-4f0b-98a1-2c53efce620e";
        
        if (!monto_pagado || isNaN(monto_pagado) || Number(monto_pagado) <= 0) {
            return res.status(400).json({ error: 'Monto pagado inválido.' });
        }
        
        const result = await AccountPayableService.registerPayment(id, Number(monto_pagado), usuario_id);
        return res.status(201).json({ data: result });
    } catch (error) {
        console.error(`[API] Error POST /api/accounts-payable/${req.params.id}/pay:`, error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllAccountsPayable,
    registerPayment
};
