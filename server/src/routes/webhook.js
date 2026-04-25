const express = require('express');
const crypto = require('crypto');
const { generateBotReply } = require('../services/gemini');
const router = express.Router();

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const APP_SECRET = process.env.FB_APP_SECRET;
const PAGE_ID = process.env.FB_PAGE_ID;

// =============================================
// WEBHOOK VERIFICATION (GET)
// Facebook sends a GET request to verify your webhook URL
// =============================================
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Facebook webhook verified successfully!');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Webhook verification failed. Token mismatch.');
  return res.sendStatus(403);
});

// =============================================
// WEBHOOK EVENTS (POST)
// Facebook sends POST requests when messages/comments arrive
// =============================================
router.post('/', async (req, res) => {
  const body = req.body;
  console.log('📬 Webhook Received Event:', JSON.stringify(body, null, 2));

  // Verify this is a page subscription event
  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Respond 200 immediately to prevent Facebook timeouts
  res.status(200).send('EVENT_RECEIVED');

  // Process each entry
  for (const entry of body.entry) {
    // Handle Messenger messages
    if (entry.messaging) {
      for (const event of entry.messaging) {
        if (event.message && !event.message.is_echo) {
          await handleMessage(event);
        }
      }
    }

    // Handle Page comments
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'feed' && change.value.item === 'comment') {
          await handleComment(change.value);
        }
      }
    }
  }
});

// =============================================
// HANDLE MESSENGER MESSAGES
// =============================================
async function handleMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message.text;

  if (!messageText) {
    console.log('⚠️ Received a non-text message or an empty event.');
    return;
  }

  console.log(`💬 FB Event Received! From: ${senderId} | Msg: "${messageText}"`);

  try {
    console.log('🤖 Starting Gemini AI generation...');
    const reply = await generateBotReply(messageText);
    console.log('✨ Gemini Generated Reply:', reply);

    console.log('📨 Attempting to send message to Facebook Graph API...');
    await callSendAPI(senderId, reply);
    console.log('✅ Message sequence complete.');
  } catch (err) {
    console.error('🔥 Error during handleMessage:', err.message);
    await callSendAPI(senderId, 'Pasensya na po, may error kami ngayon. I-try po ulit mamaya! 🙏');
  }
}

// =============================================
// HANDLE PAGE COMMENTS
// =============================================
async function handleComment(commentData) {
  const commentId = commentData.comment_id;
  const commentMessage = commentData.message;
  const posterId = commentData.from?.id;

  // Don't reply to our own comments (the page itself)
  if (posterId === PAGE_ID) return;
  if (!commentMessage) return;

  console.log(`📝 Comment from ${commentData.from?.name || posterId}: "${commentMessage}"`);

  try {
    // Generate AI reply
    const reply = await generateBotReply(commentMessage);

    console.log(`🤖 Comment reply: "${reply.substring(0, 100)}..."`);

    // Reply to the comment
    await replyToComment(commentId, reply);
  } catch (err) {
    console.error('Handle comment error:', err);
  }
}

// =============================================
// FACEBOOK GRAPH API HELPERS
// =============================================

/**
 * Send a message or typing indicator via Messenger
 */
async function callSendAPI(recipientId, messageText, action) {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const body = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE'
  };

  if (action) {
    body.sender_action = action;
  } else {
    body.message = { text: messageText };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Facebook API Error Response:', JSON.stringify(data));
    } else {
      console.log('🎈 Facebook accepted the message successfully!');
    }
  } catch (err) {
    console.error('💥 Fetch Error in callSendAPI:', err.message);
  }
}

/**
 * Reply to a comment on a Facebook post
 */
async function replyToComment(commentId, message) {
  const url = `https://graph.facebook.com/v21.0/${commentId}/comments`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Facebook Comment API error:', JSON.stringify(errData));
    }
  } catch (err) {
    console.error('Comment reply fetch error:', err);
  }
}

module.exports = router;
