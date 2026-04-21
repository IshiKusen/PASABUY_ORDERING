const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log('--- Checking Gemini API Models ---');
    if (data.models) {
      const activeModel = data.models.find(m => m.name.includes('gemini-1.5-flash'));
      if (activeModel) {
        console.log(`✅ Gemini API is connected (Active Model: ${activeModel.name})`);
      } else {
        console.log('✅ Gemini API is connected (Model listing successful)');
      }
    } else {
      console.log('⚠️ Gemini API connected but no models found. Check your API key permissions.');
    }
    console.log('------------------------------------');
    return true;
  } catch (err) {
    console.warn('⚠️ Gemini Connection check skipped:', err.message);
    return false;
  }
}

module.exports = checkModels;
