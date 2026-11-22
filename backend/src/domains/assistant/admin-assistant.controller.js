const {
  validateAdminChat,
  loadAdminContext,
  getAdminAssistantReply,
} = require('./admin-assistant.service');
const { resolveAIConfig } = require('../../config/ai');

async function adminChat(req, res, next) {
  let input;
  try {
    input = validateAdminChat(req.body);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  try {
    const context = await loadAdminContext();
    let config;
    try {
      config = resolveAIConfig();
    } catch {
      config = { provider: 'invalid', apiKey: '', model: '' };
    }

    const data = await getAdminAssistantReply({
      ...input,
      context,
      ...config,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { adminChat };
