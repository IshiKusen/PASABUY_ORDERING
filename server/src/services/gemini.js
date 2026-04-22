const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSystemContext, lookupOrder } = require('./botContext');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates a Taglish bot reply using Gemini AI with live system data.
 */
const generateBotReply = async (userMessage) => {
  try {
    const context = await getSystemContext();

    // Check if user is asking about a specific order
    let orderInfo = '';
    const orderCodeMatch = userMessage.match(/PB-\d{4}-\d{3}/i);
    if (orderCodeMatch) {
      const orders = await lookupOrder(orderCodeMatch[0]);
      if (orders && orders.length > 0) {
        orderInfo = '\n\n[ORDER LOOKUP RESULT]:\n' + orders.map(o =>
          `Order ${o.code}: Status=${o.status}, Total=${o.total}, Date=${o.date}, Customer=${o.customer}, Delivery=${o.deliveryDate}`
        ).join('\n');
      }
    }

    const systemPrompt = `You are the friendly customer service bot for "Japan Haul Pasabuy".

PERSONALITY & STYLE:
- Talk like a REAL HUMAN Filipino (Taglish). Short, direct, and casual.
- Use "po" for respect.
- Be very brief. Max 2 sentences unless listing items.
- If the user says "Hello", "Hi", or just greets you, you MUST use this exact greeting:
  "Hello po! Welcome sa Japan Haul Pasabuy! 😊 Paano po namin kayo matutulungan today para sa aming August 2026 Batch? Feel free po mag-ask about our products or how to order!"

BUSINESS DATA:
- Batch: ${context.batchName}
- Cutoff: ${context.cutoffDate}
- ETA: ${context.etaDelivery}
- Payment: Cash on Delivery (COD)
- Phone: 0945 857 9261

PRODUCTS: ${context.productList}
${orderInfo}

HOW TO ORDER:
Tell them to go to the website: https://pasabuy-ordering.vercel.app/

IMPORTANT:
- Keep it very short.
- Be friendly but direct.
- Always be helpful about Japan products.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Customer message: "${userMessage}"` },
    ]);

    const response = result.response;
    let text = '';
    
    try {
      text = response.text();
    } catch (e) {
      console.warn('Gemini response error (likely blocked or empty):', e.message);
      text = "Hello po! Welcome sa Japan Haul Pasabuy! 😊 Paano po namin kayo matutulungan today? Visit our website: https://pasabuy-ordering.vercel.app/ 🌐";
    }

    // Clean up markdown
    text = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .trim();

    // Ensure the website link is ALWAYS included if it's not already in the greeting
    if (!text.includes('https://pasabuy-ordering.vercel.app/')) {
      text += '\n\nVisit our website: https://pasabuy-ordering.vercel.app/ 🌐';
    }

    return text;

  } catch (err) {
    console.error('Gemini AI error:', err);
    return 'Pasensya na po, may technical issue kami ngayon. 😅 Pwede po kayo mag-text sa 0945 857 9261 para sa tulong. Salamat po!';
  }
};

module.exports = { generateBotReply };
