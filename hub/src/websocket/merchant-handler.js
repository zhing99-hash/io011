/**
 * WebSocket Merchant Handler
 * Handles WebSocket connections for merchants
 */

const db = require('../database/postgres');

module.exports = function(connection, merchantId) {
  const socket = connection.socket;
  
  // Update merchant online status
  db.query(
    "UPDATE merchants SET status = 'online', last_seen = NOW() WHERE id = $1",
    [merchantId]
  ).catch(err => console.error('Failed to update merchant status:', err));
  
  // Handle incoming messages
  socket.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.action) {
        case 'heartbeat':
          // Update last seen
          await db.query(
            "UPDATE merchants SET last_seen = NOW() WHERE id = $1",
            [merchantId]
          );
          socket.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
          break;
          
        case 'search_request':
          // Handle search requests from shoppers (forwarded)
          socket.send(JSON.stringify({ 
            type: 'search_received',
            requestId: data.requestId 
          }));
          break;
          
        default:
          socket.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown action' 
          }));
      }
    } catch (error) {
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });
  
  // Handle disconnect
  socket.on('close', async () => {
    // Update merchant offline status
    await db.query(
      "UPDATE merchants SET status = 'offline', last_seen = NOW() WHERE id = $1",
      [merchantId]
    ).catch(err => console.error('Failed to update merchant status:', err));
  });
  
  // Send welcome message
  socket.send(JSON.stringify({
    type: 'connected',
    merchantId: merchantId,
    timestamp: Date.now()
  }));
};